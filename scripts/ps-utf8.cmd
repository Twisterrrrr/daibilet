@echo off
setlocal
chcp 65001 >nul

if "%~1"=="" (
  powershell.exe -NoLogo -NoExit -ExecutionPolicy Bypass -Command ". '%~dp0use-utf8.ps1'"
) else (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ". '%~dp0use-utf8.ps1'; %*"
)
