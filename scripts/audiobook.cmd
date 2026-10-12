@echo off
rem Regenerate the audiobook: narration text -> Kokoro TTS -> pages.
rem Usage:  scripts\audiobook.cmd [ch07 ch08 ...] [--voice af_heart] [--speed 0.92]
rem Unchanged chapters are skipped, so this is safe to re-run after any edit.
setlocal
cd /d "%~dp0.."
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1
if "%SOT_TTS_HOME%"=="" set "SOT_TTS_HOME=%LOCALAPPDATA%\sot-tts"
node scripts\narrate.mjs || exit /b 1
"%SOT_TTS_HOME%\venv\Scripts\python.exe" scripts\tts.py %* || exit /b 1
node build.mjs
