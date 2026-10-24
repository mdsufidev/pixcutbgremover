"""
PixCut Core AI Engine: High-performance background removal using rembg & ONNX Runtime.
Optimized for Portable Windows Desktop Applications with Instant (< 1s) Startup.

Features:
- Local portable config.json persistence in app root directory.
- Ultra-fast (0.5ms) Machine Fingerprinting for seamless PC-change detection.
- Non-blocking asynchronous AI model initialization and pre-warming in a background thread.
- Zero-freezing UI: /health and /hardware-info endpoints respond in < 1ms on app launch.
"""

import io
import os
import sys
import json
import time
import uuid
import hashlib
import logging
import platform
import threading
import subprocess
import functools
from typing import Dict, Any, Tuple, Optional, List
from PIL import Image

try:
    from backend.core.hardware import HardwareManager, cleanup_vram_and_system_memory
except ImportError:
    try:
        from core.hardware import HardwareManager, cleanup_vram_and_system_memory
    except ImportError:
        HardwareManager = None
        cleanup_vram_and_system_memory = None

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


# ============================================================================
# 1. PORTABLE ENVIRONMENT & ULTRA-FAST FINGERPRINTING
# ============================================================================

@functools.lru_cache(maxsize=1)
def get_portable_root_dir() -> str:
    """
    Returns the absolute directory containing the portable application.
    Works seamlessly in both raw Python development and PyInstaller standalone .exe.
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    else:
        return os.path.dirname(os.path.abspath(__file__))


@functools.lru_cache(maxsize=1)
def get_config_path() -> str:
    """
    Returns absolute path to persistent config.json.
    Prefers portable app root directory. Falls back to %APPDATA% if app root is read-only.
    """
    portable_dir = get_portable_root_dir()
    portable_config = os.path.join(portable_dir, "config.json")

    # Verify write access in portable root
    try:
        test_file = os.path.join(portable_dir, ".pixcut_write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        if os.path.exists(test_file):
            os.remove(test_file)
        return portable_config
    except Exception:
        # Fallback to APPDATA if running from a protected directory
        appdata = os.environ.get("APPDATA")
        cfg_dir = os.path.join(appdata, "FileWalaTool") if appdata else os.path.join(os.path.expanduser("~"), ".filewalatool")
        os.makedirs(cfg_dir, exist_ok=True)
        return os.path.join(cfg_dir, "config.json")


@functools.lru_cache(maxsize=1)
def get_machine_fingerprint() -> str:
    """
    Generates an ultra-fast (< 1ms) machine hardware fingerprint.
    Combines Hostname, CPU Architecture, and Hardware MAC Address.
    Does NOT invoke slow WMI or PowerShell queries.
    """
    try:
        tokens = [
            platform.node(),          # Hostname
            platform.machine(),       # Architecture (e.g. AMD64)
            platform.processor(),     # Processor string
            str(uuid.getnode()),      # Physical NIC MAC address integer
        ]
        raw_signature = "|".join(tokens)
        return hashlib.sha256(raw_signature.encode("utf-8")).hexdigest()[:16]
    except Exception as e:
        logger.warning(f"Failed to generate full machine fingerprint: {e}")
        return "generic_fallback_machine"


_disk_save_lock = threading.Lock()

def load_saved_settings() -> Tuple[Dict[str, Any], bool]:
    """
    Loads saved settings from disk, checking if the machine fingerprint matches.
    Returns:
        (settings_dict, is_same_machine)
    """
    current_fp = get_machine_fingerprint()
    default_settings = {
        "machine_fingerprint": current_fp,
        "device_preference": "auto",
        "model_preference": "u2net",
        "detected_gpu_name": None,
        "active_provider": "CPUExecutionProvider",
        "last_validated": 0
    }

    path = get_config_path()
    for _ in range(3):
        with _disk_save_lock:
            try:
                if os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f:
                        raw = f.read().strip()
                    if raw:
                        data = json.loads(raw)
                        if isinstance(data, dict):
                            cached_fp = data.get("machine_fingerprint", "")
                            is_same_machine = (cached_fp == current_fp)
                            return data, is_same_machine
            except Exception as e:
                logger.debug(f"Config read attempt warning: {e}")
        time.sleep(0.04)

    return default_settings, False


def save_settings_to_disk(settings: Dict[str, Any]) -> bool:
    """Persists settings to disk atomically so user choices survive app restarts."""
    with _disk_save_lock:
        path = get_config_path()
        for _ in range(3):
            temp_path = None
            try:
                temp_path = f"{path}.tmp_{os.getpid()}_{threading.get_ident()}_{int(time.time() * 1000)}"
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(settings, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())

                os.replace(temp_path, path)
                return True
            except (PermissionError, OSError):
                # Resilient Windows fallback: Direct write if os.replace encounters Access is Denied (WinError 5 / WinError 32)
                try:
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump(settings, f, indent=2)
                        f.flush()
                        os.fsync(f.fileno())
                    return True
                except Exception:
                    time.sleep(0.04)
            except Exception as e:
                logger.warning(f"Could not save settings file: {e}")
                time.sleep(0.04)
            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
        return False


_MODEL_DOWNLOADED_CACHE: Dict[str, Tuple[bool, float]] = {}

def is_model_downloaded(model_id: str) -> bool:
    """Checks whether the requested model .onnx file exists in local cache with 60s memory caching."""
    now = time.time()
    if model_id in _MODEL_DOWNLOADED_CACHE:
        cached_val, cached_time = _MODEL_DOWNLOADED_CACHE[model_id]
        if (now - cached_time) < 60.0:
            return cached_val

    try:
        user_home = os.path.expanduser("~")
        candidate_paths = [
            os.path.join(user_home, ".rembg", "models", model_id, f"{model_id}.onnx"),
            os.path.join(user_home, ".u2net", f"{model_id}.onnx"),
            os.path.join(os.environ.get("U2NET_HOME", ""), f"{model_id}.onnx")
        ]
        for p in candidate_paths:
            if p and os.path.exists(p) and os.path.getsize(p) > 10000:
                _MODEL_DOWNLOADED_CACHE[model_id] = (True, now)
                return True
    except Exception:
        pass

    _MODEL_DOWNLOADED_CACHE[model_id] = (False, now)
    return False


# ============================================================================
# 2. CORE BACKGROUND REMOVAL ENGINE (ASYNC PRE-WARMING & FAST STARTUP)
# ============================================================================

class BackgroundRemovalEngine:
    def __init__(self):
        t0 = time.perf_counter()
        self._lock = threading.Lock()
        self._switch_lock = threading.Lock()
        self._switch_generation: int = 0
        self._ready_event = threading.Event()  # Unblocks when neural session is ready
        self.is_warming_up: bool = False
        self.warmup_error: Optional[str] = None
        self.session = None

        # 1. Fast Configuration Load (< 5ms)
        saved, is_same_machine = load_saved_settings()
        self.device_preference: str = saved.get("device_preference", "auto").lower()
        if self.device_preference not in ("auto", "gpu", "cpu"):
            self.device_preference = "auto"

        self.target_device_preference: str = self.device_preference

        self.model_preference: str = saved.get("model_preference", "u2net").lower()
        valid_model_ids = [m["id"] for m in AVAILABLE_MODELS]
        if self.model_preference not in valid_model_ids:
            self.model_preference = "u2net"

        # Cached hardware profile
        self.detected_gpu_name: Optional[str] = saved.get("detected_gpu_name")
        self.current_provider: str = saved.get("active_provider", "CPUExecutionProvider")
        self.is_switching: bool = False
        self.last_error: Optional[str] = None
        self._enhancer_sync_callback = None
        self.active_hardware_mode: str = "gpu" if any(k in self.current_provider.lower() for k in ["cuda", "gpu", "dml"]) else "cpu"

        needs_hardware_audit = (not is_same_machine) or (self.detected_gpu_name is None)

        if not needs_hardware_audit:
            logger.info(
                f"[Fast Startup] Restored cached hardware profile in {(time.perf_counter() - t0)*1000:.2f}ms: "
                f"GPU={self.detected_gpu_name}, Provider={self.current_provider}"
            )
        else:
            logger.info("[Fast Startup] Machine change or first run detected. Hardware audit scheduled in background.")

        self._needs_hardware_audit = needs_hardware_audit
        self._worker_started = False

    def register_enhancer_callback(self, callback):
        """Registers external AI model sync callback to avoid circular imports."""
        self._enhancer_sync_callback = callback

    def start_background_prewarm(self):
        """Starts asynchronous model initialization and pre-warming."""
        with self._lock:
            if self._worker_started:
                return
            self._worker_started = True
            worker = threading.Thread(
                target=self._background_init_task,
                args=(self._needs_hardware_audit,),
                name="AI-Engine-Prewarmer",
                daemon=True
            )
            worker.start()

    def _start_background_worker(self, needs_audit: bool):
        """Spawns background daemon thread for model loading and pre-warming."""
        with self._lock:
            self._worker_started = True
            worker = threading.Thread(
                target=self._background_init_task,
                args=(needs_audit,),
                name="AI-Engine-Prewarmer",
                daemon=True
            )
            worker.start()

    def _detect_gpu_name(self) -> Optional[str]:
        """Detects primary GPU model name via Windows WMI/CIM or Linux lspci."""
        try:
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
                return ["CPUExecutionProvider"], "CPU (No GPU found)"
        else:  # "auto"
            if gpu_providers:
                return gpu_providers + ["CPUExecutionProvider"], "Auto-Detect"
            return ["CPUExecutionProvider"], "Auto-Detect (CPU)"

    def _resolve_active_provider_name(self, session) -> str:
        """Inspects the active ONNX InferenceSession to see which provider actually bound."""
        if not session:
            return "Mock Engine"

        try:
            inner = getattr(session, "inner_session", None)
            if inner and hasattr(inner, "get_providers"):
                active = inner.get_providers()
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

    def _background_init_task(self, needs_audit: bool):
        """Asynchronous worker: runs hardware audit and pre-warms AI model without blocking."""
        self.is_warming_up = True
        logger.info("Background AI engine initialization started.")

        try:
            # 1. Background Hardware Scan if needed
            if needs_audit:
                detected_gpu = self._detect_gpu_name()
                with self._lock:
                    self.detected_gpu_name = detected_gpu

            # 2. Build ONNX Execution Providers
            providers, label = self._get_providers_for_preference(self.device_preference)
            target_model = self.model_preference
            logger.info(f"Initializing rembg session (model: '{target_model}', device: '{self.device_preference}') with providers: {providers}")

            import rembg
            try:
                new_session = rembg.new_session(target_model, providers=providers)
                active_provider_name = self._resolve_active_provider_name(new_session)
            except Exception as load_err:
                logger.warning(f"Failed to load with preferred providers ({load_err}). Falling back to CPUExecutionProvider.")
                new_session = rembg.new_session(target_model, providers=["CPUExecutionProvider"])
                active_provider_name = "CPU (Multi-Threaded)"

            # 3. Asynchronous Pre-Warming (Dummy Pass)
            try:
                dummy = Image.new("RGB", (64, 64), (128, 128, 128))
                rembg.remove(dummy, session=new_session)
                logger.info("ONNX neural session pre-warmed successfully in background.")
            except Exception as warm_err:
                logger.debug(f"Pre-warm non-critical: {warm_err}")

            with self._lock:
                self.session = new_session
                self.current_provider = active_provider_name
                self.is_warming_up = False
                self._ready_event.set()

            # Save updated hardware cache to config.json
            save_settings_to_disk({
                "machine_fingerprint": get_machine_fingerprint(),
                "device_preference": self.device_preference,
                "model_preference": self.model_preference,
                "detected_gpu_name": self.detected_gpu_name,
                "active_provider": self.current_provider,
                "last_validated": int(time.time()),
                "is_ready": True
            })

            logger.info(f"AI Engine fully initialized and ready. Active Provider: {self.current_provider}")

        except ImportError as e:
            logger.exception(f"rembg is not installed: {e}. Running in mock mode.")
            with self._lock:
                self.session = None
                self.current_provider = "Mock Engine"
                self.is_warming_up = False
                self._ready_event.set()
        except Exception as e:
            logger.exception(f"Unexpected error during async session initialization: {e}")
            with self._lock:
                self.session = None
                self.current_provider = f"Init Error ({type(e).__name__})"
                self.warmup_error = str(e)
                self.is_warming_up = False
                self._ready_event.set()

    def wait_until_ready(self, timeout_sec: float = 15.0) -> bool:
        """Blocks only when an actual inference request arrives while still warming up."""
        if not self._worker_started:
            self.start_background_prewarm()
        return self._ready_event.wait(timeout=timeout_sec)

    def is_ready(self) -> bool:
        """Instant non-blocking check whether neural session is ready."""
        return self._ready_event.is_set()

    def set_configuration(
        self,
        device_preference: Optional[str] = None,
        model_preference: Optional[str] = None,
        wait_sec: float = 0.0
    ) -> Dict[str, Any]:
        """
        Sets permanent device preference and/or AI model preference, persists to disk,
        and reloads the AI engine session asynchronously in background.
        
        Optimizations:
        1. Smart Hardware Caching (0 ms bypass): If requested device is ACTUALLY running on active hardware,
           skips redundant model unloads and returns instantly.
        2. Worker Serialization: Uses generation sequencing and switch lock to prevent race conditions.
        3. Deep Memory Cleanup: Releases old sessions and purges VRAM/RAM before initializing new hardware.
        4. Resilient Fallback: Automatically falls back to multi-threaded CPU upon GPU failure with explicit diagnostics.
        """
        valid_models = [m["id"] for m in AVAILABLE_MODELS]
        target_device = self.device_preference
        target_model = self.model_preference
        device_changed = False
        model_changed = False

        if device_preference is not None:
            dev = device_preference.lower().strip()
            if dev not in ("auto", "gpu", "cpu"):
                raise ValueError(f"Invalid device preference: {device_preference}. Expected 'auto', 'gpu', or 'cpu'.")
            target_device = dev
            if HardwareManager is not None:
                is_same = HardwareManager.is_same_hardware_provider(
                    requested_preference=dev,
                    current_active_provider=self.current_provider,
                    current_preference=self.device_preference,
                    detected_gpu_name=self.detected_gpu_name
                )
                device_changed = not is_same
            else:
                device_changed = (dev != self.device_preference)

        if model_preference is not None:
            mod = model_preference.lower().strip()
            if mod not in valid_models:
                raise ValueError(f"Invalid model preference: {model_preference}. Valid: {valid_models}")
            target_model = mod
            model_changed = (mod != self.model_preference)

        reinit_needed = device_changed or model_changed

        # 1. SMART HARDWARE CACHING (0 ms Instant Return)
        if not reinit_needed:
            logger.info(
                f"[Hardware Caching] Exact match detected (Device: '{target_device}', "
                f"Provider: '{self.current_provider}', Model: '{target_model}'). "
                f"Bypassing redundant model reload (0 ms)."
            )
            self.device_preference = target_device
            self.target_device_preference = target_device
            threading.Thread(
                target=save_settings_to_disk,
                args=({
                    "machine_fingerprint": get_machine_fingerprint(),
                    "device_preference": self.device_preference,
                    "model_preference": self.model_preference,
                    "detected_gpu_name": self.detected_gpu_name,
                    "active_provider": self.current_provider,
                    "last_validated": int(time.time()),
                    "is_ready": self._ready_event.is_set()
                },),
                daemon=True
            ).start()
            settings = self.get_settings()
            settings["switched"] = False
            settings["cached"] = True
            settings["status"] = "ready"
            return settings

        # 2. ACTUAL SWITCH REQUIRED: Prepare Sequenced Transition
        with self._lock:
            self._switch_generation += 1
            current_gen = self._switch_generation
            self.target_device_preference = target_device
            self.device_preference = target_device
            self.model_preference = target_model
            self.is_switching = True
            self.is_warming_up = True
            self.last_error = None
            self._ready_event.clear()

        # 3. Spawn serialized background worker thread for non-blocking switch
        worker = threading.Thread(
            target=self._async_switch_worker,
            args=(target_device, target_model, current_gen),
            name=f"AI-Hardware-Switcher-gen{current_gen}",
            daemon=True
        )
        worker.start()

        # 4. Optional synchronous wait for fast local switches (prevents UI polling races)
        if wait_sec > 0:
            self._ready_event.wait(timeout=wait_sec)

        settings = self.get_settings()
        settings["switched"] = True
        settings["status"] = "ready" if self._ready_event.is_set() else "switching"
        settings["is_warming"] = self.is_warming_up
        settings["generation"] = current_gen
        return settings

    def _async_switch_worker(self, target_device: str, target_model: str, generation: int):
        """
        Serialized background worker that executes memory cleanup, provider instantiation,
        pre-warming pass, and error fallback without blocking the main event loop.
        Discards obsolete tasks if superseded by a newer switch request.
        """
        logger.info(f"[Hardware Switcher] Initiating transition [gen {generation}] -> Device: '{target_device}', Model: '{target_model}'")
        start_time = time.perf_counter()

        with self._switch_lock:
            # Check if superseded before starting heavy initialization
            if generation != self._switch_generation:
                logger.info(f"[Hardware Switcher] Generation {generation} superseded by {self._switch_generation}. Aborting.")
                return

            try:
                # 1. PROPER VRAM & SYSTEM RAM CLEANUP
                logger.info("[Hardware Switcher] Releasing previous session and purging VRAM/RAM...")
                with self._lock:
                    old_session = self.session
                    self.session = None
                del old_session

                if cleanup_vram_and_system_memory is not None:
                    cleanup_vram_and_system_memory()

                # Synchronize Hybrid Face Enhancer hardware preference if callback registered
                if self._enhancer_sync_callback is not None:
                    try:
                        self._enhancer_sync_callback(target_device)
                    except Exception as enh_sync_err:
                        logger.debug(f"Enhancer sync notice: {enh_sync_err}")

                # 2. RESOLVE ONNX PROVIDERS
                if HardwareManager is not None:
                    providers, _ = HardwareManager.resolve_providers_for_preference(target_device)
                else:
                    providers, _ = self._get_providers_for_preference(target_device)

                import rembg
                active_name = "CPU (Multi-Threaded)"

                # 3. INSTANTIATE NEW SESSION WITH RESILIENT CPU FALLBACK
                try:
                    new_session = rembg.new_session(target_model, providers=providers)
                    if HardwareManager is not None:
                        active_name = HardwareManager.resolve_active_provider_name(new_session, self.detected_gpu_name)
                    else:
                        active_name = self._resolve_active_provider_name(new_session)
                    logger.info(f"[Hardware Switcher] Successfully loaded preferred providers. Active: {active_name}")
                except Exception as primary_err:
                    logger.warning(
                        f"[Hardware Switcher] Primary provider load failed ({primary_err}). "
                        f"Falling back to CPUExecutionProvider..."
                    )
                    if cleanup_vram_and_system_memory is not None:
                        cleanup_vram_and_system_memory()
                    new_session = rembg.new_session(target_model, providers=["CPUExecutionProvider"])
                    active_name = "CPU (Multi-Threaded - Fallback)"
                    self.last_error = f"GPU load error: {primary_err}. Fallback to CPU active."

                # Check if superseded before pre-warm
                if generation != self._switch_generation:
                    logger.info(f"[Hardware Switcher] Generation {generation} superseded before pre-warm. Aborting.")
                    return

                # 4. PRE-WARMING DUMMY PASS
                try:
                    dummy = Image.new("RGB", (64, 64), (128, 128, 128))
                    rembg.remove(dummy, session=new_session)
                    logger.info("[Hardware Switcher] New neural session pre-warmed successfully.")
                except Exception as warm_err:
                    logger.debug(f"Pre-warm non-critical: {warm_err}")

                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)
                logger.info(f"[Hardware Switcher] Switch [gen {generation}] complete in {elapsed_ms}ms. Active: {active_name}")

                # Final commit (only if this worker is still the latest generation)
                with self._lock:
                    if generation != self._switch_generation:
                        logger.info(f"[Hardware Switcher] Discarding commit for generation {generation} (latest is {self._switch_generation}).")
                        return

                    self.session = new_session
                    self.current_provider = active_name
                    self.active_hardware_mode = "gpu" if any(k in active_name.lower() for k in ["cuda", "gpu", "dml"]) else "cpu"
                    self.is_warming_up = False
                    self.is_switching = False
                    self._ready_event.set()

                # Persist confirmed state to config.json
                save_settings_to_disk({
                    "machine_fingerprint": get_machine_fingerprint(),
                    "device_preference": self.device_preference,
                    "model_preference": self.model_preference,
                    "detected_gpu_name": self.detected_gpu_name,
                    "active_provider": self.current_provider,
                    "last_validated": int(time.time()),
                    "is_ready": True
                })

            except Exception as fatal_err:
                logger.exception(f"[Hardware Switcher] Critical error during session switch: {fatal_err}")
                with self._lock:
                    if generation == self._switch_generation:
                        self.is_warming_up = False
                        self.is_switching = False
                        self.last_error = str(fatal_err)
                        self.current_provider = f"Switch Error ({type(fatal_err).__name__})"
                        self._ready_event.set()

    def set_device_preference(self, preference: str) -> Dict[str, Any]:
        """Convenience method for backwards compatibility."""
        return self.set_configuration(device_preference=preference)

    def set_model_preference(self, model_id: str) -> Dict[str, Any]:
        """Sets active AI model preference and reloads session."""
        return self.set_configuration(model_preference=model_id)

    def download_model(self, model_id: str) -> Dict[str, Any]:
        """Downloads the specified model from internet into local cache ahead of time."""
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
        if HardwareManager is not None:
            available = HardwareManager.get_available_onnx_providers()
        else:
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
        """Instant non-blocking hardware diagnostics for desktop UI display."""
        import psutil

        cpu_count = os.cpu_count() or 1
        ram_info = psutil.virtual_memory()
        is_sw = getattr(self, "is_switching", False)

        return {
            "accelerator": self.current_provider,
            "device_preference": self.device_preference,
            "target_preference": getattr(self, "target_device_preference", self.device_preference),
            "active_hardware_mode": getattr(self, "active_hardware_mode", "cpu"),
            "model_loaded": self.model_preference,
            "detected_gpu": self.detected_gpu_name,
            "os": f"{platform.system()} {platform.release()}",
            "arch": platform.machine(),
            "cpu_cores": cpu_count,
            "ram_total_gb": round(ram_info.total / (1024 ** 3), 1),
            "ram_available_gb": round(ram_info.available / (1024 ** 3), 1),
            "status": "switching" if is_sw else ("ready" if self._ready_event.is_set() else "warming_up"),
            "is_ready": self._ready_event.is_set(),
            "is_warming": self.is_warming_up,
            "is_switching": is_sw,
            "last_error": getattr(self, "last_error", None)
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

        # Wait safely for pre-warming if the user dropped an image immediately upon launch
        if not self._ready_event.is_set():
            logger.info("Inference request received while engine is warming up. Waiting for session...")
            self.wait_until_ready(timeout_sec=15.0)

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
            logger.info("Using fallback image processing because rembg session is uninitialized.")

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
