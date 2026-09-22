# OpenTranslator — Translation Architecture (Fase 5B)

## Fluxo Central de Tradução

```
                    OpenTranslator
                         │
                         ▼
                Translation Router
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      STATIC          RUNTIME          VISUAL
          │              │              │
          ▼              ▼              ▼
       parser           hook            OCR
       patch            bridge
       redirect         observer
       archive          runtime text
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                   Text Pipeline
                         │
                         ▼
                  Text Normalizer
                         │
                         ▼
                  Context Resolver
                         │
                         ▼
                 Translation Memory (L1 -> L2 -> L3 -> L4)
                         │
                         ▼
                  Translator Core (Offline First)
                         │
                         ▼
                  Result Validator (Placeholder & Tag Safety)
                         │
                         ▼
                  Output Adapter
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          FILE PATCH   RUNTIME     OVERLAY
```

### Princípios de Arquitetura:
1. **Sem IA Pesada**: Lógica baseada em regras determinísticas, heurísticas e dicionários locais de alto desempenho.
2. **Capacidade Baseada em Contratos**: Provedores declaram explicitamente permissões e capacidades (`capture`, `replace`, `static`, `runtime`, `overlay`, `ocr`).
3. **Resiliência a Spam**: Estabilização via debounce e supressão de atualizações intermediárias de HUD/contadores.
