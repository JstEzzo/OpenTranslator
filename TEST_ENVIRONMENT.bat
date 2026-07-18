@echo off
setlocal enabledelayedexpansion
title OpenTranslator - Diagnostico Completo do Ambiente
color 0A

echo.
echo  ===========================================================================
echo      OpenTranslator - DIAGNOSTICO COMPLETO DO AMBIENTE v3.0
echo      Executado em: %DATE% as %TIME%
echo  ===========================================================================
echo.

set "ERRORS=0"
set "WARNINGS=0"
set "TOTAL_STEPS=12"
set "ROOT=%~dp0"

:: ============================================================
:: ETAPA 1 - Arquivos Fundamentais do Projeto
:: ============================================================
echo  [1/%TOTAL_STEPS%] Verificando arquivos fundamentais do projeto...
echo  ---------------------------------------------------------------------------

for %%F in (LAUNCH_OpenTranslator.bat "Tool\OpenTranslator.vbs" "Tool\server.js" "Tool\www\app.js" "Tool\www\index.html" "Tool\data\openT.json" "Tool\data\global_cache.db") do (
    if exist "%ROOT%%%~F" (
        echo   [OK] %%~F
    ) else (
        echo   [ERRO] %%~F  --- ARQUIVO AUSENTE!
        set /a ERRORS+=1
    )
)
echo.

:: ============================================================
:: ETAPA 2 - Modulos Modulares em Tool\src\
:: ============================================================
echo  [2/%TOTAL_STEPS%] Verificando modulos em Tool\src\ (nova arquitetura modular)...
echo  ---------------------------------------------------------------------------

for %%M in ("Tool\src\logger.js" "Tool\src\cache.js" "Tool\src\extractor.js" "Tool\src\translator.js" "Tool\src\gameEngine.js" "Tool\src\rpcHandlers.js" "Tool\src\httpServer.js" "Tool\src\cheatServer.js") do (
    if exist "%ROOT%%%~M" (
        echo   [OK] %%~M
    ) else (
        echo   [ERRO] %%~M  --- MODULO AUSENTE! Servidor vai falhar!
        set /a ERRORS+=1
    )
)
echo.

:: ============================================================
:: ETAPA 3 - Interpretador Node.js
:: ============================================================
echo  [3/%TOTAL_STEPS%] Verificando interpretador Node.js...
echo  ---------------------------------------------------------------------------
set "NODE_CMD="

where node >nul 2>nul
if not errorlevel 1 (
    set "NODE_CMD=node"
    echo   [INFO] Node.js global detectado no PATH.
) else (
    echo   [INFO] Node.js global nao encontrado no PATH.
)

if exist "%ROOT%Tool\bin\node.exe" (
    echo   [OK] Node.js portatil detectado em Tool\bin\node.exe.
    if not defined NODE_CMD set "NODE_CMD=%ROOT%Tool\bin\node.exe"
)

if not defined NODE_CMD (
    echo   [ERRO] Nenhum Node.js encontrado ^(global ou portatil^)!
    set /a ERRORS+=1
    goto :AFTER_NODE
)

for /f "usebackq tokens=*" %%V in (`"%NODE_CMD%" -v 2^>nul`) do set "NODE_VER=%%V"
if defined NODE_VER (
    echo   [OK] Node.js funcional. Versao: !NODE_VER!
) else (
    echo   [ERRO] Node.js falhou ao executar!
    set /a ERRORS+=1
    goto :AFTER_NODE
)

:: Versao minima
for /f "usebackq tokens=*" %%N in (`"%NODE_CMD%" -e "process.stdout.write(String(parseInt(process.version.slice(1))))" 2^>nul`) do set "NODE_MAJOR=%%N"
if defined NODE_MAJOR (
    if !NODE_MAJOR! GEQ 18 (
        echo   [OK] Versao v!NODE_MAJOR! compativel ^(minimo recomendado: v18^).
    ) else (
        echo   [AVISO] Node.js v!NODE_MAJOR! pode ser antigo. Recomendado v18+.
        set /a WARNINGS+=1
    )
)

:: Verifica better-sqlite3
"%NODE_CMD%" -e "require('better-sqlite3')" >nul 2>nul
if not errorlevel 1 (
    echo   [OK] Modulo better-sqlite3 instalado.
) else (
    echo   [AVISO] Modulo better-sqlite3 nao encontrado ^(pode precisar de npm install^).
    set /a WARNINGS+=1
)

:AFTER_NODE
echo.

:: ============================================================
:: ETAPA 4 - Python Portatil
:: ============================================================
echo  [4/%TOTAL_STEPS%] Verificando Python portatil ^(RuneTranslate^)...
echo  ---------------------------------------------------------------------------
set "PYTHON_EXE=%ROOT%Tool\resources\renpy\python\python.exe"

if not exist "%PYTHON_EXE%" (
    echo   [ERRO] Python portatil nao localizado em Tool\resources\renpy\python\python.exe
    echo   [INFO] Ferramentas Ren'Py, EVB e Unity vao falhar.
    set /a ERRORS+=1
    goto :AFTER_PYTHON
)

echo   [OK] Python portatil localizado.
for /f "usebackq tokens=*" %%P in (`"%PYTHON_EXE%" --version 2^>nul`) do set "PYTHON_VER=%%P"
if defined PYTHON_VER (
    echo   [OK] Python funcional. Versao: !PYTHON_VER!
) else (
    echo   [ERRO] Python portatil falhou ao executar!
    set /a ERRORS+=1
)

:: Testa modulos Python criticos
"%PYTHON_EXE%" -c "import json, struct, os, zlib, zipfile" >nul 2>nul
if not errorlevel 1 (
    echo   [OK] Modulos Python essenciais ^(json, struct, os, zlib, zipfile^) disponiveis.
) else (
    echo   [AVISO] Falha ao importar modulos Python essenciais.
    set /a WARNINGS+=1
)

:AFTER_PYTHON
echo.

:: ============================================================
:: ETAPA 5 - Scripts e Sidecars
:: ============================================================
echo  [5/%TOTAL_STEPS%] Verificando scripts e sidecars de terceiros...
echo  ---------------------------------------------------------------------------

for %%S in ("Tool\resources\evb\evb_unpack.py" "Tool\resources\renpy\unrpyc\unrpyc.py" "Tool\resources\unity\unity_strings.py" "Tool\resources\wolf\UberWolfCli.exe") do (
    if exist "%ROOT%%%~S" (
        echo   [OK] %%~S
    ) else (
        echo   [AVISO] %%~S nao encontrado ^(funcionalidade limitada^)
        set /a WARNINGS+=1
    )
)
echo.

:: ============================================================
:: ETAPA 6 - Frontend www/
:: ============================================================
echo  [6/%TOTAL_STEPS%] Verificando arquivos do frontend ^(www/^)...
echo  ---------------------------------------------------------------------------

for %%U in ("Tool\www\index.html" "Tool\www\app.js" "Tool\www\UltraTranslateOverlay.js") do (
    if exist "%ROOT%%%~U" (
        for %%Z in ("%ROOT%%%~U") do set "FSIZE=%%~zZ"
        if !FSIZE! GTR 0 (
            echo   [OK] %%~U  ^(!FSIZE! bytes^)
        ) else (
            echo   [AVISO] %%~U existe mas esta VAZIO!
            set /a WARNINGS+=1
        )
    ) else (
        echo   [ERRO] %%~U nao encontrado!
        set /a ERRORS+=1
    )
)
echo.

:: ============================================================
:: ETAPA 7 - Banco de Dados SQLite
:: ============================================================
echo  [7/%TOTAL_STEPS%] Verificando banco de dados SQLite...
echo  ---------------------------------------------------------------------------
set "DB=%ROOT%Tool\data\global_cache.db"
if not exist "%DB%" (
    echo   [INFO] global_cache.db ainda nao existe. Sera criado ao iniciar o servidor.
) else (
    for %%Z in ("%DB%") do set "DB_SIZE=%%~zZ"
    if !DB_SIZE! GTR 4096 (
        echo   [OK] global_cache.db valido. Tamanho: !DB_SIZE! bytes.
    ) else (
        echo   [INFO] global_cache.db existe mas esta vazio. Cache sera populado ao traduzir.
    )
    echo   [INFO] Integridade detalhada do SQLite sera testada na Etapa 12 ^(servidor ao vivo^).
)
echo.

:: ============================================================
:: ETAPA 8 - Validacao do openT.json
:: ============================================================
echo  [8/%TOTAL_STEPS%] Verificando configuracao openT.json...
echo  ---------------------------------------------------------------------------
set "CFG=%ROOT%Tool\data\openT.json"
if not exist "%CFG%" (
    echo   [INFO] openT.json ainda nao existe. Sera criado ao iniciar o servidor.
) else (
    for %%Z in ("%CFG%") do set "CFG_SIZE=%%~zZ"
    echo   [OK] openT.json encontrado. Tamanho: !CFG_SIZE! bytes.
    if defined NODE_CMD (
        "%NODE_CMD%" -e "try{JSON.parse(require('fs').readFileSync('%CFG:\=\\%','utf8'));console.log('  [OK] openT.json: JSON valido.');}catch(e){console.log('  [ERRO] openT.json corrompido: '+e.message);process.exit(1);}" 2>nul
        if errorlevel 1 (
            echo   [ERRO] openT.json invalido! Apague o arquivo e reinicie o servidor.
            set /a ERRORS+=1
        )
    )
)
echo.

:: ============================================================
:: ETAPA 9 - Conflito de Portas
:: ============================================================
echo  [9/%TOTAL_STEPS%] Verificando conflitos de porta de rede...
echo  ---------------------------------------------------------------------------

netstat -ano | findstr /C:":3000 " >nul 2>nul
if not errorlevel 1 (
    echo   [AVISO] Porta 3000 OCUPADA - pode haver outra instancia ou conflito de porta.
    set /a WARNINGS+=1
) else (
    echo   [OK] Porta 3000 livre. ^(Servidor RPC principal^)
)

netstat -ano | findstr /C:":16005 " >nul 2>nul
if not errorlevel 1 (
    echo   [AVISO] Porta 16005 OCUPADA - Hook Server pode falhar ao iniciar.
    set /a WARNINGS+=1
) else (
    echo   [OK] Porta 16005 livre. ^(Hook WebSocket + Cheats^)
)

netstat -ano | findstr /C:":3001 " >nul 2>nul
if not errorlevel 1 (
    echo   [INFO] Porta 3001 ocupada ^(sera usada como fallback se 3000 estiver em uso^).
) else (
    echo   [OK] Porta 3001 livre. ^(Porta de fallback do servidor^)
)
echo.

:: ============================================================
:: ETAPA 10 - Conectividade com APIs de Traducao
:: ============================================================
echo  [10/%TOTAL_STEPS%] Testando conectividade com APIs de traducao...
echo  ---------------------------------------------------------------------------

powershell -NoProfile -NonInteractive -Command "$apis=[ordered]@{'Google Translate'='https://translate.googleapis.com';'Bing Translator'='https://www.bing.com';'DeepL API'='https://api-free.deepl.com';'LibreTranslate'='https://libretranslate.com'};foreach($name in $apis.Keys){try{$r=Invoke-WebRequest -Uri $apis[$name] -Method Head -TimeoutSec 4 -UseBasicParsing -EA Stop;Write-Host \"  [OK] $name - HTTP $($r.StatusCode)\"}catch{$code=$_.Exception.Response.StatusCode.value__;if($code){Write-Host \"  [OK] $name - alcancavel (HTTP $code)\"}else{Write-Host \"  [AVISO] $name - inacessivel: $($_.Exception.Message)\"}}}"

echo.

:: ============================================================
:: ETAPA 11 - Recursos do Sistema
:: ============================================================
echo  [11/%TOTAL_STEPS%] Diagnostico de recursos do sistema...
echo  ---------------------------------------------------------------------------

powershell -NoProfile -NonInteractive -Command "$os=Get-CimInstance Win32_OperatingSystem;$cpu=(Get-CimInstance Win32_Processor|Select-Object -First 1);$ramTot=[math]::Round($os.TotalVisibleMemorySize/1024);$ramFree=[math]::Round($os.FreePhysicalMemory/1024);$ramPct=[math]::Round(($ramTot-$ramFree)/$ramTot*100);$disk=Get-PSDrive C;$diskFreeGB=[math]::Round($disk.Free/1GB,1);Write-Host ('  [INFO] CPU     : '+$cpu.Name.Trim());Write-Host ('  [INFO] Nucleos : '+$cpu.NumberOfLogicalProcessors+' logicos');Write-Host ('  [INFO] RAM     : '+$ramTot+' MB total | '+$ramFree+' MB livre | '+$ramPct+'%%%% em uso');Write-Host ('  [INFO] Disco C : '+$diskFreeGB+' GB livres');if($ramFree -lt 512){Write-Host '  [AVISO] Pouca RAM (<512 MB). Servidor pode ser instavel.'};if($diskFreeGB -lt 1){Write-Host '  [AVISO] Disco critico (<1 GB)!'};if($ramFree -ge 512 -and $diskFreeGB -ge 1){Write-Host '  [OK] Recursos do sistema dentro do esperado.'}"

echo.

:: ============================================================
:: ETAPA 12 - Teste ao Vivo do Servidor
:: ============================================================
echo  [12/%TOTAL_STEPS%] Teste ao vivo: inicializando e verificando o servidor...
echo  ---------------------------------------------------------------------------

if not defined NODE_CMD (
    echo   [ERRO] Impossivel testar o servidor sem Node.js.
    set /a ERRORS+=1
    goto :FINAL
)

echo   [INFO] Iniciando servidor server.js em segundo plano...
start "OT_TEST_SRV" /min "%NODE_CMD%" "%ROOT%Tool\server.js"
echo   [INFO] Aguardando 5s para inicializacao...
ping -n 6 127.0.0.1 >nul

echo   [TESTE] HTTP GET na porta 3000...
powershell -NoProfile -NonInteractive -Command "try{$r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 4 -EA Stop;Write-Host \"  [OK] Servidor HTTP respondeu: $($r.StatusCode)\"}catch{Write-Host \"  [ERRO] Sem resposta na porta 3000: $($_.Exception.Message)\"}"

echo   [TESTE] JSON-RPC POST para /api/rpc (metodo getLogs)...
powershell -NoProfile -NonInteractive -EncodedCommand dAByAHkAewAkAHcAYwA9AE4AZQB3AC0ATwBiAGoAZQBjAHQAIABTAHkAcwB0AGUAbQAuAE4AZQB0AC4AVwBlAGIAQwBsAGkAZQBuAHQAOwAkAHcAYwAuAEgAZQBhAGQAZQByAHMAWwAiAEMAbwBuAHQAZQBuAHQALQBUAHkAcABlACIAXQA9ACIAYQBwAHAAbABpAGMAYQB0AGkAbwBuAC8AagBzAG8AbgAiADsAJABiAHkAdABlAHMAPQBbAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEUAbgBjAG8AZABpAG4AZwBdADoAOgBVAFQARgA4AC4ARwBlAHQAQgB5AHQAZQBzACgAIgB7ACIAIgBtAGUAdABoAG8AZAAiACIAOgAiACIAZwBlAHQATABvAGcAcwAiACIALAAiACIAcABhAHIAYQBtAHMAIgAiADoAewAiACIAYQBmAHQAZQByAEkAZAAiACIAOgAwAH0AfQAiACkAOwAkAHIAZQBzAHAAPQBbAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEUAbgBjAG8AZABpAG4AZwBdADoAOgBVAFQARgA4AC4ARwBlAHQAUwB0AHIAaQBuAGcAKAAkAHcAYwAuAFUAcABsAG8AYQBkAEQAYQB0AGEAKAAiAGgAdAB0AHAAOgAvAC8AMQAyADcALgAwAC4AMAAuADEAOgAzADAAMAAwAC8AYQBwAGkALwByAHAAYwAiACwAJABiAHkAdABlAHMAKQApADsAJABqAD0AJAByAGUAcwBwAHwAQwBvAG4AdgBlAHIAdABGAHIAbwBtAC0ASgBzAG8AbgA7AGkAZgAoACQAagAuAG8AawApAHsAVwByAGkAdABlAC0ASABvAHMAdAAgACIAIAAgAFsATwBLAF0AIABKAFMATwBOAC0AUgBQAEMAIAByAGUAcwBwAG8AbgBkAGUAdQAgAGMAbwByAHIAZQB0AGEAbQBlAG4AdABlACAAKABvAGsAPQB0AHIAdQBlACkALgAiAH0AZQBsAHMAZQB7AFcAcgBpAHQAZQAtAEgAbwBzAHQAIAAiACAAIABbAEUAUgBSAE8AXQAgAEoAUwBPAE4ALQBSAFAAQwAgAHIAZQB0AG8AcgBuAG8AdQAgAG8AawA9AGYAYQBsAHMAZQAhACIAfQB9AGMAYQB0AGMAaAB7AFcAcgBpAHQAZQAtAEgAbwBzAHQAIAAoACIAIAAgAFsARQBSAFIATwBdACAARgBhAGwAaABhACAAbgBvACAAZQBuAGQAcABvAGkAbgB0ACAAUgBQAEMAOgAgACIAKwAkAF8ALgBFAHgAYwBlAHAAdABpAG8AbgAuAE0AZQBzAHMAYQBnAGUAKQB9AA== 2>nul

echo   [TESTE] Hook Server na porta 16005...
powershell -NoProfile -NonInteractive -Command "try{$r=Invoke-WebRequest -Uri 'http://127.0.0.1:16005/dict' -UseBasicParsing -TimeoutSec 3 -EA Stop;Write-Host \"  [OK] Hook Server respondeu: HTTP $($r.StatusCode)\"}catch{$code=$_.Exception.Response.StatusCode.value__;if($code){Write-Host \"  [OK] Hook Server alcancavel (HTTP $code)\"}else{Write-Host \"  [AVISO] Hook Server sem resposta na porta 16005.\"}}"

echo   [INFO] Encerrando servidor de teste...
taskkill /FI "WINDOWTITLE eq OT_TEST_SRV*" /F >nul 2>nul
taskkill /FI "IMAGENAME eq node.exe" /F >nul 2>nul
ping -n 2 127.0.0.1 >nul
echo   [OK] Servidor de teste encerrado.

:: ============================================================
:: RESULTADO FINAL
:: ============================================================
:FINAL
echo.
echo  ===========================================================================
echo                        RESULTADO DO DIAGNOSTICO
echo  ===========================================================================
echo.
echo    Erros Criticos : %ERRORS%
echo    Avisos         : %WARNINGS%
echo.

if %ERRORS% EQU 0 (
    if %WARNINGS% EQU 0 (
        echo    [SUCESSO TOTAL] Ambiente 100%% funcional. Nenhum problema encontrado!
    ) else (
        echo    [SUCESSO COM AVISOS] Funcional com !WARNINGS! aviso^(s^) nao-critico^(s^).
    )
) else (
    echo    [FALHA] %ERRORS% erro^(s^) critico^(s^) detectado^(s^). O app pode nao funcionar!
    echo    Corrija os itens marcados com [ERRO] acima.
)

echo.
echo  ===========================================================================
echo.
pause
