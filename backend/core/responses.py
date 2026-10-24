"""
backend/core/responses.py
=========================
FastAPI Response Formatters for PixCut AI Engine.
Eliminates repeated try/except blocks, manual header setting, and JSON wrapping.
"""

from typing import Any, Dict, Optional
from fastapi import Response
from fastapi.responses import JSONResponse


def api_success(
    data: Any = None,
    message: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Returns standardized JSON success payload: {"success": True, "data": ...}."""
    payload: Dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    if extra:
        payload.update(extra)
    return JSONResponse(content=payload)


def api_error(
    message: str,
    status_code: int = 500,
    detail: Optional[str] = None
) -> JSONResponse:
    """Returns standardized JSON error payload: {"success": False, "error": ...}."""
    payload: Dict[str, Any] = {
        "success": False,
        "error": message,
    }
    if detail:
        payload["detail"] = detail
    return JSONResponse(status_code=status_code, content=payload)


def image_binary_response(
    image_bytes: bytes,
    filename: str,
    metadata: Dict[str, Any]
) -> Response:
    """
    Returns high-resolution PNG bytes with standardized diagnostic X-* headers.
    Ensures zero sync drift between Frontend and Backend.
    """
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "X-Inference-Time-Ms": str(metadata.get("inference_time_ms", 0)),
        "X-Image-Width": str(metadata.get("width", 0)),
        "X-Image-Height": str(metadata.get("height", 0)),
        "X-Device": str(metadata.get("device", "GPU" if "GPU" in str(metadata.get("engine", "")) else "CPU")),
        "X-Model": str(metadata.get("model", "")),
        "X-Scale": str(metadata.get("scale", 1)),
        "X-Engine": str(metadata.get("engine", "PixCut AI Engine")),
    }
    return Response(content=image_bytes, media_type="image/png", headers=headers)
