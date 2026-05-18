@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

set "DIR=%~dp0"
set "CONFIG=%DIR%config.bat"
set "PGSQL=%DIR%pgsql"
set "DATA=%DIR%data"
set "MIGRATION=%DIR%migration"
set "SIMEDIC=%MIGRATION%\simedic"

echo.
echo ================================================
echo    HCE Consultorio - Migracion desde Simedic
echo ================================================
echo.
echo Importa pacientes, consultas y antecedentes desde
echo los archivos xlsx exportados por Simedic.
echo.
echo Archivos esperados en migration\simedic\:
echo   pacientes.xlsx
echo   historiacli.xlsx
echo   consantceodon.xlsx
echo   cons-gineco.xlsx
echo.

REM ── Verificaciones previas ────────────────────────────────────────────────────

if not exist "%CONFIG%" (
    echo [ERROR] No se encontro config.bat
    echo         Ejecuta primera_vez.bat primero.
    echo.
    pause
    exit /b 1
)
call "%CONFIG%"

if not exist "%DATA%\PG_VERSION" (
    echo [ERROR] La base de datos no esta inicializada.
    echo         Ejecuta primera_vez.bat primero.
    echo.
    pause
    exit /b 1
)

if not exist "!SIMEDIC!\" (
    echo [ERROR] No se encontro la carpeta migration\simedic\
    echo.
    echo   Crea la carpeta y copia los archivos xlsx de Simedic:
    echo     !SIMEDIC!\
    echo.
    pause
    exit /b 1
)

REM ── Verificar Python ──────────────────────────────────────────────────────────

set "PY="
py --version >nul 2>&1
if not errorlevel 1 set "PY=py"
if "!PY!"=="" (
    python --version >nul 2>&1
    if not errorlevel 1 set "PY=python"
)
if "!PY!"=="" (
    echo [ERROR] Python 3 no encontrado.
    echo.
    echo   Descarga desde https://www.python.org/downloads/
    echo   Durante la instalacion marca: "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

!PY! -c "import openpyxl" >nul 2>&1
if errorlevel 1 (
    echo Instalando openpyxl...
    !PY! -m pip install openpyxl --quiet
    if errorlevel 1 (
        echo [ERROR] No se pudo instalar openpyxl.
        echo         Ejecuta manualmente: !PY! -m pip install openpyxl
        echo.
        pause
        exit /b 1
    )
)

REM ── Iniciar PostgreSQL si no esta corriendo ───────────────────────────────────

set "PG_INICIADO=0"
"%PGSQL%\bin\pg_ctl.exe" status -D "%DATA%" >nul 2>&1
if errorlevel 1 (
    mkdir "%DIR%logs" 2>nul
    echo Iniciando base de datos...
    "%PGSQL%\bin\pg_ctl.exe" start -D "%DATA%" -l "%DIR%logs\postgres.log" -w -t 30
    if errorlevel 1 (
        echo [ERROR] No se pudo iniciar PostgreSQL. Revisa logs\postgres.log
        echo.
        pause
        exit /b 1
    )
    set "PG_INICIADO=1"
)

REM ── Directorio temporal ───────────────────────────────────────────────────────

set "TMPDIR=%TEMP%\hce_mig_%RANDOM%"
mkdir "!TMPDIR!" 2>nul
set "TMPDIR_FWD=!TMPDIR:\=/!"
set "RESULTADO=ok"

REM ── 1. Pacientes ──────────────────────────────────────────────────────────────

echo.
echo [1/3] Pacientes...

set "SKIP=1"
if exist "!SIMEDIC!\pacientes.xlsx" set "SKIP=0"

if "!SKIP!"=="1" (
    echo       pacientes.xlsx no encontrado - omitido.
) else (
    !PY! "!MIGRATION!\migrar_pacientes.py" "!SIMEDIC!\pacientes.xlsx" --csv "!TMPDIR!\pacientes.csv"
    if errorlevel 1 (
        echo [ERROR] Fallo la transformacion de pacientes.
        set "RESULTADO=error"
        goto fin
    )
    "%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -c ^
        "COPY paciente (tipo_documento,numero_documento,nombre_primero,nombre_segundo,apellido_primero,apellido_segundo,fecha_nacimiento,genero,codigo_municipio_residencia,zona_residencia,tipo_usuario,codigo_etnia,codigo_discapacidad,codigo_pais_origen,direccion,telefono,correo_electronico,codigo_eps,politica_datos_aceptada,creado_por) FROM '!TMPDIR_FWD!/pacientes.csv' CSV HEADER NULL ''"
    if errorlevel 1 (
        echo [ERROR] Fallo la carga de pacientes.
        set "RESULTADO=error"
        goto fin
    )
    echo       OK
)

REM ── 2. Consultas ──────────────────────────────────────────────────────────────

echo.
echo [2/3] Consultas ^(encuentros y diagnosticos^)...

set "SKIP=1"
if exist "!SIMEDIC!\historiacli.xlsx" set "SKIP=0"

if "!SKIP!"=="1" (
    echo       historiacli.xlsx no encontrado - omitido.
) else (
    !PY! "!MIGRATION!\migrar_consultas.py" "!SIMEDIC!\historiacli.xlsx" --csv "!TMPDIR!\consultas"
    if errorlevel 1 (
        echo [ERROR] Fallo la transformacion de consultas.
        set "RESULTADO=error"
        goto fin
    )
    "%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -c ^
        "COPY encuentro_clinico (id,encuentro_id,estado,paciente_documento,fecha_atencion,finalidad_consulta,causa_externa,via_ingreso,motivo_consulta,descripcion_ingreso,signos_vitales,examen_fisico,codigo_diagnostico_principal,descripcion_diagnostico,tipo_diagnostico_principal,plan_manejo,creado_por,id_sistema_anterior) FROM '!TMPDIR_FWD!/consultas_encuentros.csv' CSV HEADER NULL ''"
    if errorlevel 1 (
        echo [ERROR] Fallo la carga de encuentros.
        set "RESULTADO=error"
        goto fin
    )
    "%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -c ^
        "COPY encuentro_diagnostico (id,encuentro_clinico_id,tipo,codigo,descripcion,orden) FROM '!TMPDIR_FWD!/consultas_diagnosticos.csv' CSV HEADER NULL ''"
    if errorlevel 1 (
        echo [ERROR] Fallo la carga de diagnosticos.
        set "RESULTADO=error"
        goto fin
    )
    echo       OK
)

REM ── 3. Antecedentes ───────────────────────────────────────────────────────────

echo.
echo [3/3] Antecedentes...

set "SKIP=1"
if exist "!SIMEDIC!\consantceodon.xlsx" set "SKIP=0"
if exist "!SIMEDIC!\cons-gineco.xlsx"   set "SKIP=0"

if "!SKIP!"=="1" (
    echo       consantceodon.xlsx / cons-gineco.xlsx no encontrados - omitido.
) else (
    !PY! "!MIGRATION!\migrar_antecedentes.py" --dir "!SIMEDIC!" --csv "!TMPDIR!\antecedentes.csv"
    if errorlevel 1 (
        echo [ERROR] Fallo la transformacion de antecedentes.
        set "RESULTADO=error"
        goto fin
    )
    "%PGSQL%\bin\psql.exe" -U postgres -p 5433 -d hce_provider -c ^
        "COPY antecedente_respuesta (id,numero_documento,pregunta_id,valor,detalle) FROM '!TMPDIR_FWD!/antecedentes.csv' CSV HEADER NULL ''"
    if errorlevel 1 (
        echo [ERROR] Fallo la carga de antecedentes.
        set "RESULTADO=error"
        goto fin
    )
    echo       OK
)

:fin

REM ── Limpiar temporales ────────────────────────────────────────────────────────

if "!PG_INICIADO!"=="1" (
    echo.
    echo Deteniendo base de datos...
    "%PGSQL%\bin\pg_ctl.exe" stop -D "%DATA%" -m fast >nul 2>&1
)
rmdir /s /q "!TMPDIR!" 2>nul

echo.
if "!RESULTADO!"=="ok" (
    echo ================================================
    echo   Migracion completada exitosamente
    echo ================================================
    echo.
    echo   Si necesitas actualizar el autor de los registros:
    echo     Abre HCE Consultorio e ingresa con admin.
    echo     En la BD ejecuta:
    echo       UPDATE encuentro_clinico SET creado_por='usuario'
    echo       WHERE creado_por='migracion';
) else (
    echo ================================================
    echo   La migracion termino con errores
    echo ================================================
    echo.
    echo   Revisa los mensajes de error anteriores.
    echo   Los registros cargados antes del error se mantienen.
)
echo.
pause
