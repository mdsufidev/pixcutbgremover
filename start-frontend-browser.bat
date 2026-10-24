@echo off
title FileWala TOOL - Frontend Dev Server (:5173)
cd /d "%~dp0"
echo =======================================================
echo    Starting Frontend React Dev Server (Vite :5173)...
echo =======================================================
call npm.cmd run dev
pause
