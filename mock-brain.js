import express from 'express';
import fs from 'fs';
import cors from 'cors';
import puterLib from '@heyputer/puter.js';
import dotenv from 'dotenv';

dotenv.config();
const puter = puterLib.default || puterLib;
if (process.env.PUTER_AUTH_TOKEN) {
  puter.setAuthToken(process.env.PUTER_AUTH_TOKEN);
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/v1/chat/completions', async (req, res) => {
  const systemPrompt = fs.readFileSync('knowledgebase.txt', 'utf8');
  const messages = req.body.messages || [];
  const lastUserMsg = messages.reverse().find(m => m.role === 'user')?.content || '';
  
  const promptMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.reverse() // reverse back to original order
  ];

  try {
    console.log(`\n🧠 [Puter Brain]: Thinking about query: "${lastUserMsg}"`);

    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await puter.ai.chat(promptMessages, { stream: true });
      
      for await (const chunk of stream) {
        if (chunk?.text) {
          const sseChunk = {
            id: 'chatcmpl-mock',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: req.body.model,
            choices: [{ index: 0, delta: { content: chunk.text }, finish_reason: null }]
          };
          res.write(`data: ${JSON.stringify(sseChunk)}\n\n`);
        }
      }

      const endChunk = {
        id: 'chatcmpl-mock',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
      };
      res.write(`data: ${JSON.stringify(endChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await puter.ai.chat(promptMessages);
      let reply = result.message?.content || "I don't have that information.";
      console.log(`🧠 [Puter Brain]: Replying with: "${reply}"\n`);
      res.json({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model,
        choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }]
      });
    }
  } catch (error) {
    console.error('Puter AI Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

const PORT = 3334;
app.listen(PORT, () => {
  console.log(`🧠 [Mock Brain Server] Running on http://localhost:${PORT}/v1`);
});
