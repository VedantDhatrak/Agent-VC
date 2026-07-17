import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { cli, voice, defineAgent } from '@livekit/agents';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';

dotenv.config();

import { tts } from '@livekit/agents';
import { AudioFrame } from '@livekit/rtc-node';

class GoogleRESTChunkedStream extends tts.ChunkedStream {
  label = 'google_rest_tts';
  async run() {
    const text = this.inputText;
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
          audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 }
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const pcmData = Buffer.from(data.audioContent, 'base64');
      const samplesPerChannel = pcmData.length / 2;
      const frame = new AudioFrame(pcmData, 24000, 1, samplesPerChannel);
      
      this.queue.put({
        frame,
        text: text,
        requestId: 'google_rest_tts_req'
      });
    } catch (e) {
      console.error('❌ [Google TTS Error]:', e);
    } finally {
      this.queue.put(tts.SynthesizeStream.END_OF_STREAM);
    }
  }
}

class GoogleRESTTTS extends tts.TTS {
  label = 'google_rest_tts';
  constructor() {
    super(24000, 1, { streaming: false });
  }
  synthesize(text) {
    return new GoogleRESTChunkedStream(text, this);
  }
  stream() {
    return new tts.StreamAdapterWrapper(this);
  }
}

export default defineAgent({
  entry: async (ctx) => {
    console.log('[Agent] Connecting to room...');
    await ctx.connect();
    console.log(`[Agent] Successfully connected to room: ${ctx.room.name}`);

    // Brain: Mock JSON Brain (via OpenAI Plugin overriding baseURL)
    const llm = new openai.LLM({
      baseURL: 'http://localhost:3334/v1/',
      apiKey: 'dummy-key',
      model: 'mock-model', 
    });

    // Ears: ElevenLabs Speech-to-Text
    const stt = new elevenlabs.STT({
      apiKey: process.env.ELEVENLABS_API_KEY,
      model: 'scribe_v2_realtime',
      serverVad: {}, // Required to force ElevenLabs to commit transcripts and emit isFinal
    });

    // Mouth: Google REST Text-to-Speech
    const customTts = new GoogleRESTTTS();

    const agent = new voice.Agent({
      vad: await silero.VAD.load(),
      stt: stt,
      llm: llm,
      tts: customTts,
      instructions: 'You are a helpful voice assistant.',
    });

    // === ADD DETAILED LOGGING ===
    const session = new voice.AgentSession();

    session.on('error', (err) => {
      console.error('❌ [Agent Error]:', err.message || err);
    });

    session.on('user_started_speaking', () => {
      console.log('🗣️ [User]: Started speaking...');
    });

    session.on('user_stopped_speaking', () => {
      console.log('🤫 [User]: Stopped speaking.');
    });

    session.on('agent_state_changed', (state) => {
      if (state.newState === 'speaking') {
        console.log('🤖 [Agent]: Started responding...');
      } else if (state.newState === 'listening') {
        console.log('✅ [Agent]: Finished responding and is listening.');
      } else {
        console.log(`🤖 [Agent State]: ${state.newState}`);
      }
    });

    session.on('conversation_item_added', (item) => {
      try {
        console.log(`🧠 [Conversation Item]:`, JSON.stringify(item));
        if (item?.role === 'assistant' || item?.item?.role === 'assistant') {
          const content = item?.content || item?.item?.content;
          if (content) {
             console.log(`🧠 [LLM Output Content]: "${JSON.stringify(content)}"`);
          }
        }
      } catch (e) {
        console.log('Error parsing conversation item', e);
      }
    });

    session.on('agent_speech_synthesized', (event) => {
      console.log(`🔊 [TTS Audio Synthesized]`);
    });
    
    session.on('agent_speech_started', () => {
      console.log('🗣️ [Agent Speech Started]: Agent is now speaking.');
    });

    session.on('agent_speech_finished', () => {
      console.log('🗣️ [Agent Speech Finished]: Agent stopped speaking.');
    });

    session.on('user_input_transcribed', (event) => {
      if (event.isFinal) {
        console.log(`📝 [STT Final]: "${event.transcript}"`);
      } else {
        process.stdout.write(`\r✍️ [STT Interim]: "${event.transcript}"`);
      }
    });
    
    ctx.room.on('trackSubscribed', (track, pub, participant) => {
      console.log(`🔗 [Room]: Subscribed to ${participant.identity}'s track: ${pub.source}`);
    });

    ctx.room.on('disconnected', () => {
      console.log('🔌 [Room]: Agent disconnected from room.');
    });
    // ============================

    session.start({
      agent,
      room: ctx.room,
    });
    console.log('🚀 [Agent]: Successfully started in room!');
  },
});

cli.runApp({
  agent: fileURLToPath(import.meta.url),
});
