import React, { useEffect, useState } from 'react';
import { DialogManager, DialogNode } from '../../../../packages/world/src/index';

interface DialogOverlayProps {
    manager: DialogManager;
}

export const DialogOverlay: React.FC<DialogOverlayProps> = ({ manager }) => {
    const [currentDialog, setCurrentDialog] = useState<DialogNode | null>(null);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (currentDialog) {
            setDisplayedText('');
            setIsTyping(true);
            let i = 0;
            const text = currentDialog.text;
            const interval = setInterval(() => {
                setDisplayedText(text.slice(0, i + 1));
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    setIsTyping(false);
                }
            }, 25); // Fast typing speed
            return () => clearInterval(interval);
        }
    }, [currentDialog]);
    useEffect(() => {
        const onStart = (dialog: DialogNode) => {
            setCurrentDialog(dialog);
        };
        const onEnd = () => {
            setCurrentDialog(null);
        };

        const bus = (manager as any).eventBus;
        if (bus) {
            bus.on('dialog:start', onStart);
            bus.on('dialog:end', onEnd);
        }
        
        return () => {
            if (bus) {
                // If it supports off/removeListener
                if (typeof bus.off === 'function') {
                    bus.off('dialog:start', onStart);
                    bus.off('dialog:end', onEnd);
                } else if (typeof bus.removeListener === 'function') {
                    bus.removeListener('dialog:start', onStart);
                    bus.removeListener('dialog:end', onEnd);
                }
            }
        };
    }, [manager]);

    if (!currentDialog) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '650px',
            backgroundColor: 'rgba(10, 10, 26, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 255, 255, 0.5)',
            borderRadius: '16px',
            padding: '24px',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            zIndex: 2000,
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.15)',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
            <style>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div style={{ fontSize: '14px', color: '#00ffff', opacity: 0.7, marginBottom: '8px', letterSpacing: '2px', fontWeight: 'bold' }}>
                COMM-LINK SECURE
            </div>
            <div style={{ fontSize: '18px', marginBottom: '24px', lineHeight: '1.5', minHeight: '54px', color: '#e2e8f0' }}>
                {displayedText}
                {isTyping && <span style={{ display: 'inline-block', width: '8px', height: '18px', background: '#00ffff', marginLeft: '4px', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }}></span>}
                <style>{`
                    @keyframes blink {
                        50% { opacity: 0; }
                    }
                `}</style>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!isTyping && currentDialog.options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            const bus = (manager as any).eventBus;
                            bus.emit('dialog:option', { nextId: opt.nextId, action: opt.action });
                        }}
                        style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(0, 255, 255, 0.05)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#00ffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '15px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            animation: `fadeIn 0.3s ease-out ${i * 0.1}s both`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.15)';
                            e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.8)';
                            e.currentTarget.style.transform = 'translateX(5px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.05)';
                            e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        {opt.text}
                    </button>
                ))}
            </div>
        </div>
    );
};
