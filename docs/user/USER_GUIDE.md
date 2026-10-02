# Manual do Usuário - OpenTranslator

Bem-vindo ao **OpenTranslator**, a plataforma universal de tradução, modding e cheats em tempo real para jogos de computador e emuladores.

---

## 🚀 Como Iniciar o Programa

A inicialização do OpenTranslator é simples e unificada em um único executável:

1. Dê um duplo-clique em `OpenTranslator.exe` na pasta raiz do projeto.
2. O **Inicializador & Autodiagnóstico** fará uma verificação rápida e real do ambiente (arquivos, runtime, dependências, banco de dados, portas, servidor backend e RPC).
3. Com tudo aprovado, a interface gráfica do OpenTranslator será aberta automaticamente no seu navegador.
4. O inicializador permanecerá no painel de controle ou na bandeja do sistema (System Tray) para monitorar o status e encerrar os processos de forma limpa quando você fechar o programa.

---

## 🎮 Motores de Jogos Suportados

O OpenTranslator detecta e traduz automaticamente jogos criados em diversas engines:

| Motor | Tipo de Tradução | Recursos Especiais |
|---|---|---|
| **Ren'Py** | Extração de `.rpyc` / Scripts `.rpy` / Injeção dinâmica | Suporte a Python 2 e 3, descompilação segura, restauração limpa |
| **RPG Maker (MV / MZ)** | Patch de arquivos `.json` de dados / Injeção de plugins | Dual Hook WebSocket (16005), LatinNameInput, CheatOverlay |
| **RPG Maker (XP / VX / VX Ace)** | Descriptografia `.rgss3a` / Marshal Ruby | Scripts e dados serializados com rollback atômico SHA-256 |
| **Wolf RPG Editor** | Extração `.wolf` / `.dat` via UberWolfCli | Patch de comandos de mensagens e eventos |
| **Unity Engine** | TextAsset / MonoBehaviour / BepInEx XUnity AutoTranslator | UltraBatchEndpoint.dll nativo para tradução rápida |
| **Unreal Engine** | Descompactação `.pak` / Conversão `.locres` | Extração de tabelas de strings de localização |
| **Genérico / Visual Novel** | Hook de memória / Extração de strings de texto | Tradução paralela multi-engine |

---

## 🛠️ Modos de Tradução

1. **Tradução Direta (Patching)**:
   - Extrai os textos do jogo, traduz usando provedores locais ou de nuvem, e aplica diretamente nos arquivos com backup de segurança automático.
2. **Simulação (Dry-Run)**:
   - Permite testar a tradução de um jogo sem alterar nenhum arquivo original no disco.
3. **Restauração / Rollback Atômico**:
   - Se desejar reverter o jogo para o estado original, use o botão de Rollback. O sistema restaura os arquivos usando verificação de hash SHA-256.
4. **Hook em Tempo Real (Overlay)**:
   - Conecta-se diretamente ao jogo em execução na porta 16005 para tradução dinâmica e cheats.

---

## ⚙️ Atalhos e Comandos Úteis

- **Abrir Interface Web**: Clique com o botão direito no ícone da bandeja ou no botão "Abrir Interface Web" do Launcher.
- **Exportar Diagnóstico**: Gere um arquivo de evidências e logs completos caso precise de suporte técnico.
- **Encerrar**: Clique em "Encerrar OpenTranslator" no inicializador para fechar tanto o servidor quanto os hooks de forma limpa, liberando as portas da máquina.
