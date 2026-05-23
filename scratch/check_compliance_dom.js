const fs = require('fs');

async function main() {
  console.log('Querying Chrome tabs...');
  const resTabs = await fetch('http://127.0.0.1:9222/json');
  if (!resTabs.ok) {
    throw new Error(`Failed to get tabs: ${resTabs.status}`);
  }
  const tabs = await resTabs.json();
  const activeTab = tabs.find(t => t.url && t.url.includes('/compliance'));
  
  if (!activeTab) {
    console.log('No compliance page tab found.');
    return;
  }
  
  console.log(`Found active compliance tab: ${activeTab.title} (${activeTab.url})`);
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

  // Let's first check if a framework is selected, if not, click NIST SP 800-82 r3 card
  const selectCardResult = await send('Runtime.evaluate', {
    expression: `(() => {
      // Check if we are currently looking at a specific framework
      const backButton = document.querySelector('button.text-cyan-400');
      // If we see return button or framework header, we are already in detail view.
      // Let's go back first to ensure a clean state, or click if we are in main page
      const cards = Array.from(document.querySelectorAll('.grid h3'));
      const targetCard = cards.find(c => c.textContent.trim().includes('NIST SP 800-82 r3'));
      if (targetCard) {
        targetCard.closest('.shadow-lg').click();
        return 'Clicked NIST SP 800-82 r3 card';
      } else {
        return 'Could not find NIST SP 800-82 r3 card (maybe already selected?)';
      }
    })()`,
    returnByValue: true
  });
  console.log('Card click action:', selectCardResult.result.value);

  // Wait 1.5 seconds for activeQuestions and UI updates
  await new Promise(r => setTimeout(r, 1500));

  // Now, let's query the DOM to get the question details
  const domResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const headerText = document.querySelector('h1')?.textContent.trim() || '';
      const subheaderText = document.querySelector('p.text-xs')?.textContent.trim() || '';
      
      // Look for pagination and total checks found
      const pageInfo = Array.from(document.querySelectorAll('span, p, div'))
        .map(el => el.textContent.trim())
        .find(text => text.includes('checks found') || text.includes('checks matches') || text.includes('Page 1 of'));

      const questionsList = Array.from(document.querySelectorAll('div'))
        .filter(el => el.textContent.trim().startsWith('N82_') || el.textContent.trim().startsWith('NIST_') || el.textContent.trim().includes('OT Policy'))
        .map(el => el.textContent.trim().substring(0, 150))
        .slice(0, 10);

      // Check for code labels (standard codes like AC-2, etc.)
      const standardCodes = Array.from(document.querySelectorAll('span, div'))
        .filter(el => el.className && el.className.includes('text-cyan-400') && el.textContent.trim().match(/^[A-Z]{2,3}-\\d+$/))
        .map(el => el.textContent.trim());

      return {
        url: window.location.href,
        headerText,
        pageInfo,
        questionsCountOnPage: questionsList.length,
        firstFewQuestions: questionsList,
        standardCodes: standardCodes.slice(0, 15),
        bodyTextSnippet: document.body.innerText.substring(0, 600)
      };
    })()`,
    returnByValue: true
  });

  console.log('DOM DUMP:', JSON.stringify(domResult.result.value, null, 2));
  ws.close();
}

main().catch(console.error);
