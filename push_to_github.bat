@echo off
cd /d "%~dp0"
git add .
git commit -m "Автоматическая выгрузка данных %date% %time%"
git push origin master
pause