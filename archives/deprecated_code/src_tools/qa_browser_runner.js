/**
 * OpenTranslator — QA Browser Automation Runner (CDP)
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== INICIANDO RUNNER DE QA VIA CHROME DEVTOOLS PROTOCOL ===\n');

  // 1. Criar novo target limpo
  const createRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:8080', { method: 'PUT' });
  const target = await createRes.json();
  console.log(`Página criada: ${target.id}`);
  console.log(`WebSocket URL: ${target.webSocketDebuggerUrl}`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let cmdId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = cmdId++;
      pending.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const logs = [];
  const networkCalls = [];
  const dialogs = [];

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const text = msg.params.args.map(a => a.value !== undefined ? a.value : JSON.stringify(a)).join(' ');
          logs.push({ type, text, time: new Date().toISOString() });
          console.log(`[CONSOLE ${type.toUpperCase()}]: ${text}`);
        } else if (msg.method === 'Page.javascriptDialogOpening') {
          dialogs.push({ message: msg.params.message, type: msg.params.type, time: new Date().toISOString() });
          console.log(`[ALERT / DIALOG DETECTADO]: "${msg.params.message}" (tipo: ${msg.params.type})`);
          // Aceita o alerta para continuar o fluxo
          send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
        } else if (msg.method === 'Network.responseReceived') {
          const resp = msg.params.response;
          if (resp.url.includes('/api/')) {
            networkCalls.push({
              url: resp.url,
              status: resp.status,
              statusText: resp.statusText,
              time: new Date().toISOString()
            });
            console.log(`[HTTP RESPONSE]: ${resp.status} ${resp.url}`);
          }
        }
      }
    } catch (e) {
      console.error('WS parse error:', e.message);
    }
  });

  await new Promise((resolve) => ws.on('open', resolve));
  console.log('Conexão WebSocket com DevTools aberta.\n');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  async function screenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buf);
    console.log(`📸 [Screenshot Salvo]: ${filename} (${buf.length} bytes)`);
    return outPath;
  }

  async function evalJS(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  // 1. Dashboard inicial
  console.log('--- ETAPA 1: Observando Dashboard Inicial ---');
  await sleep(1500);
  await screenshot('01_dashboard_initial.png');

  const initialDom = await evalJS(`(() => {
    return {
      title: document.title,
      gameCards: Array.from(document.querySelectorAll('.gc, [data-key]')).map(c => ({
        key: c.dataset.key,
        text: c.innerText.replace(/\\s+/g, ' ').trim()
      }))
    };
  })()`);
  console.log('DOM Inicial:', JSON.stringify(initialDom, null, 2));

  // 2. Abrir Modal de Detalhes
  console.log('\n--- ETAPA 2: Abrindo Modal de Detalhes do Jogo ---');
  await evalJS(`(() => {
    const card = document.querySelector('[data-key="g_1790383455761"]');
    if (card) {
      const editBtn = card.querySelector('button:nth-child(2), .btn-edit') || card;
      editBtn.click();
    }
  })()`);
  await sleep(800);
  await screenshot('02_modal_detalhes_jogo.png');

  const modalState = await evalJS(`(() => {
    const m = document.getElementById('modal');
    const btnPre = document.getElementById('mPreTranslate');
    return {
      modalActive: m ? m.classList.contains('on') : false,
      preTranslateText: btnPre ? btnPre.textContent : null,
      preTranslateDisabled: btnPre ? btnPre.disabled : null
    };
  })()`);
  console.log('Estado do Modal:', modalState);

  // 3. Clicar em "Translate Files 🌐"
  console.log('\n--- ETAPA 3: Clicando em "Translate Files 🌐" ---');
  await evalJS(`(() => {
    const btn = document.getElementById('mPreTranslate');
    if (btn) btn.click();
  })()`);

  // Observa imediatamente a resposta visual do progresso
  await sleep(800);
  await screenshot('03_translate_overlay_ativo.png');

  const activeOverlayState = await evalJS(`(() => {
    const overlay = document.getElementById('translateProgressOverlay');
    const prg = document.getElementById('translateProgress');
    const msg = document.getElementById('translateProgressMsg');
    return {
      overlayPresent: !!overlay,
      progressValue: prg ? prg.value : null,
      progressMsg: msg ? msg.textContent : null
    };
  })()`);
  console.log('Estado do Overlay no Início:', activeOverlayState);

  // Aguarda resposta ou erro do RPC
  console.log('\n--- ETAPA 4: Monitorando Processo e Diálogos de Alerta ---');
  let waitRounds = 0;
  let finished = false;
  while (waitRounds < 60) {
    await sleep(1000);
    waitRounds++;
    const state = await evalJS(`(() => {
      const overlay = document.getElementById('translateProgressOverlay');
      const btn = document.getElementById('mPreTranslate');
      const prg = document.getElementById('translateProgress');
      const msg = document.getElementById('translateProgressMsg');
      return {
        overlayPresent: !!overlay,
        btnDisabled: btn ? btn.disabled : false,
        progressValue: prg ? prg.value : null,
        progressMsg: msg ? msg.textContent : null
      };
    })()`);
    console.log(`[Monitor T+${waitRounds}s]: overlay=${state.overlayPresent}, btnDisabled=${state.btnDisabled}, msg="${state.progressMsg}"`);
    if (!state.overlayPresent && !state.btnDisabled) {
      finished = true;
      break;
    }
    if (dialogs.length > 0) {
      // Alerta ocorreu
      finished = true;
      break;
    }
  }

  await sleep(1000);
  await screenshot('04_resultado_pos_traducao.png');

  // Fecha o modal caso ainda aberto
  await evalJS(`(() => {
    const btnCancel = document.getElementById('mCancel');
    if (btnCancel) btnCancel.click();
  })()`);
  await sleep(600);

  // 5. Clicar no botão "Play"
  console.log('\n--- ETAPA 5: Clicando no Botão "Play" do Jogo ---');
  await screenshot('05_antes_de_clicar_play.png');

  await evalJS(`(() => {
    const card = document.querySelector('[data-key="g_1790383455761"]');
    if (card) {
      const playBtn = card.querySelector('button:nth-child(1), .btn-play');
      if (playBtn) playBtn.click();
    }
  })()`);

  await sleep(3000);
  await screenshot('06_apos_clicar_play.png');

  // Compilar Relatório Final
  const finalReport = {
    initialDom,
    modalState,
    activeOverlayState,
    dialogs,
    consoleLogs: logs,
    networkCalls
  };
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_evidence.json'), JSON.stringify(finalReport, null, 2));

  console.log('\n=== INVESTIGAÇÃO DE QA CONCLUÍDA COM SUCESSO ===');
  console.log('Dialogs capturados:', dialogs);
  console.log('Erros no console:', logs.filter(l => l.type === 'error'));

  ws.close();
}

run().catch(err => {
  console.error('FATAL NO RUNNER QA:', err);
  process.exit(1);
});
