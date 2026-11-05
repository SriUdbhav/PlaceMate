require('dotenv').config();

async function listAndCleanSessions() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  console.log('Querying GET https://api.liveavatar.com/v1/sessions...');
  const res = await fetch('https://api.liveavatar.com/v1/sessions', {
    method: 'GET',
    headers: {
      'X-API-KEY': key,
    },
  });

  console.log('Sessions list status:', res.status);
  const data = await res.json();
  console.log('Sessions response:', JSON.stringify(data, null, 2));

  // If there are sessions with status active or in_progress, stop them
  if (Array.isArray(data?.data?.sessions)) {
    for (const s of data.data.sessions) {
      console.log(`Session ${s.session_id}: status = ${s.status}`);
      if (s.status === 'ACTIVE' || s.status === 'RUNNING' || s.status === 'IN_PROGRESS' || s.status === 'NEW') {
        console.log(`Attempting to stop session ${s.session_id}...`);
        const stopRes = await fetch('https://api.liveavatar.com/v1/sessions/stop', {
          method: 'POST',
          headers: {
            'X-API-KEY': key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: s.session_id }),
        });
        const stopData = await stopRes.json();
        console.log(`Stop response for ${s.session_id}:`, stopData);
      }
    }
  }
}

listAndCleanSessions().catch(console.error);

