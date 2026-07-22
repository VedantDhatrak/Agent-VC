import React, { useState, useEffect } from 'react';
import { MessageSquare, Zap, Settings, Send, Users, ShieldAlert, CheckCircle2, Smartphone } from 'lucide-react';


export const WhatsAppDashboard = () => {
  const [isOfficialEnabled, setIsOfficialEnabled] = useState(false);
  const [isUnofficialEnabled, setIsUnofficialEnabled] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [officialPhone, setOfficialPhone] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
 const [isSessionConnected, setIsSessionConnected] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  const API_BASE = '/api';

  const handleToggle = async (type) => {
    setLoadingAction(`toggle-${type}`);
    try {
      const endpoint = type === 'official' ? '/toggle-automation' : '/toggle-unofficial';
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (type === 'official') {
        setIsOfficialEnabled(data.currentState);
      } else {
        setIsUnofficialEnabled(data.currentState);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAction = async (action, endpoint, body) => {
    setLoadingAction(action);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      await res.json();
      alert(`Success: ${action} triggered!`);
    } catch (err) {
      console.error(err);
      alert(`Error triggering ${action}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchSessionStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/session-status`);
      const data = await res.json();
      setIsSessionConnected(data.connected);
      if (data.qrcode) {
        setQrCodeData(data.qrcode);
      } else {
        setQrCodeData(null);
      }
    } catch (err) {
      console.error("Failed to check session status:", err);
    }
  };
  useEffect(() => {
    fetchSessionStatus();
    const interval = setInterval(fetchSessionStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <>
        {/* Official Features */}
        <div className="glass-card app-card official-card wa-dashboard-card">
          <div className="wa-card-header title-header">
            <CheckCircle2 className="icon-green" size={24} />
            <h2 className="title" style={{fontSize: '1.5rem', marginBottom: 0}}>Official Meta</h2>
          </div>
          <p className="subtitle" style={{marginBottom: '1.5rem'}}>Manage Official Integrations</p>
          
          <div className="wa-feature-row">
            <div className="feature-info">
              <span className="feature-title">Automation Engine</span>
              <span className="feature-desc">Route webhook to n8n</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isOfficialEnabled} 
                onChange={() => handleToggle('official')} 
                disabled={loadingAction === 'toggle-official'}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="wa-feature-row">
            <div className="feature-info">
              <span className="feature-title">Bulk Messaging</span>
              <span className="feature-desc">Trigger n8n broadcast</span>
            </div>
            <button 
              className="wa-btn wa-btn-outline"
              onClick={() => handleAction('Bulk Campaign', '/trigger-bulk')}
              disabled={loadingAction === 'Bulk Campaign'}
            >
              <Users size={16} /> Trigger
            </button>
          </div>

          <div className="wa-feature-box mt-auto" style={{marginTop: 'auto', width: '100%', paddingTop: '1rem'}}>
            <span className="feature-title" style={{alignSelf: 'flex-start', marginBottom: '0.5rem'}}>Notification (Graph API)</span>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Phone number" 
                value={officialPhone}
                onChange={(e) => setOfficialPhone(e.target.value)}
                className="input-field"
              />
              <button 
                className="btn btn-primary"
                onClick={() => handleAction('Official Notification', '/send-official-notification', { phone: officialPhone })}
                disabled={loadingAction === 'Official Notification' || !officialPhone}
                style={{padding: '0.875rem', borderRadius: '12px'}}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Unofficial Features */}
        <div className="glass-card app-card unofficial-card wa-dashboard-card">
          <div className="wa-card-header title-header">
            <Zap className="icon-yellow" size={24} />
            <h2 className="title" style={{fontSize: '1.5rem', marginBottom: 0}}>Unofficial AI</h2>
          </div>
         <p className="subtitle" style={{marginBottom: '1.5rem'}}>Manage Baileys Integrations</p>
         <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <Smartphone size={16} color={isSessionConnected ? "var(--success)" : "var(--danger)"} />
            <span style={{fontSize: '0.9rem', color: isSessionConnected ? "var(--success)" : "var(--danger)"}}>
              {isSessionConnected ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}
            </span>
          </div>
          
          {!isSessionConnected && qrCodeData && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'}}>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Scan this QR code in WhatsApp</p>
              <img src={qrCodeData} alt="WhatsApp QR Code" style={{width: '150px', height: '150px', borderRadius: '8px', background: 'white', padding: '0.5rem'}} />
            </div>
          )}
          
          <div className="wa-feature-row">
            <div className="feature-info">
              <span className="feature-title">AI Auto-Reply</span>
              <span className="feature-desc">Local JSON parsing</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isUnofficialEnabled} 
                onChange={() => handleToggle('unofficial')}
                disabled={loadingAction === 'toggle-unofficial'}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="wa-feature-box mt-auto" style={{marginTop: 'auto', width: '100%', paddingTop: '1rem'}}>
            <span className="feature-title" style={{alignSelf: 'flex-start', marginBottom: '0.5rem'}}>Send OTP Verification</span>
            <div className="input-group" style={{flexDirection: 'row', gap: '0.5rem'}}>
              <input 
                type="text" 
                placeholder="Phone number"
                value={otpPhone}
                onChange={(e) => setOtpPhone(e.target.value)}
                className="input-field"
                style={{flex: 1}}
              />
              <button 
                className="btn btn-primary"
                style={{background: '#3b82f6', padding: '0.875rem', borderRadius: '12px'}}
                onClick={() => handleAction('OTP', '/send-otp', { phone: otpPhone })}
                disabled={loadingAction === 'OTP' || !otpPhone}
              >
                <ShieldAlert size={18} />
              </button>
            </div>
          </div>
        </div>
    </>
  );
};
