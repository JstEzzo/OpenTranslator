@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "TOOL=%ROOT%Tool"
set "BIN=%TOOL%\bin"
set "NODE_EXE=%BIN%\node.exe"
set "MODS=%TOOL%\node_modules"
set "GODOT=%TOOL%\resources\godot"
set "INJECT=%TOOL%\loaders\inject.exe"

:: ----------------------------------------------------------------
:: [1] Resolver Node.js
:: ----------------------------------------------------------------
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE=node"
    goto :NPM
)
if exist "%NODE_EXE%" (
    set "NODE=%NODE_EXE%"
    goto :NPM
)
echo Baixando Node.js portatil...
if not exist "%BIN%" mkdir "%BIN%"
powershell -NoProfile -NonInteractive -Command ^
  "$ProgressPreference='SilentlyContinue';" ^
  "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
  "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.17.0/win-x64/node.exe' -OutFile '%NODE_EXE%' -UseBasicParsing"
if not exist "%NODE_EXE%" (
    echo ERRO: Falha ao baixar Node.js. Instale manualmente em https://nodejs.org/
    pause
    exit /b 1
)
set "NODE=%NODE_EXE%"

:: ----------------------------------------------------------------
:: [2] Instalar dependencias NPM (node_modules)
:: ----------------------------------------------------------------
:NPM
if not exist "%MODS%\ws\package.json" (
    echo Instalando dependencias NPM...
    cd /d "%TOOL%"
    if exist "%BIN%\npm" (
        "%NODE%" "%BIN%\npm" install --prefer-offline >nul 2>nul
    )
    if not exist "%MODS%\ws\package.json" (
        call npm install >nul 2>nul
    )
)

:: ----------------------------------------------------------------
:: [3] Baixar gdre_tools.exe (Godot) se ausente
:: ----------------------------------------------------------------
if not exist "%GODOT%\gdre_tools.exe" (
    echo Baixando gdre_tools.exe...
    if not exist "%GODOT%" mkdir "%GODOT%"
    powershell -NoProfile -NonInteractive -Command ^
      "$ProgressPreference='SilentlyContinue';" ^
      "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
      "try {" ^
      "  $r=Invoke-RestMethod -Uri 'https://api.github.com/repos/bruvzg/gdsdecomp/releases/latest' -UseBasicParsing;" ^
      "  $a=$r.assets|Where-Object{$_.name -match 'windows.*\.zip'}|Select-Object -First 1;" ^
      "  if($a){Invoke-WebRequest -Uri $a.browser_download_url -OutFile '%GODOT%\gdre.zip' -UseBasicParsing;" ^
      "  Expand-Archive -Path '%GODOT%\gdre.zip' -DestinationPath '%GODOT%' -Force;" ^
      "  Remove-Item '%GODOT%\gdre.zip' -Force}" ^
      "} catch {}"
)

:: ----------------------------------------------------------------
:: [4] Avisar sobre inject.exe se ausente (sem parenteses na variavel)
:: ----------------------------------------------------------------
if not exist "%INJECT%" (
    echo AVISO: inject.exe nao encontrado. Hook de processo indisponivel.
)

:: ----------------------------------------------------------------
:: [5] Matar instancias antigas do servidor na porta 3000
:: ----------------------------------------------------------------
:RUN
powershell -NoProfile -NonInteractive -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: ----------------------------------------------------------------
:: [6] Iniciar servidor Node em segundo plano (sem janela)
:: ----------------------------------------------------------------
wscript "%TOOL%\OpenTranslator.vbs" "%NODE%"


