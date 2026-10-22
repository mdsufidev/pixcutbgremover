"""
PixCut Core AI Engine: High-performance background removal using rembg & ONNX Runtime.
Supports customizable Execution Providers (GPU/CPU) and selectable AI Models (u2net, u2netp, silueta, isnet).
Heavy model weights are downloaded on demand from internet and cached locally in ~/.rembg/models.
"""

import io
import os
import json
import time
import logging
from typing import Dict, Any, Tuple, Optional, List
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pixcut.engine")

AVAILABLE_MODELS = [
    {
        "id": "u2net",
        "name": "U2Net (Standard Quality)",
        "tag": "GPU Recommended",
        "description": "Full-precision neural network for clean edges & portrait hair details.",
        "size_mb": 176.0,
        "recommended_device": "gpu"
    },
    {
        "id": "u2netp",
        "name": "U2NetP (Ultra-Fast CPU)",
        "tag": "CPU Recommended",
        "description": "Lightweight model (4.5 MB). 5x faster on CPU with minimal memory usage.",
        "size_mb": 4.5,
        "recommended_device": "cpu"
    },
    {
        "id": "silueta",
        "name": "Silueta (Compact)",
        "tag": "Balanced",
        "description": "Compact 43 MB edge-aware model. Fast inference on both CPU and GPU.",
        "size_mb": 43.0,
        "recommended_device": "both"
    },
    {
        "id": "isnet-general-use",
        "name": "IS-Net (Ultra Precision)",
        "tag": "Precision",
        "description": "Dichotomous Image Segmentation model for complex backgrounds and sharp outlines.",
        "size_mb": 174.0,
        "recommended_device": "gpu"
    }
]


def get_config_path() -> str:
    """Returns absolute path to persistent settings.json."""
    appdata = os.environ.get("APPDATA")
    if appdata:
        cfg_dir = os.path.join(appdata, "PixCutBg")
    else:
        cfg_dir = os.path.join(os.path.expanduser("~"), ".pixcut")
    os.makedirs(cfg_dir, exist_ok=True)
    return os.path.join(cfg_dir, "settings.json")


def load_saved_settings() -> Dict[str, Any]:
    """Loads saved settings from disk, defaulting to auto device and u2net model."""
    try:
        path = get_config_path()
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except Exception as e:
        logger.warning(f"Could not load settings file: {e}")
    return {"device_preference": "auto", "model_preference": "u2net"}


def save_settings_to_disk(settings: Dict[str, Any]) -> bool:
    """Persists settings to disk so user choices survive app restarts."""
    try:
        path = get_config_path()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        logger.warning(f"Could not save settings file: {e}")
        return False


def is_model_downloaded(model_id: str) -> bool:
    """Checks whether the requested model .onnx file exists in local cache."""
    try:
        user_home = os.path.expanduser("~")
        candidate_paths = [
            os.path.join(user_home, ".rembg", "models", model_id, f"{model_id}.onnx"),
            os.path.join(user_home, ".u2net", f"{model_id}.onnx"),
            os.path.join(os.environ.get("U2NET_HOME", ""), f"{model_id}.onnx")
        ]
        for p in candidate_paths:
            if p and os.path.exists(p) and os.path.getsize(p) > 10000:
                return True
    except Exception:
        pass
    return False


class BackgroundRemovalEngine:
    def __init__(self):
        self.current_provider: str = "CPUExecutionProvider"
        self.detected_gpu_name: Optional[str] = self._detect_gpu_name()

        # Load permanent user preferences
        saved = load_saved_settings()
        self.device_preference: str = saved.get("device_preference", "auto").lower()
        if self.device_preference not in ("auto", "gpu", "cpu"):
            self.device_preference = "auto"

        self.model_preference: str = saved.get("model_preference", "u2net").lower()
        valid_model_ids = [m["id"] for m in AVAILABLE_MODELS]
        if self.model_preference not in valid_model_ids:
            self.model_preference = "u2net"

        # If user explicitly opted for CPU and hasn't set model_preference, prefer u2netp
        if self.device_preference == "cpu" and "model_preference" not in saved:
            self.model_preference = "u2netp"

        self.session = None
        self._initialize_session()

    def _detect_gpu_name(self) -> Optional[str]:
        """Detects primary GPU model name via Windows WMI/CIM or Linux lspci."""
        try:
            import platform, subprocess
            if platform.system() == "Windows":
                cmd = ["powershell", "-NoProfile", "-NonInteractive", "-Command", 
                       "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"]
                out = subprocess.check_output(cmd, timeout=3, text=True, stderr=subprocess.DEVNULL)
                lines = [l.strip() for l in out.strip().splitlines() if l.strip()]
                for l in lines:
                    if any(k in l.lower() for k in ["nvidia", "geforce", "rtx", "gtx"]):
                        return l
                for l in lines:
                    if any(k in l.lower() for k in ["radeon", "arc"]):
                        return l
                if lines:
                    return lines[0]
            elif platform.system() == "Linux":
                out = subprocess.check_output(["lspci"], timeout=3, text=True, stderr=subprocess.DEVNULL)
                for line in out.splitlines():
                    if "VGA" in line or "3D" in line:
                        return line.split(":")[-1].strip()
        except Exception:
            pass
        return None

    def _get_providers_for_preference(self, preference: str) -> Tuple[list, str]:
        """Calculates candidate ONNX Runtime execution providers based on preference."""
        try:
            import onnxruntime as ort
            available = ort.get_available_providers()
            logger.info(f"Available ONNX Runtime providers: {available}")
        except Exception as e:
            logger.warning(f"Could not query onnxruntime providers: {e}. Defaulting to CPU.")
            available = ["CPUExecutionProvider"]

        gpu_providers = []
        if "DmlExecutionProvider" in available:
            gpu_providers.append("DmlExecutionProvider")
        if "CUDAExecutionProvider" in available:
            gpu_providers.append("CUDAExecutionProvider")
        if "CoreMLExecutionProvider" in available:
            gpu_providers.append("CoreMLExecutionProvider")

        if preference == "cpu":
            return ["CPUExecutionProvider"], "CPU (Forced)"
        elif preference == "gpu":
            if gpu_providers:
                return gpu_providers + ["CPUExecutionProvider"], "GPU (Forced)"
            else:
                logger.warning("GPU preferred, but no GPU provider found in ONNX. Falling back to CPU.")
                return ["CPUExecutionProvider"], "CPU (No GPU found)"
        else:  # "auto"
            if gpu_providers:
                return gpu_providers + ["CPUExecutionProvider"], "Auto-Detect"
            return ["CPUExecutionProvider"], "Auto-Detect (CPU)"

    def _resolve_active_provider_name(self) -> str:
        """Inspects the active ONNX InferenceSession to see which provider actually bound."""
        if not self.session:
            return "Mock Engine"

        try:
            inner = getattr(self.session, "inner_session", None)
            if inner and hasattr(inner, "get_providers"):
                active = inner.get_providers()
                logger.info(f"Active runtime providers bound to session: {active}")
                gpu_name = self.detected_gpu_name or self._detect_gpu_name()
                if "CUDAExecutionProvider" in active:
                    return f"CUDA ({gpu_name})" if gpu_name else "CUDA (NVIDIA GPU)"
                elif "DmlExecutionProvider" in active:
                    return f"GPU ({gpu_name})" if gpu_name else "GPU (DirectML)"
                elif "CoreMLExecutionProvider" in active:
                    return "CoreML (Apple Silicon)"
                elif "CPUExecutionProvider" in active:
                    return "CPU (Multi-Threaded)"
        except Exception as e:
            logger.warning(f"Could not inspect active session providers: {e}")

        return "CPU (Multi-Threaded)"

    def _initialize_session(self):
        """Initializes rembg session using selected model and execution providers."""
        try:
            import rembg
            providers, label = self._get_providers_for_preference(self.device_preference)
            target_model = self.model_preference
            logger.info(f"Initializing rembg session (model: '{target_model}', device: '{self.device_preference}') with providers: {providers}")

            try:
                # rembg downloads the model from internet on demand if not present in cache
                self.session = rembg.new_session(target_model, providers=providers)
                self.current_provider = self._resolve_active_provider_name()
                logger.info(f"Session initialized successfully. Model: {target_model}, Provider: {self.current_provider}")
                
                # Pre-warm session with a tiny dummy image
                try:
                    dummy = Image.new("RGB", (64, 64), (128, 128, 128))
                    rembg.remove(dummy, session=self.session)
                    logger.info("ONNX neural session pre-warmed successfully.")
                except Exception as warm_err:
                    logger.debug(f"Pre-warm non-critical: {warm_err}")
            except Exception as load_err:
                logger.warning(f"Failed to load with preferred providers ({load_err}). Falling back to CPUExecutionProvider.")
                self.session = rembg.new_session(target_model, providers=["CPUExecutionProvider"])
                self.current_provider = "CPU (Multi-Threaded)"
                try:
                    dummy = Image.new("RGB", (64, 64), (128, 128, 128))
                    rembg.remove(dummy, session=self.session)
                except Exception:
                    pass
        except ImportError as e:
            logger.exception(f"rembg is not installed or import error: {e}. Running in mock/development mode.")
            self.session = None
            self.current_provider = "Mock Engine (Install rembg for production)"
        except Exception as e:
            logger.exception(f"Unexpected error during session initialization: {e}")
            self.session = None
            self.current_provider = f"Init Error ({type(e).__name__})"

    def set_configuration(
        self,
        device_preference: Optional[str] = None,
        model_preference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sets permanent device preference and/or AI model preference, persists to disk,
        and reloads the AI engine session immediately.
        """
        valid_models = [m["id"] for m in AVAILABLE_MODELS]
        reinit_needed = False

        if device_preference is not None:
            dev = device_preference.lower().strip()
            if dev not in ("auto", "gpu", "cpu"):
                raise ValueError(f"Invalid device preference: {device_preference}. Expected 'auto', 'gpu', or 'cpu'.")
            if dev != self.device_preference:
                self.device_preference = dev
                reinit_needed = True

        if model_preference is not None:
            mod = model_preference.lower().strip()
            if mod not in valid_models:
                raise ValueError(f"Invalid model preference: {model_preference}. Valid: {valid_models}")
            if mod != self.model_preference:
                self.model_preference = mod
                reinit_needed = True

        # Save to disk permanently
        save_settings_to_disk({
            "device_preference": self.device_preference,
            "model_preference": self.model_preference,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })
        logger.info(f"Saved permanent settings (device='{self.device_preference}', model='{self.model_preference}') to {get_config_path()}")

        if reinit_needed:
            self._initialize_session()

        return self.get_settings()

    def set_device_preference(self, preference: str) -> Dict[str, Any]:
        """Convenience method for backwards compatibility."""
        return self.set_configuration(device_preference=preference)

    def set_model_preference(self, model_id: str) -> Dict[str, Any]:
        """Sets active AI model preference and reloads session."""
        return self.set_configuration(model_preference=model_id)

    def download_model(self, model_id: str) -> Dict[str, Any]:
        """
        Downloads the specified model from internet into local cache ahead of time.
        """
        valid_models = [m["id"] for m in AVAILABLE_MODELS]
        if model_id not in valid_models:
            raise ValueError(f"Unknown model: {model_id}")

        import rembg.sessions as s
        session_class_map = {
            "u2net": s.U2netSession,
            "u2netp": s.U2netpSession,
            "silueta": s.SiluetaSession,
            "isnet-general-use": getattr(s, "DisSessionGeneralUse", s.U2netSession)
        }

        cls = session_class_map.get(model_id, s.U2netSession)
        path = cls.download_models()
        return {
            "model_id": model_id,
            "downloaded": True,
            "path": path,
            "size_bytes": os.path.getsize(path) if os.path.exists(path) else 0
        }

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Returns the list of available models with local cache/download status."""
        models_info = []
        for m in AVAILABLE_MODELS:
            is_downloaded = is_model_downloaded(m["id"])
            models_info.append({
                **m,
                "is_downloaded": is_downloaded,
                "is_active": m["id"] == self.model_preference
            })
        return models_info

    def get_settings(self) -> Dict[str, Any]:
        """Returns complete settings details including device, model, hardware, and models list."""
        try:
            import onnxruntime as ort
            available = ort.get_available_providers()
        except Exception:
            available = ["CPUExecutionProvider"]

        return {
            "device_preference": self.device_preference,
            "model_preference": self.model_preference,
            "active_model": self.model_preference,
            "active_provider": self.current_provider,
            "detected_gpu": self.detected_gpu_name,
            "available_providers": available,
            "available_models": self.get_available_models(),
            "config_path": get_config_path(),
            "hardware": self.get_hardware_info()
        }

    def get_hardware_info(self) -> Dict[str, Any]:
        """Returns hardware and provider diagnostics for desktop UI display."""
        import platform
        import psutil

        cpu_count = os.cpu_count() or 1
        ram_info = psutil.virtual_memory()

        return {
            "accelerator": self.current_provider,
            "device_preference": self.device_preference,
            "model_loaded": self.model_preference,
            "detected_gpu": self.detected_gpu_name,
            "os": f"{platform.system()} {platform.release()}",
            "arch": platform.machine(),
            "cpu_cores": cpu_count,
            "ram_total_gb": round(ram_info.total / (1024 ** 3), 1),
            "ram_available_gb": round(ram_info.available / (1024 ** 3), 1),
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
        """Removes background from raw image bytes and returns PNG bytes with transparent alpha."""
        start_time = time.perf_counter()

        input_image = Image.open(io.BytesIO(image_bytes))
        orig_width, orig_height = input_image.size
        orig_format = input_image.format or "UNKNOWN"

        if self.session is not None:
            import rembg
            output_image = rembg.remove(
                input_image,
                session=self.session,
                alpha_matting=alpha_matting,
                alpha_matting_foreground_threshold=alpha_matting_foreground_threshold,
                alpha_matting_background_threshold=alpha_matting_background_threshold,
                alpha_matting_erode_size=alpha_matting_erode_size
            )
        else:
            output_image = input_image.convert("RGBA")
            logger.info("Using mock image processing because rembg session is uninitialized.")

        if output_image.mode != "RGBA":
            output_image = output_image.convert("RGBA")

        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG", compress_level=1)
        result_bytes = output_buffer.getvalue()

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

        metadata = {
            "inference_time_ms": elapsed_ms,
            "width": orig_width,
            "height": orig_height,
            "original_format": orig_format,
            "output_size_bytes": len(result_bytes),
            "device": self.current_provider,
            "model": self.model_preference
        }

        return result_bytes, metadata


# Global singleton engine instance
engine = BackgroundRemovalEngine()
