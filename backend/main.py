"""
PixCut FastAPI Background Removal Daemon.
Runs locally as a secure, loopback-only service for the desktop application.
"""

import sys
import os

# Handle PyInstaller windowed mode (where sys.stdout / sys.stderr are None)
class SafeLogStream:
    def write(self, text):
        pass
    def flush(self):
        pass
    def isatty(self):
        return False

if sys.stdout is None:
    sys.stdout = SafeLogStream()
if sys.stderr is None:
    sys.stderr = SafeLogStream()

import argparse
import logging
from typing import Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
try:
    from backend.engine import engine
    from backend.hybrid_face_enhancer import hybrid_engine as enhancer
    from backend.core.responses import api_success, api_error, image_binary_response
except ImportError:
    from engine import engine
    from hybrid_face_enhancer import hybrid_engine as enhancer
    from core.responses import api_success, api_error, image_binary_response

# Wire engine hardware synchronization with CodeFormer
if hasattr(engine, "register_enhancer_callback") and hasattr(enhancer, "set_hardware_preference"):
    engine.register_enhancer_callback(enhancer.set_hardware_preference)

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
    logger.info("PixCut AI Daemon initialized and starting async pre-warming.")
    engine.start_background_prewarm()
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
    expose_headers=[
        "X-Inference-Time-Ms",
        "X-Image-Width",
        "X-Image-Height",
        "X-Device",
        "X-Model",
        "X-Scale",
        "X-Engine",
    ],
)

@app.get("/health")
async def health_check():
    """Simple ping endpoint for the desktop wrapper to monitor daemon readiness."""
    return {
        "status": "healthy",
        "service": "PixCut AI Engine",
        "engine_status": engine.current_provider,
        "device_preference": engine.device_preference,
        "model_preference": engine.model_preference,
        "enhancer_available": enhancer.is_available(),
        "is_ready": engine.is_ready(),
        "is_warming": engine.is_warming_up
    }

@app.get("/api/hardware-info")
async def get_hardware_info():
    """Returns detected hardware acceleration (CUDA/CPU) and system resource specs."""
    try:
        return api_success(engine.get_hardware_info())
    except Exception as e:
        logger.error(f"Error fetching hardware info: {e}")
        return api_error(str(e))

@app.get("/api/models")
async def get_models():
    """Returns all supported AI models with their download and active statuses."""
    try:
        return api_success(engine.get_available_models())
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return api_error(str(e))

@app.post("/api/models/download")
async def download_model(req: DownloadModelRequest):
    """Downloads model weights on-demand from internet into local cache."""
    try:
        return api_success(engine.download_model(req.model_id))
    except Exception as e:
        logger.error(f"Error downloading model: {e}")
        return api_error(str(e))

@app.get("/api/settings")
async def get_settings():
    """Returns persistent device & model preferences, active provider, and specs."""
    try:
        return api_success(engine.get_settings())
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        return api_error(str(e))

@app.post("/api/settings")
async def update_settings(req: SettingsUpdateRequest):
    """Updates device preference and/or AI model preference permanently and reloads engine."""
    try:
        updated = engine.set_configuration(
            device_preference=req.device_preference,
            model_preference=req.model_preference,
            wait_sec=3.0
        )
        return api_success(updated)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return api_error(str(e))

@app.post("/api/settings/device")
async def set_device_preference(req: DevicePreferenceRequest):
    """Sets permanent device preference ('auto', 'gpu', 'cpu') and reloads AI engine session."""
    try:
        return api_success(engine.set_configuration(device_preference=req.preference, wait_sec=3.0))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating device preference: {e}")
        return api_error(str(e))

@app.post("/api/settings/model")
async def set_model_preference(req: ModelPreferenceRequest):
    """Sets permanent AI model ('u2net', 'u2netp', 'silueta', 'isnet-general-use') and reloads session."""
    try:
        return api_success(engine.set_model_preference(req.model))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating model preference: {e}")
        return api_error(str(e))

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
    if file.content_type and not file.content_type.startswith("image/"):
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

        return image_binary_response(
            image_bytes=output_png,
            filename=f"removed_bg_{file.filename}.png",
            metadata=meta
        )
    except Exception as e:
        logger.exception(f"Failed processing image: {e}")
        return api_error(f"Image processing error: {str(e)}", status_code=500, detail=str(e))

@app.get("/api/enhancer/status")
async def get_enhancer_status():
    """Returns availability and supported models for Real-ESRGAN face/image enhancer."""
    try:
        return api_success(enhancer.get_status())
    except Exception as e:
        logger.error(f"Error fetching enhancer status: {e}")
        return api_error(str(e))

@app.post("/api/enhance")
async def enhance_image(
    file: UploadFile = File(..., description="Image file to upscale and enhance"),
    scale: int = Query(1, ge=1, le=4, description="Enhancement factor: 1 for 1x detail enhancement, 2, 3, 4 for upscaling"),
    model: str = Query("realesr-animevideov3", description="Enhancement model (Ultra-Fast Preview V3)"),
    tile: int = Query(0, ge=0, description="Tile size (0 for auto)")
):
    """
    Real-ESRGAN Face & Image Enhancement endpoint.
    Upscales image resolution, restores blurry facial features, and returns high-res PNG.
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Provided file must be an image.")

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        output_png, meta = enhancer.enhance(
            image_bytes=contents,
            scale=scale,
            model_name=model,
            tile_size=tile
        )

        return image_binary_response(
            image_bytes=output_png,
            filename=f"enhanced_{scale}x_{file.filename}.png",
            metadata=meta
        )
    except Exception as e:
        logger.exception(f"Failed enhancing image: {e}")
        return api_error(f"Image enhancement error: {str(e)}", status_code=500, detail=str(e))

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
    try:
        uvicorn.run(app, host=args.host, port=args.port, log_level="info", access_log=False)
    except Exception as e:
        logger.error(f"Uvicorn error: {e}")

if __name__ == "__main__":
    run_daemon()
