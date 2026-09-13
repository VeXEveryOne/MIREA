@echo off
setlocal
cd /d "%~dp0"

".venv\Scripts\python.exe" practice_1\scripts\run_all.py
if errorlevel 1 exit /b %errorlevel%

".venv\Scripts\python.exe" practice_2\scripts\build_notebook.py
if errorlevel 1 exit /b %errorlevel%

echo Все ноутбуки выполнены успешно.
pause
