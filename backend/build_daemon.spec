# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller specification to bundle PixCut FastAPI + rembg + ONNX Runtime daemon
into a single self-contained executable for Windows (.exe) or Linux binary.
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs

block_cipher = None

# Collect all dynamic libraries and assets
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
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'rembg',
    'rembg.bg',
    'rembg.session_factory',
    'rembg.sessions',
    'rembg.sessions.base',
    'rembg.sessions.u2net',
    'filetype',
    'onnxruntime',
    'PIL',
    'PIL.Image',
    'psutil',
    'scipy',
    'scipy.ndimage',
    'scipy.spatial',
    'pymatting',
    'skimage',
    'skimage.morphology',
    'skimage.segmentation',
    'pooch',
    'tqdm',
    'jsonschema',
    'unittest',
    'sympy',
    'mpmath',
] + collect_submodules('rembg') + collect_submodules('uvicorn') + collect_submodules('fastapi') + collect_submodules('pymatting')

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=onnx_binaries,
    datas=rembg_datas + fastapi_datas + uvicorn_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='pixcut-ai-daemon',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(os.path.dirname(__file__), '..', 'resources', 'icons', 'icon.ico') if os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'resources', 'icons', 'icon.ico')) else None
)
