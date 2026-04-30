@echo off
setlocal
chcp 65001 >nul 2>&1

set "DIR=%~dp0"
set "PGSQL=%DIR%pgsql"
set "DATA=%DIR%data"

echo.
echo [HCE Consultorio] Deteniendo servicios...
echo.

REM ── Detener servidor web ──────────────────────────────────────────────────────

tasklist /fi "imagename eq hce-web.exe" 2>nul | find /i "hce-web.exe" >nul
if not errorlevel 1 (
    taskkill /f /im hce-web.exe >nul 2>&1
    echo [OK] Servidor web detenido.
) else (
    echo [--] Servidor web no estaba en ejecucion.
)

REM ── Detener backend API ───────────────────────────────────────────────────────

tasklist /fi "imagename eq hce-api.exe" 2>nul | find /i "hce-api.exe" >nul
if not errorlevel 1 (
    taskkill /f /im hce-api.exe >nul 2>&1
    echo [OK] Backend API detenido.
) else (
    echo [--] Backend API no estaba en ejecucion.
)

REM ── Detener PostgreSQL ────────────────────────────────────────────────────────

if exist "%DATA%\postmaster.pid" (
    "%PGSQL%\bin\pg_ctl.exe" stop -D "%DATA%" -m fast >nul 2>&1
    echo [OK] Base de datos detenida.
) else (
    echo [--] Base de datos no estaba en ejecucion.
)

echo.
echo Todos los servicios detenidos.
echo.
