param(
    [Parameter(Mandatory=$true)][string]$AssemblyPath,
    [Parameter(Mandatory=$true)][string]$Mode, # "extract" or "inject"
    [string]$OutputFile = "",
    [string]$PayloadFile = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cecilPath = Join-Path $scriptDir "..\..\..\resources\unity\Mono.Cecil.dll"
$cecilRocksPath = Join-Path $scriptDir "..\..\..\resources\unity\Mono.Cecil.Rocks.dll"

if (-not (Test-Path $cecilPath)) {
    Write-Error "Mono.Cecil.dll not found at $cecilPath"
    exit 1
}

[System.Reflection.Assembly]::LoadFrom($cecilPath) | Out-Null
if (Test-Path $cecilRocksPath) {
    [System.Reflection.Assembly]::LoadFrom($cecilRocksPath) | Out-Null
}

$readerParams = New-Object Mono.Cecil.ReaderParameters
$resolver = New-Object Mono.Cecil.DefaultAssemblyResolver
$asmDir = Split-Path -Parent $AssemblyPath
$resolver.AddSearchDirectory($asmDir)
$readerParams.AssemblyResolver = $resolver

$asmDef = [Mono.Cecil.AssemblyDefinition]::ReadAssembly($AssemblyPath, $readerParams)

function IsTranslatableText([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return $false }
    $t = $s.Trim()
    if ($t.Length -lt 2 -or $t.Length -gt 3000) { return $false }
    
    # Filter identifiers starting with underscore, symbol, or punctuation
    if ($t.StartsWith("_") -or $t.StartsWith("{") -or $t.StartsWith("[") -or $t.StartsWith("/*") -or $t.StartsWith("//") -or $t.StartsWith("<") -or $t.StartsWith("#") -or $t.StartsWith("$") -or $t.StartsWith("@")) {
        return $false
    }
    
    # Filter technical keywords
    $techWords = @("com.unity.", "UnityEngine", "System.", "PublicKeyToken", "Version=0.", "Assembly", "guid:", "m_Script:", "--- !u!", "http://", "https://")
    foreach ($tw in $techWords) {
        if ($t.Contains($tw)) { return $false }
    }
    
    # Filter file extensions
    if ($t.EndsWith(".png") -or $t.EndsWith(".jpg") -or $t.EndsWith(".wav") -or $t.EndsWith(".mp3") -or $t.EndsWith(".ogg") -or $t.EndsWith(".shader") -or $t.EndsWith(".dll") -or $t.EndsWith(".mat") -or $t.EndsWith(".asset")) {
        return $false
    }
    
    # Check if contains CJK characters
    $hasCjk = $false
    $hasLetter = $false
    foreach ($ch in $t.ToCharArray()) {
        $code = [int]$ch
        if ($code -ge 0x3000 -and $code -le 0x9fff) {
            $hasCjk = $true
            break
        }
        if ([char]::IsLetter($ch)) {
            $hasLetter = $true
        }
    }
    
    if ($hasCjk) { return $true }
    if (-not $hasLetter) { return $false }
    
    # For Latin / ASCII text:
    # Must have either spaces or punctuation to be user-facing text, OR be in the allowed UI words list
    if (-not ($t.Contains(" ") -or $t.Contains("!") -or $t.Contains("?") -or $t.Contains(":") -or $t.Contains(".") -or $t.Contains(","))) {
        if ($t -match "^[A-Za-z0-9_]+$") {
            $allowedUIWords = @("Start", "Exit", "Quit", "Options", "Settings", "Save", "Load", "Continue", "Retry", "Back", "Next", "Cancel", "Confirm", "Yes", "No", "Play", "Pause", "Menu", "Help", "Inventory", "Status", "Items", "Map", "Config", "Sound", "Music")
            if ($allowedUIWords -contains $t) { return $true }
            return $false
        }
    }
    
    return $true
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if ($Mode -eq "extract") {
    $items = [System.Collections.ArrayList]::new()
    $seenIds = [System.Collections.Generic.HashSet[string]]::new()
    
    foreach ($module in $asmDef.Modules) {
        foreach ($type in $module.Types) {
            foreach ($method in $type.Methods) {
                if (-not $method.HasBody) { continue }
                $instrIdx = 0
                foreach ($instr in $method.Body.Instructions) {
                    if ($instr.OpCode.Name -eq "ldstr") {
                        $val = [string]$instr.Operand
                        if (IsTranslatableText $val) {
                            $typeName = $type.FullName
                            $methodName = $method.Name
                            $id = "unity_mono_${typeName}_${methodName}_i${instrIdx}"
                            
                            if (-not $seenIds.Contains($id)) {
                                $seenIds.Add($id) | Out-Null
                                $obj = [ordered]@{
                                    id = $id
                                    typeName = $typeName
                                    methodName = $methodName
                                    instructionIndex = $instrIdx
                                    original = $val
                                    clean = $val
                                    format = "managed_ldstr"
                                    engine = "unity"
                                }
                                $items.Add($obj) | Out-Null
                            }
                        }
                    }
                    $instrIdx++
                }
            }
        }
    }
    
    $result = [ordered]@{
        success = $true
        count = $items.Count
        texts = $items
    }
    
    $json = ConvertTo-Json $result -Depth 10 -Compress
    if ($OutputFile) {
        [System.IO.File]::WriteAllText($OutputFile, $json, $utf8NoBom)
    } else {
        Write-Output $json
    }
    exit 0
}

if ($Mode -eq "inject") {
    if (-not (Test-Path $PayloadFile)) {
        Write-Error "Payload file not found: $PayloadFile"
        exit 1
    }
    
    $payloadRaw = [System.IO.File]::ReadAllText($PayloadFile, [System.Text.Encoding]::UTF8)
    $payload = ConvertFrom-Json $payloadRaw
    
    $transMap = @{}
    foreach ($item in $payload.items) {
        if ($item.id -and $item.translation) {
            $transMap[$item.id] = $item.translation
        }
    }
    
    $patchedCount = 0
    foreach ($module in $asmDef.Modules) {
        foreach ($type in $module.Types) {
            foreach ($method in $type.Methods) {
                if (-not $method.HasBody) { continue }
                $instrIdx = 0
                foreach ($instr in $method.Body.Instructions) {
                    if ($instr.OpCode.Name -eq "ldstr") {
                        $id = "unity_mono_$($type.FullName)_$($method.Name)_i$instrIdx"
                        if ($transMap.ContainsKey($id)) {
                            $newText = $transMap[$id]
                            $instr.Operand = $newText
                            $patchedCount++
                        }
                    }
                    $instrIdx++
                }
            }
        }
    }
    
    $targetOut = if ($OutputFile) { $OutputFile } else { $AssemblyPath }
    $asmDef.Write($targetOut)
    
    $res = [ordered]@{
        success = $true
        patchedCount = $patchedCount
        targetFile = $targetOut
    }
    Write-Output (ConvertTo-Json $res)
    exit 0
}
