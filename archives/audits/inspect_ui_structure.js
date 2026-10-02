const WebSocket = require('ws');

async function main() {
  const pages = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const otPage = pages.find(p => p.url && p.url.includes('localhost:8080'));
  if (!otPage) {
    console.error('OpenTranslator page not found in Chrome CDP!');
    process.exit(1);
  }

  const ws = new WebSocket(otPage.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const cur = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === cur) {
          ws.off('message', handler);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }

  const domRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        id: b.id,
        className: b.className,
        text: b.innerText.trim(),
        title: b.title
      }));
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        id: i.id,
        className: i.className,
        type: i.type,
        placeholder: i.placeholder,
        value: i.value
      }));
      const tabs = Array.from(document.querySelectorAll('.tab, [data-tab], .nav-item, [role="tab"]')).map(t => ({
        text: t.innerText.trim(),
        className: t.className
      }));
      return {
        title: document.title,
        bodyClass: document.body.className,
        buttons: buttons.slice(0, 30),
        inputs: inputs.slice(0, 15),
        tabs
      };
    })()`,
    returnByValue: true
  });

  console.log('UI DOM Structure:');
  console.log(JSON.stringify(domRes.result.value, null, 2));

  ws.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
