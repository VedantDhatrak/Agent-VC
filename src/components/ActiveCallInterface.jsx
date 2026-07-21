
import React, { useEffect, useRef } from 'react';
import { 
  useVoiceAssistant, 
  BarVisualizer,
  RoomAudioRenderer,
  ControlBar
} from '@livekit/components-react';
import { PhoneOff } from 'lucide-react';

export function ActiveCallInterface({ onEndCall }) {
  const { state, audioTrack } = useVoiceAssistant();
  const greetingPlayed = useRef(false);

  useEffect(() => {
    if (!greetingPlayed.current) {
      greetingPlayed.current = true;
      // Fetch and play hardcoded greeting
      fetch('http://localhost:3333/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'नमस्ते, क्या मैं वेदांत से बात कर रहा हूँ?' })
      })
      .then(res => res.json())
      .then(data => {
        if (data.audioContent) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
          audio.play().catch(e => console.error('Audio play error:', e));
        }
      })
      .catch(err => console.error('TTS fetch error:', err));
    }
  }, []);

  const getAgentStatusText = (agentState) => {
    switch (agentState) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      case 'initializing': return 'Initializing...';
      case 'listening': return 'Listening...';
      case 'thinking': return 'Processing...';
      case 'speaking': return 'Speaking...';
      case 'connected': return 'Connected';
      default: return agentState || 'Waiting...';
    }
  };

  const isWorking = state === 'listening' || state === 'thinking' || state === 'speaking';

  return (
    <div className="glass-card app-card" style={{ alignItems: 'center' }}>
      
      <div className="status-indicator" style={{ marginBottom: '2rem', marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className={`dot ${state}`} style={{ 
          background: state === 'speaking' ? '#10b981' : state === 'thinking' ? '#f59e0b' : state === 'listening' ? '#3b82f6' : '#6b7280'
        }}></div>
        <span style={{ fontWeight: 500, fontSize: '1.1rem' }}>
          {getAgentStatusText(state)}
        </span>
      </div>

      <div className="visualizer-container" style={{ width: '100%', marginBottom: '2rem' }}>
        {audioTrack ? (
          <BarVisualizer
            state={state}
            barCount={7}
            trackRef={audioTrack}
            style={{ width: '100%', height: '80px' }}
          />
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Waiting for audio...
          </div>
        )}
      </div>

      <RoomAudioRenderer />
      
      <ControlBar 
        style={{ marginBottom: '1.5rem' }} 
        controls={{ leave: false, microphone: true, camera: false, screenShare: false }} 
      />

      <button className="btn btn-danger" onClick={onEndCall} style={{ width: '100%', maxWidth: '300px' }}>
        <PhoneOff />
        <span>End Call</span>
      </button>
    </div>
  );
}
