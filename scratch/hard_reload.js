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

  await send('Page.enable');
  console.log('Sending Page.reload with ignoreCache: true...');
  await send('Page.reload', { ignoreCache: true });
  console.log('Reload triggered! Waiting 8 seconds for compilation and reload...');
  await new Promise(r => setTimeout(r, 8000));
  
  ws.close();
  console.log('Reload sequence complete.');
}

main().catch(console.error);
