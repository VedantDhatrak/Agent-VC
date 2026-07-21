import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = 3333;

const WEBHOOK_VERIFY_TOKEN = "my_secret_test_token_2026"; 
const META_ACCESS_TOKEN = "EAAMHg320jNABR5BAsxqUWiPCDmekkdXlMkZA9xZB3u8bmuZBt9aiTp36D9eOM2CT4nIgE0OEOpUdOMrHYZAu4ZBc9rcZBEvCSBherwY5alIdzn1j7vCvuT4zDq4V0ZB84ZAGGyJQeVIH00Uz4uQ2zj2PVXRy0ZBo3ZCoTonBvzeDrWP0uEzEXUPX3mpzENZA0mf77Q80gZDZD";
const PHONE_NUMBER_ID = "1127963237074602";

let isAutomationEnabled = false;       // Official Meta Engine Switch
let isUnofficialAutoEnabled = false;   // New Unofficial Baileys Engine Switch

function processJsonLLM(userText) {
    try {
        const filePath = path.join(__dirname, 'knowledge_llm.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        const kb = JSON.parse(fileData);
        const cleanText = userText.toLowerCase().trim();

        for (const entry of kb.responses) {
            for (const keyword of entry.keywords) {
                if (cleanText.includes(keyword.toLowerCase())) {
                    return entry.reply;
                }
            }
        }
        return kb.default_fallback;
    } catch (error) {
        console.error("⚠️ Error reading JSON format:", error.message);
        return "System logic exception. We are looking into this.";
    }
}

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

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
            console.log('✅ Webhook Verified Successfully!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    let body = req.body;
    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            let message = body.entry[0].changes[0].value.messages[0];
            let customerPhone = message.from; 
            
            if (message.type === 'text') {
                let userText = message.text.body;
                console.log(` Meta Intercepted text from ${customerPhone}: "${userText}"`);

                if (!isAutomationEnabled) {
                    console.log(`⏭️ Official AI Automation engine is OFF. Skipping n8n router execution.`);
                    return res.sendStatus(200);
                }

                let jsonRules = [];
                let defaultFallback = "I'm not quite sure about that request.";
                try {
                    const filePath = path.join(__dirname, 'knowledge_llm.json');
                    const fileData = fs.readFileSync(filePath, 'utf8');
                    const kb = JSON.parse(fileData);
                    jsonRules = kb.responses;
                    defaultFallback = kb.default_fallback;
                } catch (e) {}

                try {
                    await axios.post('http://localhost:5678/webhook/automated-message', {
                        customer_phone: customerPhone,
                        user_message: userText,
                        knowledge_base_rules: jsonRules,
                        fallback_text: defaultFallback
                    });
                } catch (n8nError) {
                    console.error('⚠️ n8n node is not actively listening:', n8nError.message);
                }
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.post('/baileys-webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log("📦 Incoming Webhook Body:", JSON.stringify(body, null, 2));

        const event = (body.event || "").toUpperCase().replace(/\./g, "_");

        if (event === "MESSAGES_UPSERT" && body.data && body.data.message) {
            const messageData = body.data;
            const isFromMe = messageData.key.fromMe;
            
            let userText = messageData.message.conversation || messageData.message.extendedTextMessage?.text || "";
            let customerPhone = messageData.key.remoteJid.split('@')[0];

            if (userText && !isFromMe) {
                console.log(`📩 Unofficial Intercepted text via Baileys from ${customerPhone}: "${userText}"`);

                if (!isUnofficialAutoEnabled) {
                    console.log(`⏭️ Unofficial AI Automation is turned OFF. Skipping automatic text reply.`);
                    return res.sendStatus(200);
                }

                const matchedReply = processJsonLLM(userText);
                console.log(`🤖 Matched KB Reply: "${matchedReply}". Blasting back via Baileys...`);

                await axios.post('http://localhost:8080/message/sendText/mixoop_whatsapp_session', {
                    "number": customerPhone,
                    "text": matchedReply
                }, {
                    headers: { 'Content-Type': 'application/json', 'apikey': 'session_secure_token_123' }
                });
                console.log(`🚀 Unofficial automated reply sent successfully to ${customerPhone}!`);
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("⚠️ Baileys automated parsing error:", err.message);
        res.sendStatus(200);
    }
});

app.post('/api/send-official-notification', async (req, res) => {
    let { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: "Missing destination phone parameter." });
    }

    phone = phone.toString().replace(/\D/g, '');
    console.log(`💼 Sending PURE OFFICIAL Meta Notification directly via Graph API to: ${phone}`);

    const pureMetaPayload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": "jaspers_market_order_confirmation_v1",
            "language": {
                "code": "en_US"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": "Customer Name" },
                        { "type": "text", "text": "MIXOOP-99882" },
                        { "type": "text", "text": "Within 5 Mins" }
                    ]
                }
            ]
        }
    };

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
            pureMetaPayload,
            {
                headers: {
                    'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('🚀 Pure Official Meta notification successfully delivered to Meta servers!');
        return res.status(200).json({ success: true, meta_data: response.data });
    } catch (error) {
        console.error('❌ Direct Meta API Error:', error.response?.data || error.message);
        return res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
});

app.post('/api/trigger-bulk', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:5678/webhook/bulk-campaign', req.body);
        return res.status(200).json({ success: true, message: "n8n bulk processing started.", data: response.data });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/toggle-automation', (req, res) => {
    isAutomationEnabled = !isAutomationEnabled;
    return res.status(200).json({ success: true, currentState: isAutomationEnabled });
});

app.post('/api/toggle-unofficial', (req, res) => {
    isUnofficialAutoEnabled = !isUnofficialAutoEnabled;
    console.log(`🎛️ Unofficial Automation Mode toggled manually to: ${isUnofficialAutoEnabled ? 'ON' : 'OFF'}`);
    return res.status(200).json({ success: true, currentState: isUnofficialAutoEnabled });
});

app.post('/api/send-otp', async (req, res) => {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Missing destination phone parameter." });
    phone = phone.toString().replace(/\D/g, '');
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔑 Generated validation code [${generatedOtp}] for customer: ${phone}`);

    try {
        const response = await axios.post('http://localhost:8080/message/sendText/mixoop_whatsapp_session', {
            "number": phone, "text": `Your Mixoop verification code is: ${generatedOtp}.`
        }, { headers: { 'Content-Type': 'application/json', 'apikey': 'session_secure_token_123' }, timeout: 10000 });
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
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
