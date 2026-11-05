require('dotenv').config();

async function printHistoric() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  const res = await fetch('https://api.liveavatar.com/v1/sessions?type=historic', {
    headers: { 'X-API-KEY': key }
  });
  const data = await res.json();
  console.log('Total historic sessions:', data.data.count);
  for (const s of data.data.results) {
    console.log(`Session ${s.id}: created=${s.created_at}, duration=${s.duration}s, status=${s.status}`);
  }
}

printHistoric().catch(console.error);

