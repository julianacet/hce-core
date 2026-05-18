; Inno Setup Script — HCE Consultorio
; Compilar con: ISCC.exe hce.iss
; Requiere Inno Setup 6+: https://jrsoftware.org/isinfo.php

[Setup]
AppName=HCE Consultorio
AppVersion=1.0.0
AppPublisher=Tu Consultorio
AppPublisherURL=
AppSupportURL=
AppUpdatesURL=
DefaultDirName={autopf}\HCE Consultorio
DefaultGroupName=HCE Consultorio
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=HCE-Consultorio-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
; Requiere Windows 10 o superior
MinVersion=10.0

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
; Binarios de la aplicación (compilados por construir_windows.sh)
Source: "hce-api.exe";  DestDir: "{app}"; Flags: ignoreversion
Source: "hce-web.exe";  DestDir: "{app}"; Flags: ignoreversion

; Scripts de gestión
Source: "primera_vez.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "iniciar.bat";    DestDir: "{app}"; Flags: ignoreversion
Source: "detener.bat";    DestDir: "{app}"; Flags: ignoreversion
Source: "migrar.bat";     DestDir: "{app}"; Flags: ignoreversion

; Scripts de migración desde Simedic (generados por construir_windows.sh)
Source: "migration\migrar_pacientes.py";   DestDir: "{app}\migration"; Flags: ignoreversion
Source: "migration\migrar_consultas.py";   DestDir: "{app}\migration"; Flags: ignoreversion
Source: "migration\migrar_antecedentes.py"; DestDir: "{app}\migration"; Flags: ignoreversion

; Frontend estático (generado por construir_windows.sh)
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Esquema e datos de referencia
Source: "..\db\init.sql";              DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_divipola.sql";    DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_ocupaciones.sql"; DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_eps.sql";         DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_medicamentos.sql"; DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_examenes.sql";    DestDir: "{app}\db"; Flags: ignoreversion

; PostgreSQL portátil (descargar por separado — ver construir_windows.sh)
Source: "pgsql\*"; DestDir: "{app}\pgsql"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\logs"
Name: "{app}\data"
Name: "{app}\migration\simedic"

[Icons]
Name: "{group}\Iniciar HCE Consultorio";       Filename: "{app}\iniciar.bat";    WorkingDir: "{app}"; IconFilename: "{app}\hce-api.exe"
Name: "{group}\Detener HCE Consultorio";       Filename: "{app}\detener.bat";    WorkingDir: "{app}"
Name: "{group}\Migrar datos desde Simedic";    Filename: "{app}\migrar.bat";     WorkingDir: "{app}"
Name: "{group}\Desinstalar HCE Consultorio";   Filename: "{uninstallexe}"
Name: "{commondesktop}\HCE Consultorio";       Filename: "{app}\iniciar.bat";    WorkingDir: "{app}"; IconFilename: "{app}\hce-api.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Iconos adicionales:"

[Run]
; Primera vez: configurar base de datos e inicializar
Filename: "{app}\primera_vez.bat"; \
    Description: "Configurar HCE Consultorio"; \
    WorkingDir: "{app}"; \
    Flags: shellexec waituntilterminated; \
    Check: not FileExists(ExpandConstant('{app}\config.bat'))

; Opcionalmente iniciar al terminar el instalador
Filename: "{app}\iniciar.bat"; \
    Description: "Iniciar HCE Consultorio ahora"; \
    WorkingDir: "{app}"; \
    Flags: shellexec nowait postinstall skipifsilent; \
    Check: FileExists(ExpandConstant('{app}\config.bat'))

[UninstallRun]
; Detener todos los servicios antes de desinstalar
Filename: "{app}\detener.bat"; WorkingDir: "{app}"; Flags: shellexec waituntilterminated; RunOnceId: "detener"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
