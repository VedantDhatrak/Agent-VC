import React, { useState } from 'react';
import { 
  useVoiceAssistant, 
  BarVisualizer,
  RoomAudioRenderer,
  ControlBar,
  useParticipants,
  useLocalParticipant
} from '@livekit/components-react';
import { PhoneOff, Pause, Play } from 'lucide-react';

export function ActiveCallInterface({ onEndCall }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [isHeld, setIsHeld] = useState(false);

  const toggleHold = async () => {
    if (localParticipant) {
      if (isHeld) {
        await localParticipant.setMicrophoneEnabled(true);
        setIsHeld(false);
      } else {
        await localParticipant.setMicrophoneEnabled(false);
        setIsHeld(true);
      }
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Active Call</h2>
      
      <div className="status-indicator">
        <div className={`dot ${state === 'connected' ? (isHeld ? 'held' : 'connected') : 'connecting'}`}></div>
        <span>
          {state === 'connected' 
            ? (isHeld ? 'Call on Hold' : 'Agent Connected') 
            : 'Connecting to Agent...'}
        </span>
      </div>

      <div className={`visualizer-container ${isHeld ? 'disabled' : ''}`} style={{ opacity: isHeld ? 0.5 : 1 }}>
        {audioTrack && !isHeld ? (
          <BarVisualizer
            state={state}
            barCount={7}
            trackRef={audioTrack}
            style={{ width: '100%', height: '80px' }}
          />
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>
            {isHeld ? 'Audio paused while on hold' : 'Waiting for audio...'}
          </div>
        )}
      </div>

      {!isHeld && <RoomAudioRenderer />}
      
      {/* LiveKit ControlBar provides standard mic controls. We hide the default leave button to use our own. */}
      <ControlBar 
        style={{ marginBottom: '1.5rem', display: isHeld ? 'none' : 'flex' }} 
        controls={{ leave: false, microphone: true, camera: false, screenShare: false }} 
      />

      <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
        <button 
          className={`btn ${isHeld ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={toggleHold} 
          style={{ flex: 1 }}
        >
          {isHeld ? <Play /> : <Pause />}
          <span>{isHeld ? 'Resume' : 'Hold'}</span>
        </button>

        <button className="btn btn-danger" onClick={onEndCall} style={{ flex: 1 }}>
          <PhoneOff />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
