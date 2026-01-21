import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  gemini?: string;
  grok?: string;
  azure?: string;
}

const BRITTNEY_API_URL = 'http://localhost:11435';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${BRITTNEY_API_URL}/config`);
        if (response.ok) {
          const config = await response.json();
          // We don't get the actual keys back for security, 
          // but we can merge with local storage if available
          const localKeys = localStorage.getItem('brittney_api_keys');
          if (localKeys) {
            setApiKeys(JSON.parse(localKeys));
          }
        }
      } catch (e) {
        console.error('Failed to fetch brittney config', e);
        // Fallback to local storage only
        const localKeys = localStorage.getItem('brittney_api_keys');
        if (localKeys) {
          setApiKeys(JSON.parse(localKeys));
        }
      }
    };

    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError(null);
    try {
      // 1. Save to LocalStorage for current session/persistence
      localStorage.setItem('brittney_api_keys', JSON.stringify(apiKeys));
      
      // 2. Sync with Brittney Service
      const response = await fetch(`${BRITTNEY_API_URL}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKeys }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync with Brittney Service');
      }

      // 3. Dispatch event for other components
      window.dispatchEvent(new CustomEvent('brittney-config-updated', { detail: { apiKeys } }));
      
      setSaved(true);
      setTimeout(() => {
          setSaved(false);
          onClose();
      }, 1000);
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    }
  };

  const handleInputChange = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <style>{`
        .settings-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          font-family: 'Inter', sans-serif;
        }
        .settings-content {
          background: #1a1a2e;
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 20px;
          width: 500px;
          max-width: 90vw;
          padding: 30px;
          box-shadow: 0 0 40px rgba(74, 222, 128, 0.2);
          color: white;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .settings-header h2 {
          margin: 0;
          color: #4ade80;
          font-size: 24px;
        }
        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 24px;
          cursor: pointer;
        }
        .settings-section {
          margin-bottom: 20px;
        }
        .settings-section h3 {
          font-size: 14px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 1px;
          margin-bottom: 15px;
        }
        .input-group {
          margin-bottom: 15px;
        }
        .input-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .input-group input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px 15px;
          color: white;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-group input:focus {
          border-color: #4ade80;
        }
        .save-btn {
          width: 100%;
          background: #4ade80;
          color: #1a1a2e;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s;
        }
        .save-btn:hover {
          background: #22c55e;
        }
        .save-btn:active {
          transform: scale(0.98);
        }
        .success-msg {
            color: #4ade80;
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
        }
      `}</style>
      
      <div className="settings-content">
        <div className="settings-header">
          <h2>Hololand Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-section">
          <h3>Cloud AI Integration</h3>
          
          <div className="input-group">
            <label>OpenAI API Key</label>
            <input 
              type="password" 
              placeholder="sk-..." 
              value={apiKeys.openai || ''}
              onChange={(e) => handleInputChange('openai', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Anthropic API Key</label>
            <input 
              type="password" 
              placeholder="sk-ant-..." 
              value={apiKeys.anthropic || ''}
              onChange={(e) => handleInputChange('anthropic', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Google Gemini API Key</label>
            <input 
              type="password" 
              placeholder="AIza..." 
              value={apiKeys.google || apiKeys.gemini || ''}
              onChange={(e) => {
                handleInputChange('google', e.target.value);
                handleInputChange('gemini', e.target.value);
              }}
            />
          </div>

          <div className="input-group">
            <label>xAI Grok API Key</label>
            <input 
              type="password" 
              placeholder="xai-..." 
              value={apiKeys.grok || ''}
              onChange={(e) => handleInputChange('grok', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Azure OpenAI API Key</label>
            <input 
              type="password" 
              placeholder="key..." 
              value={apiKeys.azure || ''}
              onChange={(e) => handleInputChange('azure', e.target.value)}
            />
          </div>
        </div>

        {error && <div className="error-msg" style={{ color: '#ff4444', marginBottom: '15px', fontSize: '14px' }}>{error}</div>}

        <button className="save-btn" onClick={handleSave}>
          {saved ? 'Settings Saved!' : 'Save Configuration'}
        </button>
        {saved && <div className="success-msg">Configurations updated successfully.</div>}
      </div>
    </div>
  );
};
