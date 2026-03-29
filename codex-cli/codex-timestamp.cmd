@echo off
powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0codex-timestamp.ps1" %*
