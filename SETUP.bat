@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

title OpenTranslator - Setup e Instalação

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          OpenTranslator — Setup Automático               ║
echo ║      Verificando e baixando dependências...              ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

set "ROOT=%~dp0"
set "TOOL_DIR=%ROOT%Tool"
set "LOADERS_DIR=%TOOL_DIR%\loaders"
set "GODOT_DIR=%TOOL_DIR%\resources\godot"
set "BIN_DIR=%TOOL_DIR%\bin"
set "NODE_EXE=%BIN_DIR%\node.exe"
set "INJECT_EXE=%LOADERS_DIR%\inject.exe"
set "GDRE_EXE=%GODOT_DIR%\gdre_tools.exe"
set "GDRE_DLL=%GODOT_DIR%\GodotMonoDecompNativeAOT.dll"
set "NODE_MODULES=%TOOL_DIR%\node_modules"

set "ERRORS=0"

:: ================================================================
:: [1] NODE.JS — Detectar sistema ou portátil
:: ================================================================
echo [1/5] Verificando Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    echo       OK — Node.js do sistema: !NODE_VER!
    goto :CHECK_NPM
)

if exist "%NODE_EXE%" (
    set "NODE_CMD=%NODE_EXE%"
    for /f "tokens=*" %%v in ('"%NODE_EXE%" --version 2^>nul') do set "NODE_VER=%%v"
    echo       OK — Node.js portátil: !NODE_VER!
    goto :CHECK_NPM
)

echo       Node.js não encontrado. Baixando versão portátil v22.17.0...
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"
powershell -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.17.0/win-x64/node.exe' -OutFile '%NODE_EXE%'"
if exist "%NODE_EXE%" (
    set "NODE_CMD=%NODE_EXE%"
    echo       Download do Node.js concluído!
) else (
    echo       ERRO: Falha ao baixar o Node.js. Verifique sua conexão.
    set "ERRORS=1"
)

:CHECK_NPM
:: ================================================================
:: [2] NPM INSTALL — Instalar dependências do projeto
:: ================================================================
echo.
echo [2/5] Verificando dependências NPM (node_modules)...
if exist "%NODE_MODULES%\ws\package.json" (
    echo       OK — node_modules já instalado.
    goto :CHECK_INJECT
)

echo       Instalando dependências NPM... (pode demorar alguns minutos)
cd /d "%TOOL_DIR%"
if defined NODE_CMD (
    "%NODE_CMD%" "%BIN_DIR%\npm" install >nul 2>&1 || npm install >nul 2>&1
) else (
    npm install >nul 2>&1
)
if exist "%NODE_MODULES%\ws\package.json" (
    echo       OK — Dependências NPM instaladas com sucesso!
) else (
    echo       AVISO: Falha ao instalar dependências. Tente rodar: cd Tool ^&^& npm install
    set "ERRORS=1"
)

:CHECK_INJECT
:: ================================================================
:: [3] INJECT.EXE — Binário de hook do MTool (167 MB)
:: ================================================================
echo.
echo [3/5] Verificando inject.exe (motor de hook para jogos)...
if exist "%INJECT_EXE%" (
    echo       OK — inject.exe encontrado.
    goto :CHECK_GDRE
)

echo       inject.exe não encontrado. Baixando do MTool...
if not exist "%LOADERS_DIR%" mkdir "%LOADERS_DIR%"
powershell -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { $resp = Invoke-WebRequest -Uri 'https://trs.mtool.app/release.php?lang=en' -MaximumRedirection 5; $url = $resp.Links | Where-Object {$_.href -match 'inject.exe'} | Select-Object -First 1 -ExpandProperty href; if ($url) { Invoke-WebRequest -Uri $url -OutFile '%INJECT_EXE%' } } catch { }"
if not exist "%INJECT_EXE%" (
    echo       inject.exe não pôde ser baixado automaticamente.
    echo       ──────────────────────────────────────────────────────
    echo       AÇÃO MANUAL NECESSÁRIA:
    echo       1. Baixe o MTool em: https://mtool.app/
    echo       2. Extraia e copie o arquivo 'inject.exe' para:
    echo          %LOADERS_DIR%\
    echo       ──────────────────────────────────────────────────────
    echo       A ferramenta funcionará, mas sem suporte a hooking de processos.
    echo       (Tradução de arquivos JSON/data ainda funciona normalmente)
)

:CHECK_GDRE
:: ================================================================
:: [4] GDRE_TOOLS.EXE — Descompilador Godot (80 MB)
:: ================================================================
echo.
echo [4/5] Verificando gdre_tools.exe (suporte a jogos Godot)...
if exist "%GDRE_EXE%" (
    echo       OK — gdre_tools.exe encontrado.
    goto :CHECK_GDRE_DLL
)

echo       gdre_tools.exe não encontrado. Baixando do GitHub...
if not exist "%GODOT_DIR%" mkdir "%GODOT_DIR%"
powershell -Command ^
    "$ProgressPreference='SilentlyContinue';" ^
    "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
    "try {" ^
    "  $r = Invoke-RestMethod -Uri 'https://api.github.com/repos/bruvzg/gdsdecomp/releases/latest' -Headers @{Accept='application/vnd.github.v3+json'};" ^
    "  $asset = $r.assets | Where-Object {$_.name -match 'gdre_tools.*windows.*\.zip' -or $_.name -match 'windows.*gdre_tools.*\.zip'} | Select-Object -First 1;" ^
    "  if (!$asset) { $asset = $r.assets | Where-Object {$_.name -match '\.zip' -and $_.name -match 'win'} | Select-Object -First 1 }" ^
    "  if ($asset) { Invoke-WebRequest -Uri $asset.browser_download_url -OutFile '%GODOT_DIR%\gdre_win.zip' }" ^
    "} catch { }"

if exist "%GODOT_DIR%\gdre_win.zip" (
    powershell -Command "Expand-Archive -Path '%GODOT_DIR%\gdre_win.zip' -DestinationPath '%GODOT_DIR%' -Force"
    del /q "%GODOT_DIR%\gdre_win.zip" >nul 2>nul
    if exist "%GDRE_EXE%" (
        echo       OK — gdre_tools.exe baixado e extraído!
    ) else (
        echo       AVISO: ZIP extraído mas gdre_tools.exe não encontrado dentro.
    )
) else (
    echo       AVISO: Não foi possível baixar gdre_tools.exe.
    echo       Acesse: https://github.com/bruvzg/gdsdecomp/releases
    echo       Copie gdre_tools.exe para: %GODOT_DIR%\
    echo       (Apenas necessário para jogos feitos em Godot Engine)
)

:CHECK_GDRE_DLL
:: ================================================================
:: [5] GodotMonoDecompNativeAOT.dll — DLL auxiliar do Godot
:: ================================================================
echo.
echo [5/5] Verificando GodotMonoDecompNativeAOT.dll...
if exist "%GDRE_DLL%" (
    echo       OK — GodotMonoDecompNativeAOT.dll encontrado.
    goto :DONE
)
echo       DLL do Godot não encontrada (opcional — baixe junto com gdre_tools).

:DONE
:: ================================================================
:: RESUMO FINAL
:: ================================================================
echo.
echo ══════════════════════════════════════════════════════════
echo  Setup concluído!
if "%ERRORS%"=="1" (
    echo  AVISO: Alguns componentes opcionais não foram instalados.
    echo  O OpenTranslator ainda funciona para a maioria dos jogos.
) else (
    echo  Tudo pronto! Pode executar o LAUNCH_OpenTranslator.bat
)
echo ══════════════════════════════════════════════════════════
echo.
endlocal
