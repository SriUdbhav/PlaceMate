require('dotenv').config();

async function testTokenVariations() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();

  const variations = [
    { mode: 'FULL', avatar_id: avatarId },
    { mode: 'FULL', avatar_id: avatarId, avatar_persona: { language: 'en' } },
    { mode: 'FULL', avatar_id: avatarId, avatar_persona: { voice_id: '45c47e6a-50a4-4dd1-9abe-b080b599e074' } }, // Emma default voice
  ];

  for (const v of variations) {
    console.log('Testing variation:', JSON.stringify(v));
    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
    const tokenData = await tokenRes.json();
    if (tokenData?.data?.session_token) {
      const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.data.session_token}`,
          'Content-Type': 'application/json',
        },
      });
      const startData = await startRes.json();
      console.log('Start status:', startRes.status, startData.code, startData.message);
    }
  }
}

testTokenVariations().catch(console.error);

