# OpenTranslator + Multi-IA

Este projeto (OpenTranslator) NAO e o orquestrador. O orquestrador e um MCP separado.

Se o usuario pedir analise grande, varios arquivos, ou "multi-ia":

1. Use MCP **multi-ia-orchestrator**
2. Chame `orchestrate` com a tarefa em portugues
3. Poll `orchestrate_status` com o session_id
4. Entregue arquivos de `orchestrate_artifacts`

Codigo do orquestrador (nao apague, update do OpenTranslator nao deve mexer nisso):
`C:\Users\Teste\.config\opencode\multi-ia`

Backup:
`C:\Users\Teste\Documents\multi-ia-backup`

Nao simule agentes. Nao assuma Claude/GPT. Modelo real: 9router/esseEnzo.
