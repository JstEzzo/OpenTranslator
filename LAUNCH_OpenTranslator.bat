@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: ================================================================
:: OpenTranslator — Launcher Principal
:: Verifica dependências e executa o setup automático se necessário
:: ================================================================

set "ROOT=%~dp0"
set "TOOL_DIR=%ROOT%Tool"
set "PORTABLE_NODE_DIR=%TOOL_DIR%\bin"
set "PORTABLE_NODE=%PORTABLE_NODE_DIR%\node.exe"
set "NODE_MODULES=%TOOL_DIR%\node_modules"
set "NEEDS_SETUP=0"

:: ── Checar se é primeira execução (node_modules ausente) ─────────
if not exist "%NODE_MODULES%\ws\package.json" set "NEEDS_SETUP=1"

:: ── Se precisar de setup, executar SETUP.bat primeiro ───────────
if "%NEEDS_SETUP%"=="1" (
    echo.
    echo  Primeira execução detectada. Iniciando instalação automática...
    echo  Isso pode levar alguns minutos dependendo da sua internet.
    echo.
    call "%ROOT%SETUP.bat"
    echo.
    echo  Setup concluído. Iniciando o OpenTranslator...
    timeout /t 2 /nobreak >nul
)

:: ── Detectar Node.js ─────────────────────────────────────────────
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
    goto :RUN
)

if exist "%PORTABLE_NODE%" (
    set "NODE_CMD=%PORTABLE_NODE%"
    goto :RUN
)

:: ── Node não encontrado mesmo após setup: baixar portátil ────────
echo Node.js nao detectado. Baixando versao portatil v22.17.0...
if not exist "%PORTABLE_NODE_DIR%" mkdir "%PORTABLE_NODE_DIR%"
powershell -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.17.0/win-x64/node.exe' -OutFile '%PORTABLE_NODE%' } catch { Write-Error $_.Exception.Message; exit 1 }"

if not exist "%PORTABLE_NODE%" (
    echo ERRO: Nao foi possivel baixar o Node.js.
    echo Instale manualmente em: https://nodejs.org/
    pause
    exit /b 1
)
set "NODE_CMD=%PORTABLE_NODE%"

:RUN
wscript "%ROOT%Tool\OpenTranslator.vbs" "%NODE_CMD%"
