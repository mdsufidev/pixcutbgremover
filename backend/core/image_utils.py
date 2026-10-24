"""
backend/core/image_utils.py
===========================
Centralized Image Processing Utilities for PixCut AI Backend.
Eliminates duplicate padding, unpadding, channel separation, and buffer conversions.
"""

import io
from typing import Tuple, Optional, Union
import numpy as np
import cv2
from PIL import Image


class ImageProcessor:
    """Consolidated image transformation, padding, and I/O pipeline."""

    @staticmethod
    def bytes_to_cv2(image_bytes: bytes) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Decodes raw bytes into BGR array and extracts alpha channel if present.
        Returns:
            (bgr_image, alpha_channel_or_None)
        """
        np_arr = np.frombuffer(image_bytes, np.uint8)
        decoded = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
        if decoded is None:
            raise ValueError("Invalid or corrupted image buffer.")

        if len(decoded.shape) == 3 and decoded.shape[2] == 4:
            alpha = decoded[:, :, 3]
            bgr = decoded[:, :, :3]
            return bgr, alpha
        return decoded, None

    @staticmethod
    def cv2_to_png_bytes(
        bgr_image: np.ndarray,
        alpha_channel: Optional[np.ndarray] = None,
        compression_level: int = 4
    ) -> bytes:
        """
        Merges optional alpha channel and encodes to high-quality PNG bytes.
        """
        if alpha_channel is not None:
            h, w = bgr_image.shape[:2]
            if alpha_channel.shape[:2] != (h, w):
                alpha_channel = cv2.resize(alpha_channel, (w, h), interpolation=cv2.INTER_LANCZOS4)
            final_img = np.dstack((bgr_image, alpha_channel))
        else:
            final_img = bgr_image

        success, encoded = cv2.imencode(".png", final_img, [cv2.IMWRITE_PNG_COMPRESSION, compression_level])
        if not success:
            raise RuntimeError("Failed to encode image to PNG format.")
        return encoded.tobytes()

    @staticmethod
    def bytes_to_pil(image_bytes: bytes) -> Image.Image:
        """Loads raw bytes directly into a PIL Image."""
        return Image.open(io.BytesIO(image_bytes))

    @staticmethod
    def pil_to_bytes(img: Image.Image, format: str = "PNG") -> bytes:
        """Saves a PIL Image to raw bytes."""
        buf = io.BytesIO()
        img.save(buf, format=format)
        return buf.getvalue()

    @staticmethod
    def apply_modulo_padding(
        image: np.ndarray,
        modulo: int = 16,
        border_type: int = cv2.BORDER_REFLECT_101
    ) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Applies OpenCV reflection padding so both width and height are multiples of modulo.
        Returns:
            (padded_image, (pad_top, pad_bottom, pad_left, pad_right))
        """
        h, w = image.shape[:2]
        pad_w = (modulo - (w % modulo)) % modulo
        pad_h = (modulo - (h % modulo)) % modulo

        pad_left = pad_w // 2
        pad_right = pad_w - pad_left
        pad_top = pad_h // 2
        pad_bottom = pad_h - pad_top

        if pad_w == 0 and pad_h == 0:
            return image, (0, 0, 0, 0)

        padded = cv2.copyMakeBorder(
            image,
            pad_top,
            pad_bottom,
            pad_left,
            pad_right,
            borderType=border_type
        )
        return padded, (pad_top, pad_bottom, pad_left, pad_right)

    @staticmethod
    def unpad_and_crop(
        padded_image: np.ndarray,
        orig_shape: Tuple[int, int],
        padding: Tuple[int, int, int, int],
        engine_scale: int = 1,
        target_scale: int = 1
    ) -> np.ndarray:
        """
        Extracts original canvas coordinates post-inference and resamples to target scale.
        """
        pad_top, _, pad_left, _ = padding
        orig_h, orig_w = orig_shape
        s = engine_scale

        crop_y = pad_top * s
        crop_x = pad_left * s
        scaled_orig_w = orig_w * s
        scaled_orig_h = orig_h * s

        unpadded = padded_image[crop_y : crop_y + scaled_orig_h, crop_x : crop_x + scaled_orig_w]

        # Resample back to target scale if engine processed at a different intermediate scale
        if engine_scale != target_scale:
            final_w = orig_w * (1 if target_scale <= 1 else target_scale)
            final_h = orig_h * (1 if target_scale <= 1 else target_scale)
            unpadded = cv2.resize(unpadded, (final_w, final_h), interpolation=cv2.INTER_LANCZOS4)

        return unpadded
