const fs = require('fs');

async function main() {
  console.log('Querying Chrome tabs...');
  const resTabs = await fetch('http://127.0.0.1:9222/json');
  if (!resTabs.ok) {
    throw new Error(`Failed to get tabs: ${resTabs.status}`);
  }
  const tabs = await resTabs.json();
  const activeTab = tabs.find(t => t.url && t.url.includes('/notebooks/notebook'));
  
  if (!activeTab) {
    console.log('No active notebook tab found.');
    return;
  }
  
  console.log(`Found active notebook tab: ${activeTab.title} (${activeTab.url})`);
  const wsUrl = activeTab.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  let id = 1;
  const send = (method, params = {}) => {
    const msgId = id++;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((resolve, reject) => {
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
    });
  };

  await new Promise((resolve) => ws.onopen = resolve);
  console.log('Connected to WebSocket!');

  await send('Runtime.enable');

  const dump = await send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.tagName + ': ' + h.textContent.trim());
      const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim() + ' (' + a.href + ')');
      return {
        url: window.location.href,
        buttons,
        headings,
        links,
        bodyText: document.body.innerText.substring(0, 1000)
      };
    })()`,
    returnByValue: true
  });

  console.log('DUMP:', JSON.stringify(dump.result.value, null, 2));
  ws.close();
}

main().catch(console.error);
