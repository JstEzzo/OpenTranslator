# OpenTranslator — Engine Provider Matrix (Fase 6)

Esta matriz detalha as classes provedoras, formatos suportados e estratégias de extração/aplicação para cada motor de jogo:

| Engine | Provider Primário | Formatos Suportados | Método Preferido | Fallback Chain |
|---|---|---|---|---|
| **Ren'Py** | `RenpyTranslationProvider` / `RenpyStringProvider` | `.rpy`, `.rpyc`, `.rpa` | `METHOD_B_NATIVE` | `METHOD_A_STATIC` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **RPG Maker MZ** | `RpgMakerMvMzHandler` | `.json`, `plugins.js` | `METHOD_A_STATIC` | `METHOD_C_RUNTIME` $\rightarrow$ `METHOD_E_DOM_WEB` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **RPG Maker MV** | `RpgMakerMvMzHandler` | `.json`, `plugins.js` | `METHOD_A_STATIC` | `METHOD_C_RUNTIME` $\rightarrow$ `METHOD_E_DOM_WEB` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **RPG Maker RGSS** | `RpgMakerRubyHandler` | `.rvdata2`, `.rxdata`, `.rgss3a` | `METHOD_A_STATIC` | `METHOD_C_RUNTIME` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Electron** | `ElectronArchiveProvider` / `ElectronDOMProvider` | `app.asar`, `package.json`, HTML, JS | `METHOD_A_STATIC` | `METHOD_E_DOM_WEB` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Godot** | `GodotLocalizationProvider` / `GodotControlTextProvider` | CSV, PO, MO, `project.godot` | `METHOD_B_NATIVE` | `METHOD_A_STATIC` $\rightarrow$ `METHOD_D_UI_FRAMEWORK` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Unreal Engine** | `UnrealLocResProvider` / `UnrealStringTableProvider` | `.locres`, `.locmeta`, PO, CSV String Tables | `METHOD_B_NATIVE` | `METHOD_A_STATIC` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Unity Mono** | `UnityLocalizationPackageProvider` / `UnityTextMeshProProvider` | Assemblies Managed, CSV, Asset Tables | `METHOD_C_RUNTIME` | `METHOD_D_UI_FRAMEWORK` $\rightarrow$ `METHOD_A_STATIC` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Unity IL2CPP** | `UnityTextMeshProProvider` / `UnityUGUIProvider` | GameAssembly.dll, Assets | `METHOD_D_UI_FRAMEWORK` | `METHOD_A_STATIC` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Wolf RPG** | `BaseEngineHandler` | `data.wolf`, `.dat` | `METHOD_A_STATIC` | `METHOD_C_RUNTIME` $\rightarrow$ `METHOD_F_OVERLAY` $\rightarrow$ `METHOD_G_OCR` |
| **Generic / Unknown** | `UniversalScanner` / `UniversalOverlay` | Qualquer arquivo de texto / Binário PE | `METHOD_F_OVERLAY` | `METHOD_G_OCR` $\rightarrow$ `METHOD_A_STATIC` |
