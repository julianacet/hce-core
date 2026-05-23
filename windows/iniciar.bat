@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

net session >nul 2>&1
if errorlevel 1 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

set "DIR=%~dp0"
set "CONFIG=%DIR%config.bat"
set "PGSQL=%DIR%pgsql"
set "DATA=%DIR%data"

echo.
echo [HCE Consultorio] Iniciando servicios...
echo.

REM ── Verificar configuracion ────────────────────────────────────────────────────

if not exist "%CONFIG%" (
    echo [ERROR] No se encontro config.bat.
    echo         Ejecuta primera_vez.bat para configurar el sistema.
    echo.
    pause
    exit /b 1
)

if not exist "%DATA%\PG_VERSION" (
    echo [ERROR] La base de datos no esta inicializada.
    echo         Ejecuta primera_vez.bat primero.
    echo.
    pause
    exit /b 1
)

call "%CONFIG%"

mkdir "%DIR%logs" 2>nul

REM ── PostgreSQL ─────────────────────────────────────────────────────────────────

"%PGSQL%\bin\pg_ctl.exe" status -D "%DATA%" >nul 2>&1
if errorlevel 1 (
    echo [1/3] Iniciando base de datos...
    "%PGSQL%\bin\pg_ctl.exe" start -D "%DATA%" -l "%DIR%logs\postgres.log" -w -t 30
    if errorlevel 1 (
        echo [ERROR] No se pudo iniciar PostgreSQL. Revisa logs\postgres.log
        pause
        exit /b 1
    )
    echo       OK - PostgreSQL en puerto 5433
) else (
    echo [1/3] Base de datos ya en ejecucion.
)

REM ── Backend API ───────────────────────────────────────────────────────────────

tasklist /fi "imagename eq hce-api.exe" 2>nul | find /i "hce-api.exe" >nul
if errorlevel 1 (
    echo [2/3] Iniciando backend API en puerto %PORT%...
    start /b "" "%DIR%hce-api.exe" > "%DIR%logs\api.log" 2>&1
    echo       OK
) else (
    echo [2/3] Backend API ya en ejecucion.
)

REM ── Servidor web ─────────────────────────────────────────────────────────────

tasklist /fi "imagename eq hce-web.exe" 2>nul | find /i "hce-web.exe" >nul
if errorlevel 1 (
    echo [3/3] Abriendo HCE Consultorio...
    start "" "%DIR%hce-web.exe"
    echo       OK
) else (
    echo [3/3] HCE Consultorio ya esta abierto.
)

REM ── Esperar y abrir navegador ─────────────────────────────────────────────────

echo.
echo Esperando que el backend este listo...
set /a INTENTOS=0
:wait_loop
set /a INTENTOS+=1
if %INTENTOS% geq 20 (
    echo [!] El backend no respondio. Revisa logs\api.log
    goto open_browser
)
powershell -nologo -noprofile -command "try { $r = Invoke-WebRequest http://localhost:%PORT%/health -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

:open_browser
echo.
echo ================================================
echo   HCE Consultorio esta en ejecucion
echo ================================================
echo.
echo   La ventana de HCE ya deberia estar abierta.
echo   Si no aparecio, ejecuta iniciar.bat de nuevo.
echo.
echo   Para detener los servicios ejecuta: detener.bat
echo.
