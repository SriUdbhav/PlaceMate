require('dotenv').config();

async function test() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  console.log('--- 1. Querying https://api.liveavatar.com/v1/avatars ---');
  try {
    const res1 = await fetch('https://api.liveavatar.com/v1/avatars', {
      headers: { 'X-API-KEY': key },
    });
    const d1 = await res1.json();
    console.log('LiveAvatar /v1/avatars response:', JSON.stringify(d1, null, 2));
  } catch (e) {
    console.log('LiveAvatar /v1/avatars error:', e.message);
  }

  console.log('--- 2. Querying https://api.liveavatar.com/v1/avatars/10ba14ab-3911-4b89-8dfd-86b5ba25876f ---');
  try {
    const res2 = await fetch('https://api.liveavatar.com/v1/avatars/10ba14ab-3911-4b89-8dfd-86b5ba25876f', {
      headers: { 'X-API-KEY': key },
    });
    const d2 = await res2.json();
    console.log('LiveAvatar specific avatar response:', JSON.stringify(d2, null, 2));
  } catch (e) {
    console.log('LiveAvatar specific avatar error:', e.message);
  }

  console.log('--- 3. Querying https://api.heygen.com/v2/avatars ---');
  try {
    const res3 = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': key },
    });
    const d3 = await res3.json();
    console.log('HeyGen /v2/avatars status:', res3.status);
    if (d3?.data?.avatars) {
      const match = d3.data.avatars.find(a => a.avatar_id.includes('10ba14ab') || a.avatar_name?.toLowerCase().includes('sarah') || a.avatar_name?.toLowerCase().includes('emma'));
      console.log('HeyGen match:', match);
      console.log('Total avatars:', d3.data.avatars.length);
    } else {
      console.log('HeyGen d3:', d3);
    }
  } catch (e) {
    console.log('HeyGen /v2/avatars error:', e.message);
  }
}

test().catch(console.error);

