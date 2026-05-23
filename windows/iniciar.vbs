Set objShell = CreateObject("WScript.Shell")
objShell.Run """" & Replace(WScript.ScriptFullName, "iniciar.vbs", "iniciar.bat") & """", 0, False
