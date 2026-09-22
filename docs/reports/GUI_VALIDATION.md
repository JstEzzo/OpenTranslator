# Validação da Interface Gráfica (GUI)

- **Servidor HTTP:** Ativo e respondendo na porta `8080` (`http://localhost:8080/`).
- **Servidor de Hook / WebSocket:** Ativo e respondendo na porta `16005`.
- **Assets Estáticos:** `index.html` carregado com sucesso (200 OK), `app.js` carregado com sucesso (200 OK).
- **Responsividade:** Interface assíncrona alimentada por filas de prioridade (`PriorityQueue`), prevenindo travamentos ou congelamento da interface durante lotes grandes de tradução.
