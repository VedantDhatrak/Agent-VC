import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { cli, voice, defineAgent } from '@livekit/agents';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import * as deepgram from '@livekit/agents-plugin-deepgram';

dotenv.config();

import { tts } from '@livekit/agents';
import { AudioFrame } from '@livekit/rtc-node';

// Removed custom Google TTS

export default defineAgent({
  entry: async (ctx) => {
    console.log('[Agent] Connecting to room...');
    await ctx.connect();
    console.log(`[Agent] Successfully connected to room: ${ctx.room.name}`);

    console.log('[Agent] Initializing LLM...');
    // Brain: Mock JSON Brain (via OpenAI Plugin overriding baseURL)
    const llm = new openai.LLM({
      baseURL: 'http://localhost:3334/v1/',
      apiKey: 'dummy-key',
      model: 'mock-model', 
    });

    console.log('[Agent] Initializing STT...');
    // Ears: Deepgram Speech-to-Text
    const stt = new deepgram.STT({
      apiKey: process.env.DEEPGRAM_API_KEY,
    });

    console.log('[Agent] Initializing TTS...');
    // Mouth: Deepgram Text-to-Speech
    const dgTts = new deepgram.TTS({
      model: 'aura-asteria-en',
      apiKey: process.env.DEEPGRAM_API_KEY,
    });

    console.log('[Agent] Loading VAD model...');
    const vadModel = await silero.VAD.load({
      minSilenceDuration: 250, // Optimize STT latency by reducing silence wait time
    });

    console.log('[Agent] Creating Agent instance...');
    const agent = new voice.Agent({
      vad: vadModel,
      stt: stt,
      llm: llm,
      tts: dgTts,
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
      }
    });

    ctx.room.on('trackSubscribed', (track, pub, participant) => {
      console.log(`🔗 [Room]: Subscribed to ${participant.identity}'s track: ${pub.source}`);
    });

    ctx.room.on('disconnected', () => {
      console.log('🔌 [Room]: Agent disconnected from room.');
    });
    // ============================

    await session.start({
      agent,
      room: ctx.room,
    });
    console.log('🚀 [Agent]: Successfully started in room!');
  },
});

cli.runApp({
  agent: fileURLToPath(import.meta.url),
});
