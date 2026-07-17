import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
app.use(cors());
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

app.listen(port, () => {
  console.log(`[Token Server] Running on http://localhost:${port}/getToken`);
});
