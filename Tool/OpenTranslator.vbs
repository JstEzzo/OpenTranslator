On Error Resume Next
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(scriptDir)

If WScript.Arguments.Count > 0 Then
    arg = WScript.Arguments(0)
    If InStr(arg, "\") > 0 Or InStr(arg, "/") > 0 Then
        WshShell.Run "cmd.exe /c """"" & arg & """ server.js""", 0, False
    Else
        WshShell.Run "cmd.exe /c " & arg & " server.js", 0, False
    End If
Else
    batPath = fso.BuildPath(rootDir, "LAUNCH_OpenTranslator.bat")
    If fso.FileExists(batPath) Then
        WshShell.Run """" & batPath & """ inner_run", 0, False
    End If
End If
