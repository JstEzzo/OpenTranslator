# Guia de Solução de Problemas (Troubleshooting) - OpenTranslator

Este documento auxilia na identificação e resolução de eventuais problemas de execução do OpenTranslator.

---

## 🩺 O Autodiagnóstico do Launcher

Ao abrir o `OpenTranslator.exe`, o sistema executa 10 etapas de verificação:

1. **Arquivos Essenciais do Sistema**: Confirma a presença e integridade de `server.js`, `httpServer.js`, `rpcHandlers.js`, `index.html` e `app.js`.
2. **Runtime Node.js**: Verifica a existência e execução do Node portátil (`Tool/bin/node-...`) ou do Node instalado no sistema.
3. **Dependências NPM**: Confirma que bibliotecas cruciais (`ws`, `better-sqlite3`, etc.) estão presentes em `Tool/node_modules`.
4. **Banco de Dados & Cache**: Valida as pastas `Tool/data` e `Tool/gameLib`.
5. **Verificação de Portas**: Testa se as portas `8080` (HTTP) e `16005` (Dual Hook) estão livres. Se houver processos antigos travados, tenta liberá-los.
6. **Permissões de Leitura e Escrita**: Testa criação de arquivos temporários em `Tool/data`.
7. **Servidor Backend**: Inicia o processo `node server.js --no-browser`.
8. **Conexão HTTP**: Aguarda o retorno `200 OK` na rota `/api/ping` ou `/health`.
9. **Ativos Frontend**: Garante que o navegador receberá os arquivos HTML e JavaScript íntegros.
10. **Comunicação RPC**: Executa uma chamada de teste segura para validar o protocolo de comunicação.

---

## ⚠️ Falhas Comuns e Como Resolver

### 1. "Porta 8080 ou 16005 já está sendo utilizada"
- **Causa**: Uma sessão anterior do OpenTranslator ou outro serviço web está retendo a porta.
- **Solução Automática**: Clique em **[Tentar Corrigir]** na tela do inicializador. O launcher encerrará instâncias órfãs e reconfigurará a porta.
- **Solução Manual**: Abra o Gerenciador de Tarefas do Windows e encerre processos residuais `node.exe`.

### 2. "Runtime Node.js não encontrado"
- **Causa**: O diretório `Tool/bin/node-v20.18.3-win-x64` foi movido ou corrompido, e não há Node.js instalado no Windows.
- **Solução**: Restaure o pacote original ou instale o Node.js LTS (versão 20 ou superior) em [nodejs.org](https://nodejs.org/).

### 3. "Dependências NPM ausentes"
- **Causa**: A pasta `Tool/node_modules` está incompleta ou foi removida.
- **Solução**: Abra o terminal na pasta `Tool` e execute:
  ```bash
  npm install
  ```

### 4. "Falha de Permissões de Gravação"
- **Causa**: O OpenTranslator está em uma pasta protegida pelo sistema (como `Program Files`) sem permissões de administrador.
- **Solução**: Mova a pasta do OpenTranslator para sua Área de Trabalho, pasta de Documentos ou execute o `OpenTranslator.exe` como Administrador.

---

## 📋 Copiar Relatório de Diagnóstico

Se o programa não iniciar mesmo após tentar a auto-correção:
1. Clique no botão **[Copiar Relatório]** na tela de erro do inicializador.
2. O diagnóstico completo (com carimbos de data/hora, causas e detalhes técnicos) será copiado para a sua área de transferência.
3. Cole o texto em seu chamado ou suporte para análise imediata.
