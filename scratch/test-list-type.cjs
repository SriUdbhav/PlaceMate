require('dotenv').config();

async function listSessionsWithType() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  for (const t of ['FULL', 'LITE', 'ALL', 'live', 'full', 'lite', 'avatar']) {
    const res = await fetch(`https://api.liveavatar.com/v1/sessions?type=${t}`, {
      method: 'GET',
      headers: { 'X-API-KEY': key },
    });
    const data = await res.json();
    console.log(`type=${t} -> status: ${res.status}, code: ${data.code}, msg: ${data.message}`);
    if (data.data) {
      console.log(`Data for ${t}:`, JSON.stringify(data.data, null, 2));
    }
  }
}

listSessionsWithType().catch(console.error);

