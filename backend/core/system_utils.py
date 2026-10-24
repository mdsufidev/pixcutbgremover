"""
backend/core/system_utils.py
============================
Centralized Platform Execution, Process Isolation & Environment Sanitization.
Prevents console popups on Windows and dual-GPU Vulkan layer conflicts.
"""

import os
import sys
import subprocess
from typing import Dict, Any, List, Optional


class SystemPlatform:
    """Manages headless subprocess execution, system environments, and paths."""

    @staticmethod
    def get_headless_subprocess_kwargs() -> Dict[str, Any]:
        """Provides Windows-safe flags to prevent command prompt flashing."""
        kwargs: Dict[str, Any] = {}
        if sys.platform == "win32":
            kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = subprocess.SW_HIDE
            kwargs["startupinfo"] = si
        return kwargs

    @staticmethod
    def get_vulkan_safe_env(extra_env: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """
        Suppresses broken dual-GPU / AMD switchable graphics layers that cause
        vkAllocateMemory -2 failures and silent black screens.
        """
        env = os.environ.copy()
        env["DISABLE_LAYER_AMD_SWITCHABLE_GRAPHICS_1"] = "1"
        env["VK_LOADER_LAYERS_DISABLE"] = "~all~"
        if extra_env:
            env.update(extra_env)
        return env

    @classmethod
    def run_safe_binary(
        cls,
        cmd: List[str],
        timeout: int = 180,
        extra_env: Optional[Dict[str, str]] = None
    ) -> subprocess.CompletedProcess:
        """Executes a native tool headlessly with safe environment and timeout."""
        return subprocess.run(
            cmd,
            env=cls.get_vulkan_safe_env(extra_env),
            capture_output=True,
            text=True,
            timeout=timeout,
            **cls.get_headless_subprocess_kwargs()
        )

    @staticmethod
    def get_portable_root_dir() -> str:
        """Returns the absolute directory containing the portable application."""
        if getattr(sys, "frozen", False):
            return os.path.dirname(os.path.abspath(sys.executable))
        else:
            return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    @classmethod
    def get_config_path(cls) -> str:
        """
        Returns absolute path to persistent config.json.
        Prefers portable app root directory; falls back to %APPDATA% if read-only.
        """
        portable_dir = cls.get_portable_root_dir()
        portable_config = os.path.join(portable_dir, "config.json")

        try:
            test_file = os.path.join(portable_dir, ".pixcut_write_test")
            with open(test_file, "w") as f:
                f.write("ok")
            if os.path.exists(test_file):
                os.remove(test_file)
            return portable_config
        except Exception:
            appdata = os.environ.get("APPDATA")
            cfg_dir = os.path.join(appdata, "FileWalaTool") if appdata else os.path.join(os.path.expanduser("~"), ".filewalatool")
            os.makedirs(cfg_dir, exist_ok=True)
            return os.path.join(cfg_dir, "config.json")
