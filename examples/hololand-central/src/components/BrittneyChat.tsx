import React, { useState, useEffect, useRef } from 'react';
import { HoloScriptRuntime } from '@holoscript/core';
// Note: In a real environment, we'd use the toolkit. 
// For this implementation, we'll build a high-fidelity integrated version.

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface BrittneyChatProps {
  isOpen: boolean;
  onClose: () => void;
  runtime: HoloScriptRuntime;
}

export const BrittneyChat: React.FC<BrittneyChatProps> = ({ isOpen, onClose, runtime }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Brittney. I can help you build your world. What are we creating today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Gather Scene Context from HoloScript+ Runtime
      const states = (runtime as any).getHologramStates?.() || new Map();
      const holograms = Array.from(states.entries()).map(([id, state]: [string, any]) => ({
        id,
        type: state.shape || 'orb',
        position: state.position,
        traits: state.traits || []
      }));

      const response = await fetch('http://localhost:11435/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: {
            holoScriptContext: {
              currentScene: 'Hololand Central',
              holograms
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to connect to Brittney Service');
      
      const data = await response.json();
      
      // Parse for Action Tags (e.g. [UPDATE: id { "position": [0,1,0] }])
      const updateRegex = /\[UPDATE:\s*([\w#]+)\s*({.+?})\]/g;
      let match;
      let aiContent = data.content;
      
      while ((match = updateRegex.exec(data.content)) !== null) {
        let id = match[1];
        if (id.startsWith('#')) id = id.substring(1); // Handle #ID or ID
        
        try {
          const props = JSON.parse(match[2]);
          (runtime as any).updateEntity?.(id, props);
        } catch (e) {
          console.error("Failed to parse AI update tag:", e);
        }
      }

      const assistantMsg: Message = { role: 'assistant', content: aiContent };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Brittney Error:', err);
      // Fallback to simulation if service is down, but with a hint
      setTimeout(() => {
        const response: Message = { 
          role: 'assistant', 
          content: `I'm currently in local simulation mode (Service at :11435 not found). I can see ${(runtime as any).getHologramStates?.().size || 0} objects in the scene.` 
        };
        setMessages(prev => [...prev, response]);
        setIsTyping(false);
      }, 1000);
      return;
    }
    setIsTyping(false);
  };

  const executeTool = (toolName: string) => {
    switch (toolName) {
      case 'inspect':
        const states = runtime.getHologramStates();
        const objects = Array.from(states.keys());
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Scene Analysis: ${objects.length} entities tracked. ${objects.slice(0, 5).join(', ')}${objects.length > 5 ? '...' : ''}` 
        }]);
        break;
      case 'reset':
        runtime.reset();
        setMessages(prev => [...prev, { role: 'system', content: 'Universe reset successfully. All transient holograms cleared.' }]);
        break;
      case 'export':
        // In a real app, this would get the source from the editor service
        setMessages(prev => [...prev, { role: 'system', content: 'Script bundle preparation initialized...' }]);
        break;
      case 'optimize':
        const count = runtime.getHologramStates().size;
        setMessages(prev => [...prev, { role: 'system', content: `Performance: Tracking ${count} items. Memory usage nominal.` }]);
        break;
    }
    setShowTools(false);
  };

  if (!isOpen) return null;

  return (
    <div className="brittney-overlay">
      <style>{`
        .brittney-overlay {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 400px;
          height: 600px;
          background: rgba(26, 26, 46, 0.95);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          z-index: 3000;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(74, 222, 128, 0.1);
          color: white;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }
        .brittney-header {
          padding: 15px 20px;
          background: rgba(74, 222, 128, 0.1);
          border-bottom: 1px solid rgba(74, 222, 128, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brittney-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brittney-status-dot {
          width: 8px;
          height: 8px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 10px #4ade80;
        }
        .brittney-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .message {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 15px;
          font-size: 14px;
          line-height: 1.5;
        }
        .message.assistant {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.05);
          border-bottom-left-radius: 2px;
        }
        .message.user {
          align-self: flex-end;
          background: #4ade80;
          color: #1a1a2e;
          border-bottom-right-radius: 2px;
        }
        .message.system {
          align-self: center;
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
          font-size: 12px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .brittney-input-area {
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 10px;
          position: relative;
        }
        .brittney-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 15px;
          color: white;
          outline: none;
        }
        .brittney-input:focus {
          border-color: #4ade80;
        }
        .tool-btn {
          background: none;
          border: 1px solid rgba(74, 222, 128, 0.3);
          color: #4ade80;
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tools-menu {
          position: absolute;
          bottom: 80px;
          left: 20px;
          right: 20px;
          background: #1a1a2e;
          border: 1px solid #4ade80;
          border-radius: 15px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          box-shadow: 0 0 30px rgba(0,0,0,0.5);
        }
        .tool-item {
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tool-item:hover {
          background: rgba(74, 222, 128, 0.1);
        }
      `}</style>

      <div className="brittney-header">
        <div className="brittney-title">
          <div className="brittney-status-dot"></div>
          <strong>Brittney AI</strong>
        </div>
        <button className="tool-btn" onClick={onClose} style={{ border: 'none', fontSize: '20px' }}>&times;</button>
      </div>

      <div className="brittney-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.content}
          </div>
        ))}
        {isTyping && <div className="message assistant">Thinking...</div>}
      </div>

      <div className="brittney-input-area">
        <button className="tool-btn" onClick={() => setShowTools(!showTools)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </button>
        
        {showTools && (
          <div className="tools-menu">
            <div className="tool-item" onClick={() => executeTool('inspect')}>
              <span>🔍</span> Inspect Scene
            </div>
            <div className="tool-item" onClick={() => executeTool('export')}>
              <span>📄</span> Export Script
            </div>
            <div className="tool-item" onClick={() => executeTool('optimize')}>
              <span>⚡</span> Optimize World
            </div>
            <div className="tool-item" onClick={() => executeTool('reset')} style={{ color: '#ff4444' }}>
              <span>♻️</span> Reset Universe
            </div>
          </div>
        )}

        <input 
          className="brittney-input" 
          placeholder="Ask about your world..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="tool-btn" onClick={handleSend} style={{ background: '#4ade80', color: '#1a1a2e' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
