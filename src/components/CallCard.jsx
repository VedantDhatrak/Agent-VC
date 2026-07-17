import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';

export function CallCard({ onStartCall }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch token from our local backend
      const response = await fetch('http://localhost:3333/getToken?roomName=my-ai-room');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch token');
      }

      if (data.url && data.token) {
        onStartCall(data.url, data.token);
      } else {
        throw new Error('Invalid response from server (missing url or token)');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h1 className="title">AI Voice Assistant</h1>
      <p className="subtitle">Start a bidirectional real-time conversation</p>
      
      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <button 
        className="btn btn-primary" 
        onClick={handleStart} 
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? (
          <Loader2 className="icon-pulse" />
        ) : (
          <Phone className="icon-pulse" />
        )}
        <span>{loading ? 'Connecting...' : 'Start Call'}</span>
      </button>
      
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Make sure the backend server (port 3333) is running!
      </p>
    </div>
  );
}
