require('dotenv').config();

async function testSandbox() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();
  const voiceId = (process.env.HEYGEN_VOICE_ID || '').replace(/^["']|["']$/g, '').trim();

  for (const opt of [
    { is_sandbox: true },
    { sandbox: true },
    { mode: 'FULL', is_sandbox: true },
  ]) {
    console.log('Testing payload option:', JSON.stringify(opt));
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
        ...opt
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
      console.log('Start status with option:', startRes.status, startData);
    }
  }
}

testSandbox().catch(console.error);

