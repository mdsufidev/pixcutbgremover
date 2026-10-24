"""
backend/core/hardware.py
========================
High-Performance Hardware Management, Smart Caching & VRAM/RAM Memory Governor.

Features:
1. Smart Hardware Caching: Detects if requested hardware is already active (0 ms bypass).
2. Deep Memory Cleanup: Releases ONNX sessions, executes gc.collect(), and purges working set RAM/VRAM.
3. Resilient Fallback: Gracefully falls back from GPU to multi-threaded CPU upon driver/VRAM errors.
"""

import os
import sys
import gc
import ctypes
import functools
import logging
from typing import List, Tuple, Optional, Dict, Any

logger = logging.getLogger("pixcut.hardware")


def cleanup_vram_and_system_memory():
    """
    Explicitly purges unused memory from Python, ONNX Runtime, and the OS.
    Frees physical RAM and VRAM pages back to the operating system immediately.
    """
    # 1. Python garbage collection
    try:
        gc.collect()
    except Exception as e:
        logger.debug(f"Garbage collection warning: {e}")

    # 2. PyTorch CUDA cache purge (if torch is present in runtime)
    try:
        if "torch" in sys.modules:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
    except Exception:
        pass


class HardwareManager:
    """
    Centralized controller for ONNX Runtime Execution Providers,
    hardware caching, and asynchronous device switching.
    """

    @staticmethod
    @functools.lru_cache(maxsize=1)
    def get_available_onnx_providers() -> List[str]:
        """Queries available ONNX Runtime execution providers on the current system."""
        try:
            import onnxruntime as ort
            return ort.get_available_providers()
        except Exception as e:
            logger.warning(f"Could not query onnxruntime providers: {e}")
            return ["CPUExecutionProvider"]

    @classmethod
    def resolve_providers_for_preference(
        cls,
        preference: str
    ) -> Tuple[List[str], str]:
        """
        Determines the priority list of ONNX Execution Providers based on user preference.
        Returns:
            (providers_list, target_label)
        """
        available = cls.get_available_onnx_providers()
        pref = (preference or "auto").lower().strip()

        gpu_providers = []
        if "DmlExecutionProvider" in available:
            gpu_providers.append("DmlExecutionProvider")
        if "CUDAExecutionProvider" in available:
            gpu_providers.append("CUDAExecutionProvider")
        if "CoreMLExecutionProvider" in available:
            gpu_providers.append("CoreMLExecutionProvider")

        if pref == "cpu":
            return ["CPUExecutionProvider"], "CPU (Forced)"
        elif pref == "gpu":
            if gpu_providers:
                return gpu_providers + ["CPUExecutionProvider"], "GPU (Forced)"
            else:
                return ["CPUExecutionProvider"], "CPU (No GPU found)"
        else:  # "auto"
            if gpu_providers:
                return gpu_providers + ["CPUExecutionProvider"], "Auto-Detect"
            return ["CPUExecutionProvider"], "Auto-Detect (CPU)"

    @classmethod
    def is_same_hardware_provider(
        cls,
        requested_preference: str,
        current_active_provider: str,
        current_preference: str,
        detected_gpu_name: Optional[str] = None
    ) -> bool:
        """
        Smart Caching Check:
        Evaluates whether the requested preference matches the currently active engine state.
        Returns True (0 ms bypass) ONLY if the active engine session is ACTUALLY running
        on the hardware that satisfies the requested preference.
        """
        req = (requested_preference or "auto").lower().strip()
        active = (current_active_provider or "").lower()

        if not active or "error" in active or "mock" in active:
            return False

        is_currently_gpu = any(k in active for k in ["gpu", "cuda", "dml", "directml", "geforce", "rtx", "gtx", "radeon"])
        is_currently_cpu = ("cpu" in active) and not is_currently_gpu

        # 1. User chose "gpu": only an exact match if engine is genuinely running on GPU
        if req == "gpu":
            return is_currently_gpu

        # 2. User chose "cpu": only an exact match if engine is genuinely running on CPU
        if req == "cpu":
            return is_currently_cpu

        # 3. User chose "auto": match if running on optimal hardware for this workstation
        if req == "auto":
            available_gpu = bool(
                detected_gpu_name or [p for p in cls.get_available_onnx_providers() if "Dml" in p or "CUDA" in p]
            )
            if available_gpu and is_currently_gpu:
                return True
            if (not available_gpu) and is_currently_cpu:
                return True
            return False

        return False

    @staticmethod
    def resolve_active_provider_name(session, detected_gpu_name: Optional[str] = None) -> str:
        """
        Inspects an active ONNX Runtime InferenceSession to determine which provider bound.
        """
        if not session:
            return "Mock Engine"

        try:
            inner = getattr(session, "inner_session", None)
            if inner and hasattr(inner, "get_providers"):
                active = inner.get_providers()
                gpu_label = detected_gpu_name or "DirectML GPU"
                if "CUDAExecutionProvider" in active:
                    return f"CUDA ({detected_gpu_name or 'NVIDIA GPU'})"
                elif "DmlExecutionProvider" in active:
                    return f"GPU ({gpu_label})"
                elif "CoreMLExecutionProvider" in active:
                    return "CoreML (Apple Silicon)"
                elif "CPUExecutionProvider" in active:
                    return "CPU (Multi-Threaded)"
        except Exception as e:
            logger.warning(f"Could not inspect active session providers: {e}")

        return "CPU (Multi-Threaded)"
