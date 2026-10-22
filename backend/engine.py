"""
PixCut Core AI Engine: High-performance background removal using rembg & ONNX Runtime.
Auto-detects CPU/GPU (DirectML / CUDAExecutionProvider / CPUExecutionProvider) with persistent user preference.
"""

import io
import os
import json
import time
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pixcut.engine")


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
    """Loads saved settings from disk, defaulting to auto device preference."""
    try:
        path = get_config_path()
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except Exception as e:
        logger.warning(f"Could not load settings file: {e}")
    return {"device_preference": "auto"}


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


class BackgroundRemovalEngine:
    def __init__(self, default_model: str = "u2net"):
        self.default_model = default_model
        self.current_provider: str = "CPUExecutionProvider"
        self.detected_gpu_name: Optional[str] = self._detect_gpu_name()

        # Load permanent user preference (auto, gpu, cpu)
        saved = load_saved_settings()
        self.device_preference: str = saved.get("device_preference", "auto").lower()
        if self.device_preference not in ("auto", "gpu", "cpu"):
            self.device_preference = "auto"

        self.session = None
        self._initialize_session()

    def _detect_gpu_name(self) -> Optional[str]:
        """
        Detects primary GPU model name via Windows WMI/CIM or Linux lspci.
        """
        try:
            import platform, subprocess
            if platform.system() == "Windows":
                cmd = ["powershell", "-NoProfile", "-NonInteractive", "-Command", 
                       "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"]
                out = subprocess.check_output(cmd, timeout=3, text=True, stderr=subprocess.DEVNULL)
                lines = [l.strip() for l in out.strip().splitlines() if l.strip()]
                # Prefer discrete GPUs (NVIDIA, AMD Radeon, Intel Arc) over integrated
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
        """
        Determines candidate ONNX Runtime execution providers based on user preference ('auto', 'gpu', 'cpu').
        DirectML provides out-of-the-box hardware GPU acceleration for NVIDIA, AMD,
        and Intel GPUs on Windows without requiring separate CUDA installations.
        """
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
                # Include CPU as second candidate in case a specific GPU operator is unmapped
                return gpu_providers + ["CPUExecutionProvider"], "GPU (Forced)"
            else:
                logger.warning("GPU preferred, but no GPU provider found in ONNX. Falling back to CPU.")
                return ["CPUExecutionProvider"], "CPU (No GPU found)"
        else:  # "auto"
            if gpu_providers:
                return gpu_providers + ["CPUExecutionProvider"], "Auto-Detect"
            return ["CPUExecutionProvider"], "Auto-Detect (CPU)"

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
        """
        Initializes the rembg ONNX session with hardware acceleration fallback.
        """
        try:
            import rembg
            providers, label = self._get_providers_for_preference(self.device_preference)
            logger.info(f"Initializing rembg session (preference: '{self.device_preference}') with providers: {providers}")

            try:
                self.session = rembg.new_session(self.default_model, providers=providers)
                self.current_provider = self._resolve_active_provider_name()
                logger.info(f"Session initialized successfully. Active Provider: {self.current_provider}")
                # Pre-warm session with a tiny image so first user inference is instant
                try:
                    dummy = Image.new("RGB", (64, 64), (128, 128, 128))
                    rembg.remove(dummy, session=self.session)
                    logger.info("ONNX neural session pre-warmed successfully.")
                except Exception as warm_err:
                    logger.debug(f"Pre-warm non-critical: {warm_err}")
            except Exception as load_err:
                logger.warning(f"Failed to load with preferred providers ({load_err}). Falling back to CPUExecutionProvider.")
                self.session = rembg.new_session(self.default_model, providers=["CPUExecutionProvider"])
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

    def set_device_preference(self, preference: str) -> Dict[str, Any]:
        """
        Sets permanent device preference ('auto', 'gpu', 'cpu'), writes to disk,
        and re-initializes the session with the new provider immediately.
        """
        pref = preference.lower().strip()
        if pref not in ("auto", "gpu", "cpu"):
            raise ValueError(f"Invalid device preference: {preference}. Expected 'auto', 'gpu', or 'cpu'.")

        self.device_preference = pref
        # Persist permanently
        save_settings_to_disk({
            "device_preference": pref,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })
        logger.info(f"Saved permanent device preference '{pref}' to {get_config_path()}")

        # Reload session with new preference
        self._initialize_session()
        return self.get_settings()

    def get_settings(self) -> Dict[str, Any]:
        """
        Returns full settings details including permanent preference,
        detected hardware, and active provider.
        """
        try:
            import onnxruntime as ort
            available = ort.get_available_providers()
        except Exception:
            available = ["CPUExecutionProvider"]

        return {
            "device_preference": self.device_preference,
            "active_provider": self.current_provider,
            "detected_gpu": self.detected_gpu_name,
            "available_providers": available,
            "config_path": get_config_path(),
            "hardware": self.get_hardware_info()
        }

    def get_hardware_info(self) -> Dict[str, Any]:
        """
        Returns hardware and provider diagnostics for desktop UI display.
        """
        import platform
        import psutil

        cpu_count = os.cpu_count() or 1
        ram_info = psutil.virtual_memory()

        return {
            "accelerator": self.current_provider,
            "device_preference": self.device_preference,
            "detected_gpu": self.detected_gpu_name,
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
            "device": self.current_provider
        }

        return result_bytes, metadata


# Global singleton engine instance
engine = BackgroundRemovalEngine()
