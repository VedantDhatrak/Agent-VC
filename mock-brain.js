import express from 'express';
import fs from 'fs';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const kb = JSON.parse(fs.readFileSync('knowledgebase.json', 'utf8'));

app.post('/v1/chat/completions', (req, res) => {
  const messages = req.body.messages || [];
  const lastUserMsg = messages.reverse().find(m => m.role === 'user')?.content || '';
  const lowerMsg = lastUserMsg.toLowerCase();

  let reply = kb.default;
  for (const [key, value] of Object.entries(kb)) {
    if (key !== 'default' && lowerMsg.includes(key)) {
      reply = value;
      break;
    }
  }

  console.log(`\n🧠 [Mock Brain]: Received query: "${lastUserMsg}"`);
  console.log(`🧠 [Mock Brain]: Replying with: "${reply}"\n`);

  if (req.body.stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Split reply by sentences or fallback to the whole reply
    const chunks = reply.match(/[^.!?]+[.!?]*/g) || [reply];
    let i = 0;

    const interval = setInterval(() => {
      if (i < chunks.length) {
        const chunk = {
          id: 'chatcmpl-mock',
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: req.body.model,
          choices: [{ index: 0, delta: { content: (i > 0 ? ' ' : '') + chunks[i].trim() }, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        i++;
      } else {
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
        clearInterval(interval);
      }
    }, 100); // stream one sentence every 100ms
  } else {
    res.json({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: req.body.model,
      choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }]
    });
  }
});

const PORT = 3334;
app.listen(PORT, () => {
  console.log(`🧠 [Mock Brain Server] Running on http://localhost:${PORT}/v1`);
});
