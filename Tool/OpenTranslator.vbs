Set WshShell = CreateObject("WScript.Shell")
Dim nodeCmd
If WScript.Arguments.Count > 0 Then
    nodeCmd = WScript.Arguments(0)
Else
    nodeCmd = "node"
End If
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run """" & nodeCmd & """ server.js", 0, False
