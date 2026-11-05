require('dotenv').config();

async function checkAccount() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  for (const ep of ['/v1/user', '/v1/account', '/v1/credits', '/v1/usage', '/v1/me', '/v1/sessions?type=historic']) {
    try {
      const res = await fetch(`https://api.liveavatar.com${ep}`, {
        headers: { 'X-API-KEY': key }
      });
      const data = await res.json();
      console.log(`${ep} -> status ${res.status}:`, JSON.stringify(data).slice(0, 200));
    } catch (e) {
      console.log(`${ep} failed:`, e.message);
    }
  }
}

checkAccount().catch(console.error);

