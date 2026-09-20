@echo off
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo Building first...
  call npm run build
)
echo Starting Blocksmith on http://127.0.0.1:5188
start "Blocksmith" /min cmd /c "node scripts\serve-dist.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5188"
echo Server window title: Blocksmith
echo URL: http://127.0.0.1:5188
