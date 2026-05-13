@echo off
setlocal EnableExtensions
title ShanbeiWordTest dev :6294

set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
set "APP=%REPO%\app"

if not exist "%APP%\package.json" (
  echo ERROR: Cannot find: %APP%\package.json
  echo Put this .bat in the repo root next to the "app" folder.
  pause
  exit /b 1
)

cd /d "%APP%"
if errorlevel 1 (
  echo ERROR: Cannot cd to: %APP%
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Running npm install...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check Node.js and network.
    pause
    exit /b 1
  )
)

echo Starting Vite on port 6294 and opening browser...
call npm run dev -- --open --host --port 6294
pause
