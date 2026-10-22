"""
PixCut FastAPI Background Removal Daemon.
Runs locally as a secure, loopback-only service for the desktop application.
"""

import sys
import os
import argparse
import logging
from typing import Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.engine import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pixcut.server")


class DevicePreferenceRequest(BaseModel):
    preference: str = Field(..., description="Target execution device: 'auto', 'gpu', or 'cpu'")


class ModelPreferenceRequest(BaseModel):
    model: str = Field(..., description="Target AI model: 'u2net', 'u2netp', 'silueta', 'isnet-general-use'")


class SettingsUpdateRequest(BaseModel):
    device_preference: Optional[str] = Field(None, description="Execution device: 'auto', 'gpu', or 'cpu'")
    model_preference: Optional[str] = Field(None, description="AI model: 'u2net', 'u2netp', 'silueta', 'isnet-general-use'")


class DownloadModelRequest(BaseModel):
    model_id: str = Field(..., description="Model ID to download from internet")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PixCut AI Daemon initialized and ready for requests.")
    yield
    logger.info("PixCut AI Daemon shutting down.")

app = FastAPI(
    title="PixCut Desktop AI Engine",
    description="Local background removal daemon powered by rembg / ONNX Runtime",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Electron/Vite frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Inference-Time-Ms", "X-Image-Width", "X-Image-Height", "X-Device", "X-Model"]
)

@app.get("/health")
async def health_check():
    """Simple ping endpoint for the desktop wrapper to monitor daemon readiness."""
    return {
        "status": "healthy",
        "service": "PixCut AI Engine",
        "engine_status": engine.current_provider,
        "device_preference": engine.device_preference,
        "model_preference": engine.model_preference
    }

@app.get("/api/hardware-info")
async def get_hardware_info():
    """Returns detected hardware acceleration (CUDA/CPU) and system resource specs."""
    try:
        info = engine.get_hardware_info()
        return JSONResponse(content={"success": True, "data": info})
    except Exception as e:
        logger.error(f"Error fetching hardware info: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/models")
async def get_models():
    """Returns all supported AI models with their download and active statuses."""
    try:
        models = engine.get_available_models()
        return JSONResponse(content={"success": True, "data": models})
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/models/download")
async def download_model(req: DownloadModelRequest):
    """Downloads model weights on-demand from internet into local cache."""
    try:
        result = engine.download_model(req.model_id)
        return JSONResponse(content={"success": True, "data": result})
    except Exception as e:
        logger.error(f"Error downloading model: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/settings")
async def get_settings():
    """Returns persistent device & model preferences, active provider, and specs."""
    try:
        settings = engine.get_settings()
        return JSONResponse(content={"success": True, "data": settings})
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/settings")
async def update_settings(req: SettingsUpdateRequest):
    """Updates device preference and/or AI model preference permanently and reloads engine."""
    try:
        updated = engine.set_configuration(
            device_preference=req.device_preference,
            model_preference=req.model_preference
        )
        return JSONResponse(content={"success": True, "data": updated})
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/settings/device")
async def set_device_preference(req: DevicePreferenceRequest):
    """Sets permanent device preference ('auto', 'gpu', 'cpu') and reloads AI engine session."""
    try:
        updated = engine.set_device_preference(req.preference)
        return JSONResponse(content={"success": True, "data": updated})
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating device preference: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/settings/model")
async def set_model_preference(req: ModelPreferenceRequest):
    """Sets permanent AI model ('u2net', 'u2netp', 'silueta', 'isnet-general-use') and reloads session."""
    try:
        updated = engine.set_model_preference(req.model)
        return JSONResponse(content={"success": True, "data": updated})
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating model preference: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/api/remove-bg")
async def remove_background(
    file: UploadFile = File(..., description="Image file to remove background from"),
    alpha_matting: bool = Query(False, description="Enable fine-edge alpha matting (slower, better for fur/hair)"),
    fg_threshold: int = Query(240, ge=0, le=255, description="Alpha matting foreground threshold"),
    bg_threshold: int = Query(10, ge=0, le=255, description="Alpha matting background threshold"),
    erode_size: int = Query(10, ge=0, le=50, description="Erode structure size")
):
    """
    Primary endpoint: accepts raw image bytes, removes background locally,
    and returns high-resolution transparent PNG.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Provided file must be an image.")

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        output_png, meta = engine.process_image(
            image_bytes=contents,
            alpha_matting=alpha_matting,
            alpha_matting_foreground_threshold=fg_threshold,
            alpha_matting_background_threshold=bg_threshold,
            alpha_matting_erode_size=erode_size
        )

        headers = {
            "Content-Disposition": f"attachment; filename=removed_bg_{file.filename}.png",
            "X-Inference-Time-Ms": str(meta["inference_time_ms"]),
            "X-Image-Width": str(meta["width"]),
            "X-Image-Height": str(meta["height"]),
            "X-Device": str(meta["device"]),
            "X-Model": str(meta.get("model", engine.model_preference))
        }

        return Response(content=output_png, media_type="image/png", headers=headers)
    except Exception as e:
        logger.exception(f"Failed processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

@app.post("/api/shutdown")
async def shutdown():
    """Graceful daemon shutdown invoked by the desktop application lifecycle."""
    logger.info("Shutdown request received from desktop shell.")
    import threading
    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {"message": "Shutting down"}

def run_daemon():
    parser = argparse.ArgumentParser(description="Run PixCut AI Daemon")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    args = parser.parse_args()

    import uvicorn
    logger.info(f"Starting PixCut daemon on http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")

if __name__ == "__main__":
    run_daemon()
