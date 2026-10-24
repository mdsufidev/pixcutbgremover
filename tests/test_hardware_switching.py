"""
tests/test_hardware_switching.py
================================
Automated test suite verifying the CPU/GPU switching lifecycle, smart caching,
concurrency serialization, and inference verification in FileWala TOOL.
"""

import os
import sys
import time
import io
import unittest
from PIL import Image

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.engine import BackgroundRemovalEngine, load_saved_settings, save_settings_to_disk
from backend.core.hardware import HardwareManager


class TestHardwareSwitching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = BackgroundRemovalEngine()
        cls.engine.start_background_prewarm()
        cls.engine.wait_until_ready(timeout_sec=10.0)

    def test_01_cpu_to_gpu_switch(self):
        """Test 1: Start in CPU mode, switch to GPU, verify stability across status refresh cycles."""
        # 1. Ensure CPU is active first
        res_cpu = self.engine.set_configuration(device_preference="cpu", wait_sec=4.0)
        self.assertIn("cpu", res_cpu["active_provider"].lower())

        # 2. Switch to GPU
        res_gpu = self.engine.set_configuration(device_preference="gpu", wait_sec=4.0)
        self.assertEqual(res_gpu["device_preference"], "gpu")
        self.assertIn("gpu", res_gpu["active_provider"].lower())

        # 3. Simulate multiple status refresh polling cycles
        for _ in range(5):
            info = self.engine.get_hardware_info()
            self.assertEqual(info["device_preference"], "gpu")
            self.assertIn("gpu", info["accelerator"].lower())
            self.assertFalse(info["is_switching"])
            self.assertEqual(info["status"], "ready")

    def test_02_gpu_to_cpu_switch(self):
        """Test 2: Switch from GPU mode to CPU mode, verify CPU remains selected and active."""
        # Switch to CPU
        res_cpu = self.engine.set_configuration(device_preference="cpu", wait_sec=4.0)
        self.assertEqual(res_cpu["device_preference"], "cpu")
        self.assertIn("cpu", res_cpu["active_provider"].lower())

        # Verify polling stability
        for _ in range(5):
            info = self.engine.get_hardware_info()
            self.assertEqual(info["device_preference"], "cpu")
            self.assertIn("cpu", info["accelerator"].lower())
            self.assertFalse(info["is_switching"])

    def test_03_smart_hardware_caching(self):
        """Test 3: Smart caching returns 0 ms bypass when requested device is already active."""
        # Engine is currently on CPU
        res = self.engine.set_configuration(device_preference="cpu", wait_sec=1.0)
        self.assertTrue(res.get("cached", False))
        self.assertFalse(res.get("switched", True))

        # Switch to GPU
        res_gpu = self.engine.set_configuration(device_preference="gpu", wait_sec=4.0)
        self.assertTrue(res_gpu.get("switched", True))

        # Request GPU again -> must return cached bypass
        res_gpu_cached = self.engine.set_configuration(device_preference="gpu", wait_sec=1.0)
        self.assertTrue(res_gpu_cached.get("cached", False))
        self.assertFalse(res_gpu_cached.get("switched", True))

    def test_04_rapid_switching_serialization(self):
        """Test 4: Issue rapid requests GPU -> CPU without waiting; verify serialization policy."""
        # Rapidly request GPU then immediately CPU
        self.engine.set_configuration(device_preference="gpu", wait_sec=0.0)
        res_final = self.engine.set_configuration(device_preference="cpu", wait_sec=4.0)

        # Final state must adhere to the latest request (CPU)
        self.assertEqual(self.engine.device_preference, "cpu")
        self.assertIn("cpu", self.engine.current_provider.lower())
        self.assertFalse(self.engine.is_switching)

    def test_05_hardware_manager_exact_match_logic(self):
        """Test 5: Verify HardwareManager.is_same_hardware_provider does not falsely bypass mismatched session."""
        # If requested is GPU, but current active is CPU -> must return False
        is_same = HardwareManager.is_same_hardware_provider(
            requested_preference="gpu",
            current_active_provider="CPU (Multi-Threaded)",
            current_preference="gpu",
            detected_gpu_name="NVIDIA GeForce GTX 1650"
        )
        self.assertFalse(is_same, "Should NOT claim same hardware when session is on CPU!")

        # If requested is GPU and current active is DirectML GPU -> must return True
        is_same_gpu = HardwareManager.is_same_hardware_provider(
            requested_preference="gpu",
            current_active_provider="GPU (DirectML)",
            current_preference="gpu",
            detected_gpu_name="NVIDIA GeForce GTX 1650"
        )
        self.assertTrue(is_same_gpu, "Should correctly identify active GPU session.")

    def test_06_persistence_across_instances(self):
        """Test 6: Verify device preference is restored when a new engine is instantiated."""
        # Set to GPU
        res = self.engine.set_configuration(device_preference="gpu", wait_sec=4.0)
        self.assertEqual(res["device_preference"], "gpu")
        time.sleep(0.15)

        # Create new engine instance simulating app restart
        new_engine = BackgroundRemovalEngine()
        self.assertEqual(new_engine.device_preference, "gpu")

    def test_07_inference_verification(self):
        """Test 7: Confirm actual image processing inference succeeds on the selected hardware."""
        # Switch to GPU
        self.engine.set_configuration(device_preference="gpu", wait_sec=4.0)

        dummy = Image.new("RGBA", (100, 100), (255, 0, 0, 255))
        buf = io.BytesIO()
        dummy.save(buf, format="PNG")

        out_bytes, meta = self.engine.process_image(buf.getvalue())
        self.assertGreater(len(out_bytes), 0)
        self.assertIn("inference_time_ms", meta)
        self.assertEqual(meta["width"], 100)
        self.assertEqual(meta["height"], 100)


if __name__ == "__main__":
    unittest.main()
