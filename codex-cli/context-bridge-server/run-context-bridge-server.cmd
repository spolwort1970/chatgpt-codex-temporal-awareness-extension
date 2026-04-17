@echo off
setlocal
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0run-context-bridge-server.ps1"
