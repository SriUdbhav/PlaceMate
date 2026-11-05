require('dotenv').config();

async function checkHeyGen() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();
  const voiceId = (process.env.HEYGEN_VOICE_ID || '').replace(/^["']|["']$/g, '').trim();

  console.log('--- Step 1: Check Token API ---');
  console.log('Using Avatar ID:', avatarId);
  console.log('Using Voice ID:', voiceId);

  const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
    method: 'POST',
    headers: {
      'X-API-KEY': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'FULL',
      avatar_id: avatarId,
      avatar_persona: {
        voice_id: voiceId,
        language: 'en',
      },
    }),
  });

  const tokenData = await tokenRes.json();
  console.log('Token response:', JSON.stringify(tokenData, null, 2));

  if (!tokenData?.data?.session_token) {
    console.log('Could not get session token');
    return;
  }

  const token = tokenData.data.session_token;

  console.log('\n--- Step 2: Test session/start with token ---');
  const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const startData = await startRes.json();
  console.log('Start status:', startRes.status);
  console.log('Start response:', JSON.stringify(startData, null, 2));

  // If session started, stop it cleanly
  if (startRes.ok && startData?.data) {
    console.log('\n--- Step 3: Clean up session ---');
    const stopRes = await fetch('https://api.liveavatar.com/v1/sessions/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Stop status:', stopRes.status);
  }
}

checkHeyGen().catch(console.error);

