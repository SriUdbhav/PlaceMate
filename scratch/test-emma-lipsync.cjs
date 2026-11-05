require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testWithVoice(testName, tokenBody) {
  console.log(`\n======================================================`);
  console.log(`TESTING: ${testName}`);
  console.log(`Token Request Body:`, JSON.stringify(tokenBody, null, 2));
  console.log(`======================================================`);

  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  // 1. Get token
  const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(tokenBody),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData?.data?.session_token) {
    console.error('Token error:', tokenData);
    return;
  }
  const sessionToken = tokenData.data.session_token;
  console.log('Session token acquired successfully. Session ID:', tokenData.data.session_id);

  // 2. Launch headless Chrome with the token passed directly
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

  if (!cdpUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome DevTools');
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
    } else if (data.method === 'Runtime.consoleAPICalled') {
      const args = data.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ');
      if (args.includes('HeyGenTest') || args.includes('LiveAvatar') || args.includes('speak')) {
        console.log(`[Browser Console] ${args}`);
      }
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

  // Inject session start with custom token
  console.log('Injecting session start into browser with token...');
  await evaluate(`
    (async () => {
      const token = "${sessionToken}";
      const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = await import('@heygen/liveavatar-web-sdk');
      const session = new LiveAvatarSession(token, {
        apiUrl: 'https://api.liveavatar.com',
        autoKeepAlive: true,
        voiceChat: { defaultMuted: true }
      });
      window.__DIAG_SESSION = session;
      window.__DIAG_STREAM_READY = false;
      window.__DIAG_SPEAKING = false;
      window.__DIAG_AUDIO_LEVEL = 0;
      window.__DIAG_MOTION_SCORE = 0;

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        window.__DIAG_STREAM_READY = true;
        const video = document.querySelector('video');
        if (video) {
          (session)._remoteVideoTrack?.attach(video);
          video.play().catch(console.warn);
        }
        const audio = document.querySelector('audio') || document.createElement('audio');
        (session)._remoteAudioTrack?.attach(audio);
        audio.play().catch(console.warn);

        // Motion detection
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let prev = null;
        setInterval(() => {
          if (!video || video.paused) return;
          try {
            ctx.drawImage(video, 0, 0, 160, 120);
            const frame = ctx.getImageData(50, 65, 60, 40).data;
            if (prev) {
              let diff = 0;
              for (let i = 0; i < frame.length; i += 4) {
                const d = (Math.abs(frame[i]-prev[i]) + Math.abs(frame[i+1]-prev[i+1]) + Math.abs(frame[i+2]-prev[i+2])) / 3;
                if (d > 12) diff += d;
              }
              window.__DIAG_MOTION_SCORE = Math.min(100, Math.round((diff / (frame.length / 4)) * 1.5));
            }
            prev = new Uint8ClampedArray(frame);
          } catch(e) {}
        }, 150);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        window.__DIAG_SPEAKING = true;
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        window.__DIAG_SPEAKING = false;
      });

      await session.start();
    })()
  `);

  console.log('Waiting for WebRTC stream ready...');
  let streamReady = false;
  for (let i = 0; i < 40; i++) {
    await wait(500);
    streamReady = await evaluate('window.__DIAG_STREAM_READY');
    if (streamReady) {
      console.log('WebRTC stream attached!');
      break;
    }
  }

  if (!streamReady) {
    console.error('Stream not ready in 20s');
    ws.close();
    chromeProc.kill();
    return;
  }

  await wait(2000);

  // Command to speak
  console.log('Dispatching repeat(): "Hello Udbhav. Welcome to your placement interview. Let us begin."');
  await evaluate('window.__DIAG_SESSION.repeat("Hello Udbhav. Welcome to your placement interview. Let us begin.")');

  const scores = [];
  for (let i = 0; i < 24; i++) {
    await wait(250);
    const score = await evaluate('window.__DIAG_MOTION_SCORE');
    const speaking = await evaluate('window.__DIAG_SPEAKING');
    scores.push(score);
    if (i % 2 === 0) {
      console.log(`t=${(i * 0.25).toFixed(1)}s | speaking: ${speaking} | mouthMotionScore: ${score}%`);
    }
  }

  const maxScore = Math.max(...scores);
  console.log(`Peak Mouth Motion Score: ${maxScore}%`);

  await evaluate('window.__DIAG_SESSION.stop()');
  await wait(1000);
  ws.close();
  chromeProc.kill();
  return maxScore;
}

async function main() {
  const avatarId = '10ba14ab-3911-4b89-8dfd-86b5ba25876f';

  // Test with Emma's native voice: 45c47e6a-50a4-4dd1-9abe-b080b599e074
  await testWithVoice('Emma Native Female Voice (45c47e6a)', {
    mode: 'FULL',
    avatar_id: avatarId,
    avatar_persona: {
      voice_id: '45c47e6a-50a4-4dd1-9abe-b080b599e074',
      language: 'en',
    },
  });

  // Test with voice_agent: d59d90cb-1e5a-4056-82df-a541509dc8f4
  await testWithVoice('Emma Native Voice Agent (d59d90cb)', {
    mode: 'FULL',
    avatar_id: avatarId,
    voice_agent: {
      id: 'd59d90cb-1e5a-4056-82df-a541509dc8f4',
    },
  });
}

main().catch(console.error);

