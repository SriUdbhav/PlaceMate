const { spawn } = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== STEP 4 ISOLATED TEST: LAUNCHING CHROME HEADLESS ===');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeArgs = [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--disable-gpu',
    '--window-size=1280,900',
    'http://localhost:3000/?test=heygen',
  ];

  const chromeProc = spawn(chromePath, chromeArgs);
  chromeProc.on('error', (err) => console.error('Failed to spawn Chrome:', err));

  let cdpUrl = null;
  console.log('Connecting to Chrome DevTools Protocol at 127.0.0.1:9222...');
  for (let i = 0; i < 20; i++) {
    await wait(500);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const targets = await res.json();
      const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3000'));
      if (page && page.webSocketDebuggerUrl) {
        cdpUrl = page.webSocketDebuggerUrl;
        console.log('Found page target:', page.title, page.url);
        break;
      }
    } catch (_) {}
  }

  if (!cdpUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome DevTools port 9222');
  }

  const ws = new WebSocket(cdpUrl);
  let id = 1;
  const pending = new Map();

  function sendCDP(method, params = {}) {
    const msgId = id++;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.on('message', (raw) => {
    const data = JSON.parse(raw);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      const args = data.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ');
      console.log(`[Browser Console] ${args}`);
    }
  });

  await new Promise((resolve) => ws.on('open', resolve));
  console.log('CDP WebSocket connected!');

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

  // Wait for test API to be mounted on window
  console.log('Waiting for window.__HEYGEN_TEST_API...');
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await wait(500);
    ready = await evaluate('Boolean(window.__HEYGEN_TEST_API)');
    if (ready) break;
  }

  if (!ready) {
    chromeProc.kill();
    throw new Error('window.__HEYGEN_TEST_API not found on page');
  }

  console.log('Calling startSession()...');
  await evaluate('window.__HEYGEN_TEST_API.startSession()');

  console.log('Waiting for WebRTC stream ready (up to 25s)...');
  let streamReady = false;
  for (let i = 0; i < 50; i++) {
    await wait(500);
    const state = await evaluate('window.__HEYGEN_TEST_API.getState()');
    if (state?.isStreamReady) {
      streamReady = true;
      console.log('>>> WebRTC STREAM READY CONFIRMED! Session state:', state.sessionState);
      break;
    }
  }

  if (!streamReady) {
    const finalState = await evaluate('window.__HEYGEN_TEST_API.getState()');
    console.error('Session failed to become stream ready:', finalState);
    chromeProc.kill();
    return;
  }

  // Idle baseline motion measurement
  console.log('Measuring idle baseline mouth motion for 2 seconds...');
  const idleScores = [];
  for (let i = 0; i < 8; i++) {
    await wait(250);
    const state = await evaluate('window.__HEYGEN_TEST_API.getState()');
    idleScores.push(state.mouthMotionScore);
  }
  const avgIdle = idleScores.reduce((a, b) => a + b, 0) / idleScores.length;
  console.log(`Baseline Idle Mouth Motion Score: ${avgIdle.toFixed(1)}%`);

  // STEP 4: Speak the exact sentence
  console.log('\n>>> TRIGGERING AVATAR SPEECH with repeat(text):');
  console.log('"Hello Udbhav. Welcome to your placement interview. Let us begin."');
  await evaluate('window.__HEYGEN_TEST_API.speakRepeat()');

  // Monitor speaking duration & mouth movement
  console.log('\n--- Tracking Lip Motion and Audio Output during speech ---');
  const speechScores = [];
  const audioLevels = [];
  let speechStartedObserved = false;
  let speechEndedObserved = false;

  for (let i = 0; i < 40; i++) {
    await wait(250);
    const state = await evaluate('window.__HEYGEN_TEST_API.getState()');
    speechScores.push(state.mouthMotionScore);
    audioLevels.push(state.audioLevel);

    if (state.sessionState === 'speaking') {
      speechStartedObserved = true;
    } else if (speechStartedObserved && state.sessionState === 'connected') {
      speechEndedObserved = true;
    }

    if (i % 2 === 0) {
      console.log(`t=${(i * 0.25).toFixed(1)}s | State: ${state.sessionState} | Motion: ${state.mouthMotionScore}% (Moving: ${state.isMouthMoving}) | Audio: ${state.audioLevel}%`);
    }

    // Capture screenshot at 2 seconds into speech
    if (i === 8) {
      try {
        const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/avatar_speaking_snapshot.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved screenshot: scratch/avatar_speaking_snapshot.png');
      } catch (e) {
        console.warn('Screenshot error:', e.message);
      }
    }

    if (speechEndedObserved && i > 16) {
      console.log('Interviewer speech turn finished cleanly.');
      break;
    }
  }

  const maxMotion = Math.max(...speechScores);
  const avgSpeechMotion = speechScores.reduce((a, b) => a + b, 0) / speechScores.length;
  const maxAudio = Math.max(...audioLevels);

  console.log('\n=== STEP 4 ISOLATED TEST RESULTS ===');
  console.log(`Peak Mouth Motion Score during speech: ${maxMotion}%`);
  console.log(`Average Mouth Motion Score during speech: ${avgSpeechMotion.toFixed(1)}%`);
  console.log(`Peak WebRTC Audio Level: ${maxAudio}%`);
  console.log(`AVATAR_SPEAK_STARTED observed: ${speechStartedObserved}`);
  console.log(`AVATAR_SPEAK_ENDED observed: ${speechEndedObserved}`);

  // Test message() as well to compare behavior
  console.log('\n--- TEST 2: Testing message(text) for comparison ---');
  await evaluate('window.__HEYGEN_TEST_API.speakMessage()');
  for (let i = 0; i < 16; i++) {
    await wait(250);
    const state = await evaluate('window.__HEYGEN_TEST_API.getState()');
    if (i % 2 === 0) {
      console.log(`message() t=${(i * 0.25).toFixed(1)}s | State: ${state.sessionState} | Motion: ${state.mouthMotionScore}% | Audio: ${state.audioLevel}%`);
    }
  }

  console.log('\nCleaning up session...');
  await evaluate('window.__HEYGEN_TEST_API.stopSession()');
  await wait(1000);

  ws.close();
  chromeProc.kill();
  console.log('=== TEST COMPLETE ===');
}

run().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});

