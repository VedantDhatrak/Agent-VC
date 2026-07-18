import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = 3333;

app.get('/getToken', async (req, res) => {
  const roomName = req.query.roomName || 'my-ai-room';
  const participantName = req.query.participantName || 'user-' + Math.floor(Math.random() * 10000);

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Server misconfigured: LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required in .env.' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });
    
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    const token = await at.toJwt();
    return res.json({ token, url: process.env.LIVEKIT_URL });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Deepgram API Key not found in .env' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Deepgram TTS failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    res.json({ audioContent: base64Audio });
  } catch (error) {
    console.error('Error in TTS:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`[Token Server] Running on http://localhost:${port}/getToken`);
});
