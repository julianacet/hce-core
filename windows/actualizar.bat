@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "DIR=%~dp0"
set "CONFIG=%DIR%config.bat"
set "PGSQL=%DIR%pgsql"
set "DATA=%DIR%data"
set "MIGRATION_DIR=%DIR%db\migration"

echo.
echo ================================================
echo    HCE Consultorio - Aplicando actualizacion
echo ================================================
echo.

REM ── Verificar configuracion ───────────────────────────────────────────────────

if not exist "%CONFIG%" (
    echo [ERROR] No se encontro config.bat
    echo         Este script solo aplica a instalaciones existentes.
    pause
    exit /b 1
)
call "%CONFIG%"

mkdir "%DIR%logs" 2>nul

REM ── Iniciar PostgreSQL si no esta corriendo ───────────────────────────────────

"%PGSQL%\bin\pg_ctl.exe" status -D "%DATA%" >nul 2>&1
if errorlevel 1 (
    echo [1] Iniciando base de datos...
    "%PGSQL%\bin\pg_ctl.exe" start -D "%DATA%" -l "%DIR%logs\postgres.log" -w -t 30
    if errorlevel 1 (
        echo [ERROR] No se pudo iniciar PostgreSQL. Revisa logs\postgres.log
        pause
        exit /b 1
    )
    echo       OK
) else (
    echo [1] Base de datos ya en ejecucion.
)

REM ── Aplicar migraciones de esquema ────────────────────────────────────────────

echo [2] Aplicando migraciones de base de datos...
set "ERRORES=0"

if not exist "%MIGRATION_DIR%\migrate_*.sql" (
    echo       Sin migraciones pendientes.
    goto reiniciar
)

for %%f in ("%MIGRATION_DIR%\migrate_*.sql") do (
    echo       - %%~nxf
    "%PGSQL%\bin\psql.exe" -U hce -p 5433 -d hce_provider -f "%%f" >>"%DIR%logs\migrations.log" 2>&1
    if errorlevel 1 (
        echo         [!] Error - ver logs\migrations.log
        set "ERRORES=1"
    )
)

if "!ERRORES!"=="1" (
    echo.
    echo [!] Algunas migraciones tuvieron errores. Revisa logs\migrations.log
    echo     El sistema intentara iniciar de todas formas.
    echo.
)

:reiniciar

REM ── Reiniciar servicios ───────────────────────────────────────────────────────

echo [3] Iniciando servicios...
call "%DIR%iniciar.bat"
