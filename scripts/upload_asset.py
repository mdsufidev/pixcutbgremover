import os
import sys
import json
import urllib.request

TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mdsufidev/pixcutbgremover"
RELEASE_ID = 420475866

def delete_existing_asset(asset_name: str):
    if not TOKEN:
        print("Notice: GITHUB_TOKEN environment variable is not set. Please set it before uploading.")
        return
    url = f"https://api.github.com/repos/{REPO}/releases/{RELEASE_ID}/assets"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {TOKEN}",
        "User-Agent": "FileWalaTool-Deploy"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            assets = json.loads(resp.read().decode())
            for a in assets:
                if a["name"] == asset_name:
                    del_url = f"https://api.github.com/repos/{REPO}/releases/assets/{a['id']}"
                    del_req = urllib.request.Request(del_url, method="DELETE", headers={
                        "Authorization": f"token {TOKEN}",
                        "User-Agent": "FileWalaTool-Deploy"
                    })
                    with urllib.request.urlopen(del_req) as del_resp:
                        print(f"Deleted old asset {a['id']} ({asset_name})")
    except Exception as e:
        print(f"Notice during asset search/delete: {e}")

def upload_asset(file_path: str, asset_name: str = None):
    if not asset_name:
        asset_name = os.path.basename(file_path)

    if not os.path.exists(file_path):
        print(f"Error: {file_path} does not exist.")
        return False

    file_size = os.path.getsize(file_path)
    print(f"Preparing to upload {asset_name} ({round(file_size/1024/1024, 2)} MB)...")

    delete_existing_asset(asset_name)

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
            result = json.loads(resp.read().decode())
            print(f"SUCCESS: Uploaded {asset_name} -> ID: {result.get('id')}, URL: {result.get('browser_download_url')}")
            return True
    except Exception as e:
        print(f"Upload error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        name = sys.argv[2] if len(sys.argv) > 2 else None
        upload_asset(target, name)
    else:
        print("Usage: python upload_asset.py <file_path> [asset_name]")
