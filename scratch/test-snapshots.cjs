const { spawn } = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeArgs = [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--window-size=1280,900',
    'http://localhost:3000/?test=heygen',
  ];

  const chromeProc = spawn(chromePath, chromeArgs);

  let cdpUrl = null;
  for (let i = 0; i < 20; i++) {
    await wait(400);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const targets = await res.json();
      const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3000'));
      if (page && page.webSocketDebuggerUrl) {
        cdpUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (_) {}
  }

  const ws = new WebSocket(cdpUrl);
  let msgId = 1;
  const pending = new Map();

  function sendCDP(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.on('message', (raw) => {
    const data = JSON.parse(raw);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  });

  await new Promise(r => ws.on('open', r));
  await sendCDP('Runtime.enable');
  await sendCDP('Page.enable');

  async function evaluate(expression) {
    const res = await sendCDP('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  await wait(2000);
  console.log('Starting session...');
  await evaluate('window.__HEYGEN_TEST_API.startSession()');

  for (let i = 0; i < 50; i++) {
    await wait(500);
    const s = await evaluate('window.__HEYGEN_TEST_API.getState()');
    if (s?.isStreamReady) break;
  }

  // Pre-speech snapshot
  const s0 = await sendCDP('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/snap_idle.png', Buffer.from(s0.data, 'base64'));
  console.log('Saved scratch/snap_idle.png');

  console.log('Speaking sentence: "Hello Udbhav. Welcome to your placement interview. Let us begin."');
  await evaluate('window.__HEYGEN_TEST_API.speakRepeat()');

  // Take 5 snapshots during speech at 500ms intervals
  for (let i = 1; i <= 5; i++) {
    await wait(600);
    const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/snap_speaking_${i}.png`, Buffer.from(shot.data, 'base64'));
    console.log(`Saved scratch/snap_speaking_${i}.png`);
  }

  await evaluate('window.__HEYGEN_TEST_API.stopSession()');
  await wait(1000);
  ws.close();
  chromeProc.kill();
  console.log('Done!');
}

run().catch(console.error);

