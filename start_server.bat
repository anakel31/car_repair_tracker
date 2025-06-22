@echo off
cd /d "%~dp0"
echo Запуск сервера...
start "" cmd /k "node server.js"