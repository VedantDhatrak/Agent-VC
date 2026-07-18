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
  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Sarvam API Key not found in .env' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        inputs: [text],
        target_language_code: 'hi-IN',
        speaker: 'shubh',
        pace: 1.2,
        model: 'bulbul:v3'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Sarvam TTS failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.audios && data.audios.length > 0) {
      res.json({ audioContent: data.audios[0] });
    } else {
      throw new Error('No audio returned from Sarvam AI');
    }
  } catch (error) {
    console.error('Error in TTS:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`[Token Server] Running on http://localhost:${port}/getToken`);
});
