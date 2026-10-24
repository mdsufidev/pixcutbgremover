import os
import sys
import json
import urllib.request

TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mdsufidev/pixcutbgremover"
RELEASE_ID = 420475866

RELEASE_TITLE = "FileWala TOOL v1.0.0 — Offline AI Background Remover & Face Enhancer"

RELEASE_BODY = """# FileWala TOOL v1.0.0 🚀

**FileWala TOOL** is a high-performance, 100% offline desktop application for AI background removal, super-resolution upscaling, and hybrid face restoration.

Everything runs locally on your workstation with **zero cloud uploads**, ensuring absolute privacy and sub-second processing.

---

### ✨ What's New in v1.0.0

- 🎯 **High-Precision AI Background Removal**:
  - Neural segmentation powered by U2Net & U2NetP models.
  - Sub-pixel edge refinement on complex details (hair, fur, semitransparent edges).
  - Magic Erase brush for targeted interactive cutouts.

- 💎 **Hybrid AI Picture & Face Restoration**:
  - Combined **Real-ESRGAN** (for background and clothing textures) + **CodeFormer** (for crystal-clear eyes, face, and hair restoration).
  - Scale-aware 2x and 4x super-resolution upscaling.
  - Natural face blending without over-smoothing or altering facial identity.

- ⚡ **GPU DirectML & CPU Multi-Threaded Engine**:
  - Out-of-the-box hardware acceleration for NVIDIA GeForce/RTX, AMD Radeon, and Intel GPUs via DirectML.
  - Multi-threaded CPU fallback with automatic detection.
  - **0 ms Smart Hardware Caching**: Seamless, instant switching between GPU and CPU without reloading models or UI lag.

- 🎨 **Photoshop-Inspired Desktop Studio UI**:
  - Clean, distraction-free neutral aesthetic (`#F4F5F7` workspace).
  - Interactive **Before vs After split slider** for instant visual comparisons.
  - Full canvas zoom, pan, freeform cropping, and aspect-ratio presets.

- 🔒 **100% Offline & Privacy-First**:
  - Bundled standalone FastAPI daemon.
  - Zero telemetry, zero external API calls, and zero subscription fees.

---

### 📦 Downloads & Installation

| Asset | Description |
| :--- | :--- |
| **`FileWala-TOOL-Setup-1.0.0.exe`** | **Recommended**: Full Windows standalone installer with automatic desktop shortcut |
| **`PixCutBg-Desktop-Portable-x64.zip`** | Portable zip edition (extract and run without installation) |

---

### 💻 System Requirements
- **OS**: Windows 10 / 11 (64-bit)
- **RAM**: 8 GB minimum (16 GB recommended)
- **GPU (Optional)**: DirectX 12 compatible GPU (NVIDIA GTX/RTX, AMD Radeon) or multi-core CPU.
"""

def update_release_metadata():
    print(f"Updating release metadata for {REPO} (ID: {RELEASE_ID})...")
    url = f"https://api.github.com/repos/{REPO}/releases/{RELEASE_ID}"
    payload = json.dumps({
        "name": RELEASE_TITLE,
        "body": RELEASE_BODY
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, method="PATCH", headers={
        "Authorization": f"token {TOKEN}",
        "User-Agent": "FileWalaTool-Deploy",
        "Content-Type": "application/json"
    })

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"SUCCESS: Release updated! Title: '{data.get('name')}'")
            return True
    except Exception as e:
        print(f"Error updating release metadata: {e}")
        return False

def get_existing_assets():
    url = f"https://api.github.com/repos/{REPO}/releases/{RELEASE_ID}/assets"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {TOKEN}",
        "User-Agent": "FileWalaTool-Deploy"
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def delete_asset(asset_id, asset_name):
    print(f"Deleting outdated asset {asset_name} (ID: {asset_id})...")
    del_url = f"https://api.github.com/repos/{REPO}/releases/assets/{asset_id}"
    req = urllib.request.Request(del_url, method="DELETE", headers={
        "Authorization": f"token {TOKEN}",
        "User-Agent": "FileWalaTool-Deploy"
    })
    with urllib.request.urlopen(req) as resp:
        print(f"Deleted old asset: {asset_name}")

def upload_file(file_path):
    asset_name = os.path.basename(file_path)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False

    file_size = os.path.getsize(file_path)
    print(f"Uploading {asset_name} ({round(file_size/1024/1024, 2)} MB)...")

    # Check and delete existing asset if present
    assets = get_existing_assets()
    for a in assets:
        if a["name"] == asset_name:
            delete_asset(a["id"], asset_name)

    upload_url = f"https://uploads.github.com/repos/{REPO}/releases/{RELEASE_ID}/assets?name={asset_name}"
    
    with open(file_path, "rb") as f:
        data = f.read()

    req = urllib.request.Request(upload_url, data=data, method="POST", headers={
        "Authorization": f"token {TOKEN}",
        "User-Agent": "FileWalaTool-Deploy",
        "Content-Type": "application/octet-stream",
        "Content-Length": str(file_size)
    })

    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print(f"SUCCESS: Uploaded {asset_name} -> URL: {res.get('browser_download_url')}")
            return True
    except Exception as e:
        print(f"Upload error for {asset_name}: {e}")
        return False

if __name__ == "__main__":
    # 1. Update Title & Body
    update_release_metadata()

    # 2. Upload latest binaries
    files_to_upload = [
        os.path.join("release", "latest.yml"),
        os.path.join("release", "FileWala-TOOL-Setup-1.0.0.exe.blockmap"),
        os.path.join("release", "FileWala-TOOL-Setup-1.0.0.exe"),
    ]

    for fp in files_to_upload:
        upload_file(fp)

    print("\nAll Release updates finished successfully!")
