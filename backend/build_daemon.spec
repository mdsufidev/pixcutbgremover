# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller specification to bundle PixCut FastAPI + rembg + ONNX Runtime daemon
into a single self-contained executable for Windows (.exe) or Linux binary.
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs

block_cipher = None

# Collect all dynamic libraries and assets for onnxruntime and rembg
onnx_binaries = collect_dynamic_libs('onnxruntime')
rembg_datas = collect_data_files('rembg')
fastapi_datas = collect_data_files('fastapi')
uvicorn_datas = collect_data_files('uvicorn')

hidden_imports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespans',
    'uvicorn.lifespans.on',
    'rembg',
    'onnxruntime',
    'PIL',
    'PIL.Image',
    'psutil'
] + collect_submodules('uvicorn') + collect_submodules('fastapi')

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=onnx_binaries,
    datas=rembg_datas + fastapi_datas + uvicorn_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'scipy', 'IPython'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='pixcut-ai-daemon',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False, # Set to True if console debugging is desired
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='pixcut-ai-daemon'
)
