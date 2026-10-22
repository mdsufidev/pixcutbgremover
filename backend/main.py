"""
PixCut FastAPI Background Removal Daemon.
Runs locally as a secure, loopback-only service for the desktop application.
"""

import sys
import os
import argparse
import logging
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
    expose_headers=["X-Inference-Time-Ms", "X-Image-Width", "X-Image-Height", "X-Device"]
)

@app.get("/health")
async def health_check():
    """Simple ping endpoint for the desktop wrapper to monitor daemon readiness."""
    return {
        "status": "healthy",
        "service": "PixCut AI Engine",
        "engine_status": engine.current_provider,
        "device_preference": engine.device_preference
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

@app.get("/api/settings")
async def get_settings():
    """Returns persistent device preference and active accelerator specs."""
    try:
        settings = engine.get_settings()
        return JSONResponse(content={"success": True, "data": settings})
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
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
            "X-Device": str(meta["device"])
        }

        return Response(content=output_png, media_type="image/png", headers=headers)
    except Exception as e:
        logger.exception(f"Failed processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

@app.post("/api/shutdown")
async def shutdown():
    """Graceful daemon shutdown invoked by the desktop application lifecycle."""
    logger.info("Shutdown request received from desktop shell.")
    # Exit cleanly in next tick
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
