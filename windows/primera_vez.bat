@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

REM Auto-elevacion: relanzar como administrador si es necesario
net session >nul 2>&1
if errorlevel 1 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

set "DIR=%~dp0"
set "PGSQL=%DIR%pgsql"
set "DATA=%DIR%data"
set "DB_DIR=%DIR%db"
set "CONFIG=%DIR%config.bat"

echo.
echo ================================================
echo    HCE Consultorio - Primera configuracion
echo ================================================
echo.

REM ── Verificaciones previas ────────────────────────────────────────────────────


if exist "%DATA%\PG_VERSION" (
    echo [!] La base de datos ya fue inicializada.
    echo     Si quieres reconfigurar, elimina la carpeta data\ y ejecuta este script de nuevo.
    echo.
    pause
    exit /b 0
)

REM ── Preguntar configuracion ────────────────────────────────────────────────────

echo Configuracion del consultorio:
echo.
set /p "UI_PORT=  Puerto de acceso en el navegador [8080]: "
if "!UI_PORT!"=="" set UI_PORT=8080

set /p "API_PORT=  Puerto del backend API [8000]: "
if "!API_PORT!"=="" set API_PORT=8000

:ask_password
set "DB_PASS="
set /p "DB_PASS=  Contrasena para la base de datos (min. 8 caracteres, sin ' @ / : ? # + \): "
if "!DB_PASS!"=="" goto ask_password

REM Validar longitud y caracteres prohibidos leyendo $env:DB_PASS (evita bugs de FINDSTR con pipes)
powershell -nologo -noprofile -command "if($env:DB_PASS.Length -lt 8){exit 1}; if($env:DB_PASS -match '[''@/:?#&+\\]'){exit 2}" >nul 2>&1
if errorlevel 2 (
    echo   [!] La contrasena no puede contener: ' @ / : ? # + \
    goto ask_password
)
if errorlevel 1 (
    echo   [!] La contrasena debe tener al menos 8 caracteres.
    goto ask_password
)

echo.
set /p "PRINTER_TERMICA=  Nombre de la impresora termica en Windows (Enter para omitir): "

echo.
echo [1] Inicializando base de datos...

mkdir "%DIR%logs" 2>nul

REM Dar permisos completos al directorio data para que initdb pueda operar en Program Files
rmdir /s /q "%DATA%" 2>nul
mkdir "%DATA%" 2>nul
icacls "%DATA%" /grant "%USERNAME%":(OI)(CI)F >nul 2>&1

REM initdb con autenticacion trust (solo localhost)
"%PGSQL%\bin\initdb.exe" -D "%DATA%" -U postgres -E UTF8 --locale=C -A trust >"%DIR%logs\initdb.log" 2>&1
if errorlevel 1 (
    echo [ERROR] Fallo initdb.exe. Revisa logs\initdb.log
    pause
    exit /b 1
)

REM Configurar puerto 5433 y solo localhost
powershell -nologo -noprofile -command ^
    "(Get-Content '%DATA%\postgresql.conf') | ForEach-Object { $_ -replace '^#?port\s*=\s*\d+', 'port = 5433' -replace \"^#?listen_addresses\s*=\s*'[^']*'\", \"listen_addresses = 'localhost'\" } | Set-Content '%DATA%\postgresql.conf'"

REM Agregar regla md5 para usuario hce (antes de la regla trust)
echo host    hce_provider    hce    127.0.0.1/32    md5>>"%DATA%\pg_hba.conf"

echo [2] Iniciando PostgreSQL temporalmente...
"%PGSQL%\bin\pg_ctl.exe" start -D "%DATA%" -l "%DIR%logs\postgres.log" -w -t 30
if errorlevel 1 (
    echo [ERROR] No se pudo iniciar PostgreSQL. Revisa logs\postgres.log
    pause
    exit /b 1
)

echo [3] Creando usuario y base de datos...
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -c "CREATE USER hce WITH PASSWORD '!DB_PASS!';" postgres >nul 2>&1
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -c "CREATE DATABASE hce_provider OWNER hce ENCODING 'UTF8';" postgres >nul 2>&1

echo [4] Cargando esquema y datos de referencia...
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -f "%DB_DIR%\init.sql"           >>"%DIR%logs\init_sql.log" 2>&1
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -f "%DB_DIR%\seed_divipola.sql"  >>"%DIR%logs\init_sql.log" 2>&1
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -f "%DB_DIR%\seed_ocupaciones.sql" >>"%DIR%logs\init_sql.log" 2>&1
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -f "%DB_DIR%\seed_eps.sql"       >>"%DIR%logs\init_sql.log" 2>&1
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -f "%DB_DIR%\seed_medicamentos.sql" >>"%DIR%logs\init_sql.log" 2>&1
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -f "%DB_DIR%\seed_examenes.sql"  >>"%DIR%logs\init_sql.log" 2>&1
if errorlevel 1 (
    echo [ADVERTENCIA] Hubo errores al cargar los datos. Revisa logs\init_sql.log
)

echo [4b] Otorgando permisos al usuario hce...
"%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hce; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hce; GRANT USAGE ON SCHEMA public TO hce;" >>"%DIR%logs\init_sql.log" 2>&1

echo [5] Deteniendo PostgreSQL...
"%PGSQL%\bin\pg_ctl.exe" stop -D "%DATA%" -m fast >nul 2>&1

echo [6] Generando configuracion...

REM Generar JWT_SECRET aleatorio con PowerShell
for /f "delims=" %%i in ('powershell -nologo -noprofile -command "[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))"') do set JWT_SECRET=%%i

REM Escribir config.bat
(
    echo @echo off
    echo REM Generado por primera_vez.bat - no editar manualmente
    echo set "DB_PASS=!DB_PASS!"
    echo set "DATABASE_URL=postgresql://hce:!DB_PASS!@127.0.0.1:5433/hce_provider?sslmode=disable"
    echo set "JWT_SECRET=!JWT_SECRET!"
    echo set "PORT=!API_PORT!"
    echo set "ALLOWED_ORIGIN=http://localhost:!UI_PORT!"
    echo set "WEB_PORT=!UI_PORT!"
    echo set "WEB_DIR=%%~dp0dist"
    echo set "PGSQL_DATA=%%~dp0data"
    echo set "APP_TZ=America/Bogota"
    echo set "TZ=America/Bogota"
    echo set "PRINTER_TERMICA=!PRINTER_TERMICA!"
) > "%CONFIG%"

echo [7] Configurando inicio automatico...

REM El acceso directo del escritorio lo crea el instalador (Inno Setup)
REM Preguntar inicio automatico con Windows
echo.
set /p "AUTOSTART=  Iniciar HCE automaticamente cuando encienda el equipo? [s/N]: "
if /i "!AUTOSTART!"=="s" (
    for /f "delims=" %%s in ('powershell -nologo -noprofile -command "[Environment]::GetFolderPath(\"Startup\")"') do set "STARTUP=%%s"
    powershell -nologo -noprofile -command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('!STARTUP!\HCE Consultorio.lnk'); $s.TargetPath='!DIR!hce-web.exe'; $s.WorkingDirectory='!DIR!'; $s.IconLocation='!DIR!hce-web.exe,0'; $s.Save()" >nul 2>&1
    echo       Inicio automatico configurado.
)

echo.
echo ================================================
echo   Configuracion completada exitosamente
echo ================================================
echo.
echo   Para iniciar HCE Consultorio, haz doble clic en:
echo     El acceso directo "HCE Consultorio" del escritorio.
echo.
echo   Credenciales iniciales:
echo     Usuario:    admin
echo     Contrasena: admin
echo.
echo   [!] Cambia la contrasena del admin al ingresar.
echo.
pause
