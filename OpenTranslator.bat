@echo off
setlocal enabledelayedexpansion

if "%~1"=="--silent" goto :RUN_SERVER

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '--silent' -WindowStyle Hidden"
exit /b

:RUN_SERVER
cd /d "%~dp0"
set "ROOT=%~dp0"
set "TOOL=%ROOT%Tool"
set "BIN=%TOOL%\bin"
set "NODE_PORTABLE_DIR=%BIN%\node-v20.18.3-win-x64"
set "NODE_PORTABLE_EXE=%NODE_PORTABLE_DIR%\node.exe"

if exist "%NODE_PORTABLE_EXE%" (
    set "NODE=%NODE_PORTABLE_EXE%"
    set "PATH=%NODE_PORTABLE_DIR%;%PATH%"
    goto :START_NODE
)

set "HAS_SYS_NODE=0"
where node >nul 2>nul
if %errorlevel% equ 0 (
    where npm >nul 2>nul
    if %errorlevel% equ 0 (
        set "HAS_SYS_NODE=1"
    )
)

if "%HAS_SYS_NODE%"=="1" (
    set "NODE=node"
    goto :START_NODE
)

if not exist "%BIN%" mkdir "%BIN%"
if exist "%BIN%\download_node.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%BIN%\download_node.ps1" "%BIN%"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $z='%BIN%\node.zip'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.3/node-v20.18.3-win-x64.zip' -OutFile $z -UseBasicParsing; Expand-Archive -Path $z -DestinationPath '%BIN%' -Force; Remove-Item $z -Force"
)

if exist "%NODE_PORTABLE_EXE%" (
    set "NODE=%NODE_PORTABLE_EXE%"
    set "PATH=%NODE_PORTABLE_DIR%;%PATH%"
)

:START_NODE
pushd "%TOOL%"
"%NODE%" server.js %*
popd
exit /b
