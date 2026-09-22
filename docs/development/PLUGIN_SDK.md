# OpenTranslator — Plugin SDK & Conformance Guide (Fase 6)

O OpenTranslator Plugin SDK permite estender o ecossistema com novos adaptadores de motores, extratores de texto, injetores de runtime e provedores de tradução, mantendo total isolamento e estabilidade do núcleo.

---

## 1. Interfaces Principais

### 1.1. `EngineAdapter`
Adaptador responsável pelo ciclo de vida de arquivos e estratégias de um motor:
- `detect(gameDir, exePath, filesList)`: Avalia evidências estruturais e retorna nível de confiança.
- `extract(gameDir, options)`: Extrai textos traduzíveis em formato canônico.
- `validate(gameDir, texts, translations)`: Executa QA antes da modificação.
- `apply(gameDir, texts, translations, options)`: Grava ou compila os textos traduzidos.
- `rollback(gameDir, options)`: Restaura estado original de fábrica.
- `getCapabilities(gameDir, exePath)`: Retorna mapa booleano de capacidades suportadas.

### 1.2. `HookProvider`
Provedor de interceptação de processos em runtime:
- `attach(processInfo)`: Anexa hook ao processo alvo.
- `verify(hookId)`: Valida integridade da injeção de memória.
- `replaceText(identity, translatedText)`: Substitui o texto dinamicamente no componente.
- `restoreText(identity, originalText)`: Restaura o texto original no componente.
- `detach()`: Desanexa o hook de forma segura.
- `cleanup()`: Libera recursos alocados sem deixar ponteiros pendentes.
- `getCapabilities()`: Retorna lista de arquiteturas e recursos suportados.

### 1.3. `TranslationProvider`
Provedor de serviço de tradução:
- `translate(text, context)`: Traduz uma string individual.
- `translateBatch(texts, context)`: Traduz um lote de strings.
- `healthCheck()`: Retorna o status de conectividade do serviço.
- `supportsLanguagePair(source, target)`: Valida par de idiomas.

---

## 2. Crash Containment & Isolamento Seguro

Plugins externos são sempre invocados através de `PluginSDK.safeExecute()`:
```javascript
const { result, error, success } = await PluginSDK.safeExecute(plugin, 'translate', [text], fallback);
```
Se o plugin lançar uma exceção não tratada, sofrer um timeout ou tentar acessar ponteiros inválidos:
1. Apenas o plugin específico falha.
2. O OpenTranslator ativa o circuit breaker e seleciona o próximo provedor na cadeia de fallback.
3. **A interface gráfica, o servidor HTTP e a memória de tradução permanecem 100% ativos.**
