require('dotenv').config();

async function test() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();
  const voiceId = (process.env.HEYGEN_VOICE_ID || '').replace(/^["']|["']$/g, '').trim();

  console.log('--- TEST 1: Requesting FULL mode token ---');
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
  console.log('Token response:', tokenData.code, tokenData.message);

  if (tokenData?.data?.session_token) {
    const sessionToken = tokenData.data.session_token;
    console.log('--- Calling /v1/sessions/start with FULL session token ---');
    const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });
    const startData = await startRes.json();
    console.log('Start response status:', startRes.status);
    console.log('Start response data:', JSON.stringify(startData, null, 2));

    // Clean up session immediately
    console.log('--- Cleaning up session ---');
    await fetch('https://api.liveavatar.com/v1/sessions/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });
  }
}

test().catch(console.error);

