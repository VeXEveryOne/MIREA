@echo off
setlocal
cd /d "%~dp0"

".venv\Scripts\python.exe" practice_1\scripts\run_all.py
if errorlevel 1 exit /b %errorlevel%

pushd practice_2
"..\.venv\Scripts\python.exe" -m jupytext --to ipynb scripts\03_Visualization.py --output 03_Visualization.ipynb
if errorlevel 1 exit /b %errorlevel%
"..\.venv\Scripts\python.exe" -m jupyter nbconvert --to notebook --execute --inplace 03_Visualization.ipynb --ExecutePreprocessor.timeout=1200 --ExecutePreprocessor.kernel_name=python3
if errorlevel 1 exit /b %errorlevel%
"..\.venv\Scripts\python.exe" -m jupyter nbconvert --to html 03_Visualization.ipynb --output-dir reports
if errorlevel 1 exit /b %errorlevel%
popd

echo Все ноутбуки выполнены успешно.
pause
