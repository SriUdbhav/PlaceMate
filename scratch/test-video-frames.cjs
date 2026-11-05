const { spawn } = require('child_process');
const WebSocket = require('ws');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Testing WebRTC frame delivery & playback quality...');
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

  console.log('Checking WebRTC video track stats:');
  const trackInfo = await evaluate(`
    (() => {
      const video = document.querySelector('video');
      if (!video) return { error: 'No video element' };
      const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
      return {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        paused: video.paused,
        totalFrames: q ? q.totalVideoFrames : 0,
        droppedFrames: q ? q.droppedVideoFrames : 0,
      };
    })()
  `);
  console.log('Video element initial stats:', trackInfo);

  // Trigger speech
  console.log('Speaking sentence: "Hello Udbhav. Welcome to your placement interview. Let us begin."');
  await evaluate('window.__HEYGEN_TEST_API.speakRepeat()');

  for (let i = 0; i < 20; i++) {
    await wait(250);
    const stats = await evaluate(`
      (() => {
        const video = document.querySelector('video');
        const q = video && video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
        return {
          currentTime: video ? video.currentTime : 0,
          totalFrames: q ? q.totalVideoFrames : 0,
          motion: window.__HEYGEN_TEST_API.getState().mouthMotionScore,
          audio: window.__HEYGEN_TEST_API.getState().audioLevel,
          speaking: window.__HEYGEN_TEST_API.getState().sessionState,
        };
      })()
    `);
    if (i % 2 === 0) {
      console.log(`t=${(i*0.25).toFixed(1)}s: time=${stats.currentTime.toFixed(2)}s | totalFrames=${stats.totalFrames} | motion=${stats.motion}% | audio=${stats.audio}% | ${stats.speaking}`);
    }
  }

  await evaluate('window.__HEYGEN_TEST_API.stopSession()');
  await wait(1000);
  ws.close();
  chromeProc.kill();
}

run().catch(console.error);

