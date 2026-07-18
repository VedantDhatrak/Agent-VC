import express from 'express';
import fs from 'fs';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/v1/chat/completions', async (req, res) => {
  const systemPrompt = fs.readFileSync('knowledgebase.txt', 'utf8');
  const messages = req.body.messages || [];
  const lastUserMsg = messages.reverse().find(m => m.role === 'user')?.content || '';
  
  const promptMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.reverse().filter(m => m.role !== 'system')
  ];

    try {
    console.log(`\n🧠 [Groq Brain]: Thinking about query: "${lastUserMsg}"`);

    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let isAborted = false;
      const controller = new AbortController();
      req.on('aborted', () => {
        console.log('🔌 [Groq Brain]: Connection aborted by client (User Interruption).');
        isAborted = true;
        controller.abort();
      });

      const stream = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: promptMessages,
        stream: true,
      }, { signal: controller.signal });
      
      for await (const chunk of stream) {
        if (isAborted) break;
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const sseChunk = {
            id: 'chatcmpl-mock',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: req.body.model,
            choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
          };
          res.write(`data: ${JSON.stringify(sseChunk)}\n\n`);
        }
      }

      if (!isAborted) {
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
      }
    } else {
      const result = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: promptMessages,
      });
      let reply = result.choices[0]?.message?.content || "I don't have that information.";
      console.log(`🧠 [Groq Brain]: Replying with: "${reply}"\n`);
      res.json({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model,
        choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }]
      });
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'APIUserAbortError') {
      return; // Handled silently since client disconnected
    }
    console.error('Groq AI Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate response' });
    }
  }
});

const PORT = 3334;
app.listen(PORT, () => {
  console.log(`🧠 [Mock Brain Server] Running on http://localhost:${PORT}/v1`);
});
