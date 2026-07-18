@echo off
setlocal enabledelayedexpansion

:: Caminho para o executável do node portátil
set "PORTABLE_NODE_DIR=%~dp0Tool\bin"
set "PORTABLE_NODE=%PORTABLE_NODE_DIR%\node.exe"

:: 1. Verificar se o node está instalado globalmente no sistema
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
    goto RUN
)

:: 2. Se não estiver no sistema, verificar se a versão portátil local já foi baixada
if exist "%PORTABLE_NODE%" (
    set "NODE_CMD=%PORTABLE_NODE%"
    goto RUN
)

:: 3. Se não existir, criar diretório e baixar a versão portátil via PowerShell
echo Node.js nao foi detectado no sistema.
echo Preparando download da versao portatil do Node.js (v24.18.0) para Windows x64...
if not exist "%PORTABLE_NODE_DIR%" mkdir "%PORTABLE_NODE_DIR%"

echo Baixando node.exe diretamente do site oficial...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/v24.18.0/win-x64/node.exe' -OutFile '%PORTABLE_NODE%' } catch { Write-Error $_.Exception.Message; exit 1 }"

if not exist "%PORTABLE_NODE%" (
    echo Erro ao baixar o Node.js portatil.
    echo Certifique-se de que tem conexao com a internet ou instale o Node.js manualmente.
    pause
    exit /b 1
)

echo Download concluido com sucesso!
set "NODE_CMD=%PORTABLE_NODE%"

:RUN
wscript "%~dp0Tool\OpenTranslator.vbs" "%NODE_CMD%"
