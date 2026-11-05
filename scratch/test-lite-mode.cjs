require('dotenv').config();

async function test() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();

  console.log('--- TEST: Requesting LITE mode token ---');
  const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
    method: 'POST',
    headers: {
      'X-API-KEY': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'LITE',
      avatar_id: avatarId,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('Token response:', tokenData);

  if (tokenData?.data?.session_token) {
    const sessionToken = tokenData.data.session_token;
    console.log('--- Calling /v1/sessions/start with LITE session token ---');
    const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });
    const startData = await startRes.json();
    console.log('Start response:', JSON.stringify(startData, null, 2));

    // Clean up
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

