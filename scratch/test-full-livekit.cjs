require('dotenv').config();
const { Room, RoomEvent } = require('livekit-client');

async function test() {
  const key = (process.env.HEYGEN_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const avatarId = (process.env.HEYGEN_AVATAR_ID || '').replace(/^["']|["']$/g, '').trim();
  const voiceId = (process.env.HEYGEN_VOICE_ID || '').replace(/^["']|["']$/g, '').trim();

  console.log('1. Creating FULL token...');
  const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'FULL',
      avatar_id: avatarId,
      avatar_persona: {
        voice_id: voiceId,
        language: 'en',
      },
    }),
  });
  const tokenData = await tokenRes.json();
  const sessionToken = tokenData.data.session_token;

  console.log('2. Starting session...');
  const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
  });
  const startData = await startRes.json();
  const { livekit_url, livekit_client_token } = startData.data;

  console.log('3. Connecting Room to LiveKit:', livekit_url);
  const room = new Room();

  room.on(RoomEvent.Connected, () => {
    console.log('>>> Room Connected! Local participant:', room.localParticipant.identity);
    console.log('>>> Remote participants:', Array.from(room.remoteParticipants.keys()));
  });

  room.on(RoomEvent.ParticipantConnected, (p) => {
    console.log('>>> ParticipantConnected:', p.identity);
  });

  room.on(RoomEvent.TrackSubscribed, (track, pub, p) => {
    console.log('>>> TrackSubscribed from', p.identity, 'kind:', track.kind);
  });

  room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
    const text = Buffer.from(payload).toString('utf8');
    console.log('>>> DataReceived on topic:', topic, 'from:', participant?.identity, 'data:', text);
  });

  await room.connect(livekit_url, livekit_client_token);

  // Wait 3 seconds for HeyGen participant to appear
  await new Promise(r => setTimeout(r, 4000));

  console.log('>>> Room state:', room.state);
  console.log('>>> Remote participants now:', Array.from(room.remoteParticipants.keys()));

  // Send avatar.speak_text on agent-control topic
  console.log('4. Publishing avatar.speak_text on topic: agent-control');
  const payload = {
    event_id: 'test-event-1',
    event_type: 'avatar.speak_text',
    text: 'Hello Udbhav. Welcome to your placement interview. Let us begin.',
  };
  const data = Buffer.from(JSON.stringify(payload));
  await room.localParticipant.publishData(data, {
    reliable: true,
    topic: 'agent-control',
  });
  console.log('>>> Published repeat command successfully.');

  // Wait 10 seconds to observe server response / events
  console.log('5. Waiting 10s for events...');
  await new Promise(r => setTimeout(r, 10000));

  // Also test avatar.speak_response
  console.log('6. Publishing avatar.speak_response on topic: agent-control');
  const payload2 = {
    event_id: 'test-event-2',
    event_type: 'avatar.speak_response',
    text: 'Hello Udbhav. Welcome to your placement interview. Let us begin.',
  };
  await room.localParticipant.publishData(Buffer.from(JSON.stringify(payload2)), {
    reliable: true,
    topic: 'agent-control',
  });

  await new Promise(r => setTimeout(r, 10000));

  console.log('7. Disconnecting room & stopping session');
  room.disconnect();
  await fetch('https://api.liveavatar.com/v1/sessions/stop', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
  });
  console.log('Done');
}

test().catch(console.error);

