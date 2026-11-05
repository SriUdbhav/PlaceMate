require('dotenv').config();

async function testLite() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();

  console.log('Testing LITE mode token creation...');
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
  console.log('Token response:', tokenData.code, tokenData.message);
  if (tokenData?.data?.session_token) {
    const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.data.session_token}`,
        'Content-Type': 'application/json',
      },
    });
    const startData = await startRes.json();
    console.log('Start status for LITE:', startRes.status, startData);
  }
}

testLite().catch(console.error);

