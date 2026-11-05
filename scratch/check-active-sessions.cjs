require('dotenv').config();

async function checkActiveSessions() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  const res = await fetch('https://api.liveavatar.com/v1/sessions?type=active', {
    method: 'GET',
    headers: { 'X-API-KEY': key },
  });
  const data = await res.json();
  console.log('Active sessions response:', JSON.stringify(data, null, 2));

  // If active sessions exist, stop every single one!
  const list = data?.data?.sessions || data?.data || [];
  if (Array.isArray(list) && list.length > 0) {
    for (const s of list) {
      console.log('Stopping active session:', s.session_id);
      const stopRes = await fetch('https://api.liveavatar.com/v1/sessions/stop', {
        method: 'POST',
        headers: {
          'X-API-KEY': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: s.session_id }),
      });
      const stopData = await stopRes.json();
      console.log('Stop result:', stopData);
    }
  } else {
    console.log('No active sessions found in list.');
  }

  // Also check historic to see total sessions created
  const histRes = await fetch('https://api.liveavatar.com/v1/sessions?type=historic', {
    method: 'GET',
    headers: { 'X-API-KEY': key },
  });
  const histData = await histRes.json();
  console.log('Historic sessions count:', (histData?.data?.sessions || histData?.data || []).length);
}

checkActiveSessions().catch(console.error);

