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

  // Let's go back first to ensure a clean state
  const goBackResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const returnBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.trim().includes('Return to CSET') || b.textContent.trim().includes('CSET Regulatory') || b.textContent.trim().includes('[ Back to Framework Grid ]'));
      if (returnBtn) {
        returnBtn.click();
        return 'Clicked Return button';
      }
      return 'Already on main page or Return button not found';
    })()`,
    returnByValue: true
  });
  console.log('Go back action:', goBackResult.result.value);
  await new Promise(r => setTimeout(r, 800));

  // robust click for NIST SP 800-53 r5
  const clickResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const targetElement = elements.find(el => {
        const childNodes = el.childNodes;
        return childNodes.length === 1 && childNodes[0].nodeType === 3 && childNodes[0].nodeValue.trim() === 'NIST SP 800-53 r5';
      });

      if (targetElement) {
        const card = targetElement.closest('.shadow-lg');
        if (card) {
          card.click();
          return 'Clicked card successfully!';
        }
        targetElement.click();
        return 'Clicked target element directly';
      }

      // Fallback search
      const cards = Array.from(document.querySelectorAll('.shadow-lg'));
      const nistCard = cards.find(c => c.innerText.includes('NIST SP 800-53 r5'));
      if (nistCard) {
        nistCard.click();
        return 'Clicked NIST SP 800-53 r5 card via innerText fallback';
      }

      return 'Could not find NIST SP 800-53 r5 card anywhere on the page';
    })()`,
    returnByValue: true
  });
  console.log('Click Card Action:', clickResult.result.value);

  // Wait 2 seconds for activeQuestions and UI updates
  await new Promise(r => setTimeout(r, 2000));

  // Now, let's query the DOM to get the question details
  const domResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const headerText = document.querySelector('h1')?.textContent.trim() || '';
      
      // Look for pagination and total checks found
      const pageInfoElements = Array.from(document.querySelectorAll('span, p, div'))
        .filter(el => el.textContent.trim().includes('checks found') || el.textContent.trim().includes('checks matches') || el.textContent.trim().includes('Page 1 of'))
        .map(el => el.textContent.trim());

      const bodyText = document.body.innerText;

      return {
        url: window.location.href,
        headerText,
        pageInfoElements,
        bodyTextSnippet: bodyText.substring(0, 1500)
      };
    })()`,
    returnByValue: true
  });

  console.log('DOM DUMP:', JSON.stringify(domResult.result.value, null, 2));
  ws.close();
}

main().catch(console.error);
