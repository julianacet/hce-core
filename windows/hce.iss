; Inno Setup Script — HCE Consultorio
; Compilar con: ISCC.exe hce.iss /DMyVersion=1.0.0
; Requiere Inno Setup 6+: https://jrsoftware.org/isinfo.php

#ifndef MyVersion
  #define MyVersion "1.0.0"
#endif

[Setup]
AppName=HCE Consultorio
AppVersion={#MyVersion}
AppPublisher=Tu Consultorio
AppPublisherURL=
AppSupportURL=
AppUpdatesURL=
DefaultDirName={autopf}\HCE Consultorio
DefaultGroupName=HCE Consultorio
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=HCE-Consultorio-Setup
SetupIconFile=hce.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
; Requiere Windows 10 o superior
MinVersion=10.0
; Cerrar aplicaciones en ejecucion antes de instalar
CloseApplications=yes
CloseApplicationsFilter=hce-api.exe,hce-web.exe

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
; Binarios de la aplicación (compilados por construir_windows.sh)
Source: "hce-api.exe";  DestDir: "{app}"; Flags: ignoreversion
Source: "hce-web.exe";  DestDir: "{app}"; Flags: ignoreversion

; Icono de la aplicación (generado en CI desde ui/public/favicon.svg)
Source: "hce.ico"; DestDir: "{app}"; Flags: ignoreversion

; Scripts de gestión
Source: "primera_vez.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "iniciar.bat";     DestDir: "{app}"; Flags: ignoreversion
Source: "detener.bat";     DestDir: "{app}"; Flags: ignoreversion
Source: "migrar.bat";      DestDir: "{app}"; Flags: ignoreversion
Source: "actualizar.bat";  DestDir: "{app}"; Flags: ignoreversion

; Version actual
Source: "version.txt"; DestDir: "{app}"; Flags: ignoreversion

; Scripts de migración desde Simedic (generados por construir_windows.sh)
Source: "..\db\migration\migrar_pacientes.py";    DestDir: "{app}\migration"; Flags: ignoreversion
Source: "..\db\migration\migrar_consultas.py";    DestDir: "{app}\migration"; Flags: ignoreversion
Source: "..\db\migration\migrar_antecedentes.py"; DestDir: "{app}\migration"; Flags: ignoreversion

; Frontend estático (generado por construir_windows.sh)
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Migraciones de esquema (aplicadas en actualizaciones por actualizar.bat)
Source: "..\db\migration\migrate_*.sql"; DestDir: "{app}\db\migration"; Flags: ignoreversion skipifsourcedoesntexist

; Esquema e datos de referencia (solo se usan en primera instalación)
Source: "..\db\init.sql";               DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_divipola.sql";      DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_ocupaciones.sql";   DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_eps.sql";           DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_medicamentos.sql";  DestDir: "{app}\db"; Flags: ignoreversion
Source: "..\db\seed_examenes.sql";      DestDir: "{app}\db"; Flags: ignoreversion

; PostgreSQL portátil (descargar por separado — ver construir_windows.sh)
Source: "pgsql\*"; DestDir: "{app}\pgsql"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\logs"
Name: "{app}\data"
Name: "{app}\migration\simedic"
Name: "{app}\db\migration"

[Icons]
Name: "{group}\Iniciar HCE Consultorio";       Filename: "{app}\hce-web.exe";    WorkingDir: "{app}"; IconFilename: "{app}\hce.ico"
Name: "{group}\Detener HCE Consultorio";       Filename: "{app}\detener.bat";    WorkingDir: "{app}"
Name: "{group}\Migrar datos desde Simedic";    Filename: "{app}\migrar.bat";     WorkingDir: "{app}"
Name: "{group}\Desinstalar HCE Consultorio";   Filename: "{uninstallexe}"
; Solo se crea en la primera instalación (config.bat aún no existe). Si se
; recreara en cada actualización, un usuario que renombró el acceso directo
; terminaría con dos íconos: el suyo renombrado + uno nuevo con el nombre
; por defecto reapareciendo tras cada "Actualizar".
Name: "{commondesktop}\HCE Consultorio";       Filename: "{app}\hce-web.exe";    WorkingDir: "{app}"; IconFilename: "{app}\hce.ico"; Tasks: desktopicon; Check: not FileExists(ExpandConstant('{app}\config.bat'))

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Iconos adicionales:"

[Run]
; Actualización (config.bat ya existe): aplicar migraciones y reiniciar
Filename: "{app}\actualizar.bat"; \
    WorkingDir: "{app}"; \
    Flags: shellexec waituntilterminated runhidden; \
    Check: FileExists(ExpandConstant('{app}\config.bat'))

; Primera instalación: configurar base de datos (sin shellexec para heredar privilegios admin)
Filename: "{cmd}"; Parameters: "/c primera_vez.bat"; \
    Description: "Configurar HCE Consultorio"; \
    WorkingDir: "{app}"; \
    Flags: waituntilterminated; \
    Check: not FileExists(ExpandConstant('{app}\config.bat'))

; Primera instalación: ofrecer iniciar al terminar
Filename: "{app}\hce-web.exe"; \
    Description: "Iniciar HCE Consultorio ahora"; \
    WorkingDir: "{app}"; \
    Flags: nowait postinstall skipifsilent; \
    Check: not FileExists(ExpandConstant('{app}\config.bat'))

[UninstallRun]
Filename: "{app}\detener.bat"; WorkingDir: "{app}"; Flags: shellexec waituntilterminated; RunOnceId: "detener"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then begin
    // Detener servicios si es una actualización
    if FileExists(ExpandConstant('{app}\detener.bat')) then
      Exec(ExpandConstant('{app}\detener.bat'), '', ExpandConstant('{app}'),
           SW_HIDE, ewWaitUntilTerminated, ResultCode);
    // Eliminar acceso directo antiguo del escritorio del usuario (creado por primera_vez.bat)
    if FileExists(ExpandConstant('{userdesktop}\HCE Consultorio.lnk')) then
      DeleteFile(ExpandConstant('{userdesktop}\HCE Consultorio.lnk'));
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;
