@echo off
title PixCut Desktop - Standalone Windows EXE Builder
cd /d "%~dp0"

echo ========================================================
echo        PIXCUT DESKTOP - STANDALONE EXE BUILDER
echo ========================================================
echo.
echo Step 1: Building Python AI Engine Daemon (PyInstaller)...
python -m PyInstaller backend/build_daemon.spec --noconfirm --distpath resources/backend-dist

echo.
echo Step 2: Compiling React Frontend and Electron Shell...
call npm.cmd run build

echo.
echo Step 3: Packaging Standalone Windows .exe (electron-builder)...
call npm.cmd run pack:win

echo.
echo ========================================================
echo [SUCCESS] Your standalone Windows .exe is ready in:
echo           d:\My All Projects\PixCut bgremover\release\
echo ========================================================
pause
