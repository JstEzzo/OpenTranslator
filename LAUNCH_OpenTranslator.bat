@echo off
setlocal enabledelayedexpansion
title OpenTranslator Launcher

cd /d "%~dp0"

echo ============================================================
echo   OpenTranslator v1.0 -- Launcher Inteligente
echo ============================================================
echo.

set "ROOT=%~dp0"

if exist "!ROOT!Tool\server.js" (
    set "TOOL=!ROOT!Tool"
    goto :TOOL_FOUND
)
if exist "!ROOT!OpenTranslator\Tool\server.js" (
    set "TOOL=!ROOT!OpenTranslator\Tool"
    goto :TOOL_FOUND
)

echo [ERRO CRITICO] Pasta 'Tool' nao encontrada!
echo Certifique-se de executar o LAUNCH_OpenTranslator.bat dentro da pasta do projeto.
echo.
pause
exit /b 1

:TOOL_FOUND
set "BIN=!TOOL!\bin"
set "NODE_PORTABLE_DIR=!BIN!\node-v20.18.3-win-x64"
set "NODE_PORTABLE_EXE=!NODE_PORTABLE_DIR!\node.exe"
set "MODS=!TOOL!\node_modules"
set "GODOT=!TOOL!\resources\godot"
set "INJECT=!TOOL!\loaders\inject.exe"

echo [1/5] Verificando ambiente Node.js e NPM...

if exist "!NODE_PORTABLE_EXE!" (
    set "NODE=!NODE_PORTABLE_EXE!"
    set "PATH=!NODE_PORTABLE_DIR!;!PATH!"
    echo   - Node.js portatil detectado em: !NODE_PORTABLE_EXE!
    goto :CHECK_NPM
)

set "HAS_SYS_NODE=0"
where node >nul 2>nul
if %errorlevel% equ 0 (
    where npm >nul 2>nul
    if !errorlevel! equ 0 (
        set "HAS_SYS_NODE=1"
    )
)

if "!HAS_SYS_NODE!"=="1" (
    set "NODE=node"
    echo   - Node.js e NPM do sistema detectados.
    goto :CHECK_NPM
)

echo   - Node.js/NPM nao encontrados no sistema.
if not exist "!BIN!" mkdir "!BIN!"

if exist "!BIN!\download_node.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "!BIN!\download_node.ps1" "!BIN!"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $z='!BIN!\node.zip'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.3/node-v20.18.3-win-x64.zip' -OutFile $z -UseBasicParsing; Expand-Archive -Path $z -DestinationPath '!BIN!' -Force; Remove-Item $z -Force"
)

if exist "!NODE_PORTABLE_EXE!" (
    set "NODE=!NODE_PORTABLE_EXE!"
    set "PATH=!NODE_PORTABLE_DIR!;!PATH!"
    goto :CHECK_NPM
)

echo.
echo [ERRO CRITICO] Nao foi possivel baixar o Node.js portatil automaticamente.
echo Por favor, instale o Node.js manualmente em: https://nodejs.org/
echo.
pause
exit /b 1

:CHECK_NPM
echo.
echo [2/5] Verificando dependencias NPM (node_modules)...

if exist "!MODS!\ws\package.json" (
    echo   - Dependencias NPM instaladas e integras.
    goto :CHECK_GODOT
)

echo   - Pacotes faltantes. Instalando dependencias NPM...
pushd "!TOOL!"
call npm install --no-audit --no-fund --prefer-offline
popd

if exist "!MODS!\ws\package.json" (
    echo   - Dependencias NPM instaladas com sucesso.
    goto :CHECK_GODOT
)

echo   - Tentando instalacao normal do NPM sem prefer-offline...
pushd "!TOOL!"
call npm install --no-audit --no-fund
popd

if exist "!MODS!\ws\package.json" (
    echo   - Dependencias NPM instaladas com sucesso.
    goto :CHECK_GODOT
)

echo.
echo [ERRO] Nao foi possivel instalar as dependencias NPM requeridas.
echo Verifique sua conexao com a internet e tente novamente.
echo.
pause
exit /b 1

:CHECK_GODOT
echo.
echo [3/5] Verificando ferramentas de decompilacao (Godot)...

if exist "!GODOT!\gdre_tools.exe" (
    echo   - gdre_tools.exe OK.
    goto :CHECK_INJECT
)

echo   - Baixando gdre_tools.exe para suporte a jogos Godot...
if not exist "!GODOT!" mkdir "!GODOT!"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $r=Invoke-RestMethod -Uri 'https://api.github.com/repos/bruvzg/gdsdecomp/releases/latest' -UseBasicParsing; $a=$r.assets | Where-Object { $_.name -match 'windows.*\.zip' } | Select-Object -First 1; if ($a) { Invoke-WebRequest -Uri $a.browser_download_url -OutFile '!GODOT!\gdre.zip' -UseBasicParsing; Expand-Archive -Path '!GODOT!\gdre.zip' -DestinationPath '!GODOT!' -Force; Remove-Item '!GODOT!\gdre.zip' -Force }"

:CHECK_INJECT
echo.
echo [4/5] Verificando injetor de hook (inject.exe)...
if exist "!INJECT!" (
    echo   - inject.exe OK.
    goto :RUN_SERVER
)

echo   - [AVISO] inject.exe nao encontrado.
echo   - Hook em tempo real para RPG Maker/KRKR nao estara disponivel.

:RUN_SERVER
echo.
echo [5/5] Iniciando servidor OpenTranslator...

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r /c:":3000 *LISTENING"') do taskkill /F /PID %%a >nul 2>nul

pushd "!TOOL!"
start "OpenTranslatorServer" "!NODE!" server.js
popd

exit /b 0
