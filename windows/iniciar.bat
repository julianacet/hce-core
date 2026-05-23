@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "DIR=%~dp0"
set "CONFIG=%DIR%config.bat"
set "PGSQL=%DIR%pgsql"
set "DATA=%DIR%data"

echo.
echo [HCE Consultorio] Iniciando servicios...
echo.

if not exist "%CONFIG%" (
    echo [ERROR] No se encontro config.bat.
    echo         Ejecuta el instalador para configurar el sistema.
    echo.
    pause
    exit /b 1
)

if not exist "%DATA%\PG_VERSION" (
    echo [ERROR] La base de datos no esta inicializada.
    echo         Ejecuta el instalador nuevamente.
    echo.
    pause
    exit /b 1
)

call "%CONFIG%"

mkdir "%DIR%logs" 2>nul

REM ── PostgreSQL ─────────────────────────────────────────────────────────────────

"%PGSQL%\bin\pg_ctl.exe" status -D "%DATA%" >nul 2>&1
if errorlevel 1 (
    echo [1/2] Iniciando base de datos...
    "%PGSQL%\bin\pg_ctl.exe" start -D "%DATA%" -l "%DIR%logs\postgres.log" -w -t 30
    if errorlevel 1 (
        echo [ERROR] No se pudo iniciar PostgreSQL. Revisa logs\postgres.log
        pause
        exit /b 1
    )
    echo       OK
) else (
    echo [1/2] Base de datos ya en ejecucion.
)

REM ── Backend API ───────────────────────────────────────────────────────────────

tasklist /fi "imagename eq hce-api.exe" 2>nul | find /i "hce-api.exe" >nul
if errorlevel 1 (
    echo [2/2] Iniciando backend API...
    start /b "" "%DIR%hce-api.exe" > "%DIR%logs\api.log" 2>&1
    echo       OK
) else (
    echo [2/2] Backend API ya en ejecucion.
)

echo.
echo Servicios activos. Abre HCE Consultorio desde el acceso directo del escritorio.
echo.
