require('dotenv').config();

async function testHeyGenStreamingToken() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();

  console.log('Testing https://api.heygen.com/v1/streaming.create_token with key:', key);
  try {
    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    console.log('HeyGen streaming.create_token response:', res.status, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testHeyGenStreamingToken().catch(console.error);

