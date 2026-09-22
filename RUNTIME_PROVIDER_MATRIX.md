# OpenTranslator — Runtime Provider Matrix (Fase 6)

Esta matriz mapeia o ambiente de execução (Runtime), a camada de hook/injeção e as capacidades de interceptação:

| Runtime | Provedor de Hook | Mecanismo de Interceptação | Arquitetura | Capacidades |
|---|---|---|---|---|
| **Mono (.NET)** | `HookProvider` / `UnityMonoProvider` | Harmony / Doorstop / Managed Assembly Detour | x86 / x64 | capture, replace, observe, healthcheck |
| **IL2CPP (C++ Nativo)** | `HookProvider` / `UnityIL2CPPProvider` | MinHook / Native Function Detour | x86 / x64 | capture, observe, text-identity |
| **V8 / Chromium** | `ElectronDOMProvider` / `V8Provider` | MutationObserver / CDP WebSocket Bridge | Any | capture, replace, live-dom-patch |
| **Python (Ren'Py)** | `PythonProvider` / `RenpyTranslationProvider` | Native Translation Block Injection (`game/tl/`) | x86 / x64 | native-tl, styles, fonts, deferred |
| **Ruby (RGSS)** | `RubyProvider` / `RpgMakerRubyHandler` | Script Section Injection / Marshal Deserialization | x86 | static-data, script-protect |
| **Native C++ (Unreal/Godot)** | `HookProvider` | Windows API Detours / Resource Replacement | x86 / x64 | capture, observe, locres-replace |
| **Generic / Unknown** | `UniversalRuntimeHost` / `UniversalOverlay` | Transparent DWM DirectX/OpenGL Screen Overlay | x86 / x64 | observe, overlay, ocr-fallback |

---

## Ciclo de Vida do Hook (`HookProvider`)

Todo provedor de runtime segue o ciclo rigoroso de estados:

```
[DETACHED]
    │
    ▼ (attach)
[ATTACHING]
    │
    ▼ (verify)
[VERIFYING] ──── (falha) ────► [CLEANUP] ──► [FAILED]
    │
    ▼ (sucesso)
 [ACTIVE]
    │
    ▼
[MONITORING] (Healthcheck a cada 2s)
    │
    ▼ (detach / exit)
[DETACHING]
    │
    ▼
[CLEANUP]
    │
    ▼
[DETACHED]
```

Se a integridade do processo for violada ou o attach for interrompido, o OpenTranslator reverte o estado atomicamente sem deixar ponteiros pendentes ou corromper a memória do jogo.
