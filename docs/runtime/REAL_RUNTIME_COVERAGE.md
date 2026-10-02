# OpenTranslator — Real Runtime Coverage Report
## Cobertura e Validação dos Métodos de Tradução em Tempo de Execução

Este relatório detalha as capacidades e restrições reais de interceptação, captura e substituição de texto com jogos em execução.

---

### 1. ARQUITETURA DE HOOKS E RUNTIME DO OPENTRANSLATOR

O OpenTranslator opera em três modelos principais de runtime:

1. **Native Injection / Interception (Invasivo / Alto Desempenho)**:
   - Utilizado em ambientes com runtime gerenciado (Unity Mono) via HarmonyX e DLL de interceptação.
   - Comunicação via canal IPC local seguro com o Dual Hook Server (porta `16005`).

2. **Web / DOM Observer (Web & Electron)**:
   - Injeção em tempo de carga via script de preload ou console de depuração do Chromium.
   - O `MutationObserver` intercepta alterações de nós de texto em menos de 1ms sem causar engasgos (*stuttering*) na taxa de quadros (60 FPS).

3. **Desktop HUD Overlay 2.0 (Não-Invasivo / Máxima Segurança)**:
   - Cria uma janela transparente sem bordas acoplada ao processo do jogo.
   - Renderiza legendas e caixas de texto com fontes personalizadas, opacidade configurável e sincronização por WebSockets.
   - 100% imune a incompatibilidades de memória, anti-cheat ou proteções de binário.

---

### 2. MATRIZ DE CAPACIDADES DOS TEXT FRAMEWORKS (UNITY)

| Framework | Capture | Replace | Observe | Resize | Font Fallback | Reload | Persistent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **TextMeshPro (TMP)** | SIM | SIM | SIM | SIM | SIM | SIM | SIM |
| **UnityEngine.UI (UGUI)** | SIM | SIM | SIM | SIM | NÃO | SIM | SIM |
| **Unity Localization Package** | SIM | SIM | SIM | SIM | SIM | SIM | SIM |
| **UI Toolkit** | SIM | SIM | SIM | NÃO | NÃO | NÃO | NÃO |
| **IMGUI (Legado)** | SIM | NÃO | SIM | NÃO | NÃO | NÃO | NÃO |
| **NGUI / FairyGUI** | SIM | SIM | SIM | NÃO | SIM | NÃO | NÃO |

---

### 3. SEPARAÇÃO FORMAL: MONO VS IL2CPP

- **Unity Mono**:
  - `RuntimeHook = TRUE`
  - Os métodos das classes `TMPro.TextMeshProUGUI.set_text` e `UnityEngine.UI.Text.set_text` são interceptados diretamente via patching de ponteiros gerenciados.
- **Unity IL2CPP**:
  - `RuntimeHook = CONDITIONAL_VERIFIED`
  - Como o código C# é compilado diretamente para C++ nativo em `GameAssembly.dll`, a substituição de métodos depende de assinaturas de ponteiros específicas de cada versão da Unity.
  - O OpenTranslator **não declara suporte universal de runtime para IL2CPP** sem compilação de ponteiro nativo validada; nesses casos, o sistema orienta o usuário para o modo estático ou Overlay.

---

### 4. CANAL DE COMUNICAÇÃO DE RUNTIME (DUAL HOOK)

- **Porta Local**: `16005` (servidor IPC WebSocket e TCP).
- **Tráfego Médio**:
  - Solicitação de tradução: JSON estruturado contendo hash do texto, original, contexto e ID do componente.
  - Resposta do OpenTranslator: Tradução validada pelo Quality Gate retornada em média em < 2ms (quando em cache/memória).
- **Resiliência a Falhas**:
  - Se o servidor do OpenTranslator for reiniciado ou cair, o jogo continua funcionando normalmente exibindo o texto original sem travamento ou fechamento forçado (*crash-safe*).
