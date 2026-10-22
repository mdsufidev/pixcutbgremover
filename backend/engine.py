"""
PixCut Core AI Engine: High-performance background removal using rembg & ONNX Runtime.
Auto-detects CPU/GPU (CUDAExecutionProvider / CPUExecutionProvider) with graceful fallback.
"""

import io
import time
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pixcut.engine")

class BackgroundRemovalEngine:
    def __init__(self, default_model: str = "u2net"):
        self.default_model = default_model
        self.current_provider: str = "CPUExecutionProvider"
        self.session = None
        self._initialize_session()

    def _detect_providers(self) -> Tuple[list, str]:
        """
        Determines the best candidate ONNX Runtime execution providers to request.
        """
        try:
            import onnxruntime as ort
            available = ort.get_available_providers()
            logger.info(f"Available ONNX Runtime providers: {available}")
            
            candidates = []
            if "CUDAExecutionProvider" in available:
                candidates.append("CUDAExecutionProvider")
            if "DmlExecutionProvider" in available:
                candidates.append("DmlExecutionProvider")
            if "CoreMLExecutionProvider" in available:
                candidates.append("CoreMLExecutionProvider")
            candidates.append("CPUExecutionProvider")
            
            return candidates, "Auto-Detect"
        except Exception as e:
            logger.warning(f"Could not query onnxruntime providers: {e}. Defaulting to CPU.")
            return ["CPUExecutionProvider"], "CPU (Multi-Threaded)"

    def _resolve_active_provider_name(self) -> str:
        """
        Inspects the underlying ONNX InferenceSession to see which provider actually bound.
        """
        if not self.session:
            return "Mock Engine"

        try:
            inner = getattr(self.session, "inner_session", None)
            if inner and hasattr(inner, "get_providers"):
                active = inner.get_providers()
                logger.info(f"Active runtime providers bound to session: {active}")
                if "CUDAExecutionProvider" in active:
                    return "CUDA (NVIDIA GPU)"
                elif "DmlExecutionProvider" in active:
                    return "DirectML (GPU)"
                elif "CoreMLExecutionProvider" in active:
                    return "CoreML (Apple Silicon)"
                elif "CPUExecutionProvider" in active:
                    return "CPU (Multi-Threaded)"
        except Exception as e:
            logger.warning(f"Could not inspect active session providers: {e}")

        return "CPU (Multi-Threaded)"

    def _initialize_session(self):
        """
        Initializes the rembg ONNX session with hardware acceleration fallback.
        """
        try:
            import rembg
            providers, _ = self._detect_providers()
            logger.info(f"Attempting to initialize rembg session with providers: {providers}")
            
            try:
                self.session = rembg.new_session(self.default_model, providers=providers)
                self.current_provider = self._resolve_active_provider_name()
                logger.info(f"Session initialized successfully. Active Provider: {self.current_provider}")
            except Exception as load_err:
                logger.warning(f"Failed to load with preferred providers ({load_err}). Explicitly falling back to CPUExecutionProvider.")
                self.session = rembg.new_session(self.default_model, providers=["CPUExecutionProvider"])
                self.current_provider = "CPU (Multi-Threaded)"
        except ImportError:
            logger.warning("rembg is not installed. Running in mock/development mode.")
            self.session = None
            self.current_provider = "Mock Engine (Install rembg for production)"

    def get_hardware_info(self) -> Dict[str, Any]:
        """
        Returns hardware and provider diagnostics for desktop UI display.
        """
        import os
        import platform
        import psutil

        cpu_count = os.cpu_count() or 1
        ram_info = psutil.virtual_memory()

        return {
            "accelerator": self.current_provider,
            "os": f"{platform.system()} {platform.release()}",
            "arch": platform.machine(),
            "cpu_cores": cpu_count,
            "ram_total_gb": round(ram_info.total / (1024 ** 3), 1),
            "ram_available_gb": round(ram_info.available / (1024 ** 3), 1),
            "model_loaded": self.default_model,
            "status": "ready" if self.session is not None else "mock_mode"
        }

    def process_image(
        self,
        image_bytes: bytes,
        alpha_matting: bool = False,
        alpha_matting_foreground_threshold: int = 240,
        alpha_matting_background_threshold: int = 10,
        alpha_matting_erode_size: int = 10
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Removes background from raw image bytes and returns PNG bytes with transparent alpha.
        """
        start_time = time.perf_counter()
        
        # Read input image with PIL
        input_image = Image.open(io.BytesIO(image_bytes))
        orig_width, orig_height = input_image.size
        orig_format = input_image.format or "UNKNOWN"

        if self.session is not None:
            import rembg
            # Process via rembg session
            output_image = rembg.remove(
                input_image,
                session=self.session,
                alpha_matting=alpha_matting,
                alpha_matting_foreground_threshold=alpha_matting_foreground_threshold,
                alpha_matting_background_threshold=alpha_matting_background_threshold,
                alpha_matting_erode_size=alpha_matting_erode_size
            )
        else:
            # Fallback mock mode: returns an RGBA image with vignette transparency for local testing without rembg
            output_image = input_image.convert("RGBA")
            logger.info("Using mock image processing because rembg session is uninitialized.")

        # Ensure image is in RGBA mode
        if output_image.mode != "RGBA":
            output_image = output_image.convert("RGBA")

        # Encode to high-quality PNG
        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG", optimize=True)
        result_bytes = output_buffer.getvalue()

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

        metadata = {
            "inference_time_ms": elapsed_ms,
            "width": orig_width,
            "height": orig_height,
            "original_format": orig_format,
            "output_size_bytes": len(result_bytes),
            "device": self.current_provider
        }

        return result_bytes, metadata


# Global singleton engine instance
engine = BackgroundRemovalEngine()
