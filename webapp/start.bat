@echo off
chcp 65001 >nul
echo ================================
echo   PDF2DOCX Web App
echo   http://localhost:5000
echo   Dang nhap: admin / nguyennhan2004
echo ================================
echo.

cd /d "%~dp0"

REM Kich hoat venv neu co
if exist "..\venv\Scripts\activate.bat" (
    call ..\venv\Scripts\activate.bat
)

python run.py
pause
