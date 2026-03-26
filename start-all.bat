@echo off
TITLE IntaliCamAI - Full Stack Launcher
COLOR 0A

echo =====================================
echo   IntaliCamAI - Full Stack Launcher
echo =====================================
echo.

REM ---- 1. Check MongoDB ----
echo [1/4] Checking MongoDB...
sc query MongoDB >nul 2>&1
if %errorlevel% == 0 (
  net start MongoDB >nul 2>&1
  echo   MongoDB service started.
) else (
  REM Try mongod.exe from common paths
  set "MONGOD="
  for %%P in (
    "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    "C:\mongodb\bin\mongod.exe"
  ) do (
    if exist %%P set "MONGOD=%%P"
  )

  if defined MONGOD (
    echo   Starting mongod from %MONGOD%...
    if not exist "%~dp0data\db" mkdir "%~dp0data\db"
    start "MongoDB" cmd /k "%MONGOD% --dbpath %~dp0data\db"
    timeout /t 3 >nul
  ) else (
    echo.
    echo   [WARNING] MongoDB not found!
    echo   Please install MongoDB Community from:
    echo   https://www.mongodb.com/try/download/community
    echo   Then run this script again.
    echo.
    pause
    exit /b 1
  )
)

REM ---- 2. Node.js Backend (port 5000) ----
echo.
echo [2/4] Starting Node.js Backend on port 5000...
start "IntaliCam Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 3 >nul

REM ---- 3. Streaming Backend (port 8000) ----
echo.
echo [3/4] Starting Streaming Backend on port 8000...
start "IntaliCam Streaming" cmd /k "cd /d "%~dp0streaming-backend" && python app.py"
timeout /t 3 >nul

REM ---- 4. Frontend (port 5173) ----
echo.
echo [4/4] Starting Frontend on port 5173...
start "IntaliCam Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 5 >nul

echo.
echo =====================================
echo   All services started!
echo.
echo   Frontend   : http://localhost:5173
echo   Backend API: http://localhost:5000/api
echo   Streaming  : http://localhost:8000
echo =====================================
echo.
echo   Opening browser...
start "" http://localhost:5173
pause
