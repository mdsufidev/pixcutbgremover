@echo off
title PixCut Desktop Launcher
cd /d "%~dp0"

echo =======================================================
echo          PIXCUT DESKTOP - STANDALONE LAUNCHER
echo =======================================================
echo [1/2] Verifying and building desktop frontend assets...
call npm.cmd run build

echo [2/2] Launching PixCut Desktop Window...
call npm.cmd start

echo [3/3] Application session closed.
exit /b 0
