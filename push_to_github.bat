@echo off
cd /d "%~dp0"
git add .
git commit -m "automatic upload %date% %time%"
git push origin master
pause