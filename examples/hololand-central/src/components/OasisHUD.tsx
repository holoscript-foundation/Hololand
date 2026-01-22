import React, { useEffect, useState } from 'react';
import { Vector3 } from 'three';

interface OasisHUDProps {
    playerPosition: Vector3;
    bitsCollected: number;
    visitorCount: number;
}

const ZONES = [
    { name: 'Welcome Plaza', center: new Vector3(0, 0, 5), radius: 6 },
    { name: "$BRIAN's Gym", center: new Vector3(10, 0, 0), radius: 6 },
    { name: 'Green Machine Arcade', center: new Vector3(-10, 0, 0), radius: 6 },
];

export const OasisHUD: React.FC<OasisHUDProps> = ({ playerPosition, bitsCollected, visitorCount }) => {
    const [activeZone, setActiveZone] = useState('The Oasis Hub');
    const [prevBits, setPrevBits] = useState(bitsCollected);
    const [isPulsing, setIsPulsing] = useState(false);

    useEffect(() => {
        let currentZone = 'The Oasis Hub';
        for (const zone of ZONES) {
            const dist = playerPosition.distanceTo(zone.center);
            if (dist < zone.radius) {
                currentZone = zone.name;
                break;
            }
        }
        setActiveZone(currentZone);
    }, [playerPosition]);

    useEffect(() => {
        if (bitsCollected > prevBits) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 500);
            setPrevBits(bitsCollected);
            return () => clearTimeout(timer);
        }
    }, [bitsCollected, prevBits]);

    const hudStyle: React.CSSProperties = {
        position: 'absolute',
        top: '20px',
        left: '20px',
        padding: '15px 25px',
        background: 'rgba(10, 10, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(74, 222, 128, 0.4)',
        borderRadius: '16px',
        color: '#4ade80',
        fontFamily: "'Inter', sans-serif",
        pointerEvents: 'none',
        zIndex: 1500,
        boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.3s ease',
    };

    return (
        <div style={hudStyle}>
            <style>{`
                @keyframes pulse-green {
                    0% { text-shadow: 0 0 0px rgba(74, 222, 128, 0); transform: scale(1); }
                    50% { text-shadow: 0 0 15px rgba(74, 222, 128, 0.8); transform: scale(1.1); }
                    100% { text-shadow: 0 0 0px rgba(74, 222, 128, 0); transform: scale(1); }
                }
                .pulse { animation: pulse-green 0.5s ease-out; }
                .zone-transition { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
            <div style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
                OASIS CORE // DOWNTOWN_CORE_PH0
            </div>
            
            <div className="zone-transition" style={{ 
                fontSize: '22px', 
                fontWeight: 800, 
                color: '#fff', 
                marginBottom: '12px',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
                {activeZone.toUpperCase()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                    <span style={{ opacity: 0.6 }}>DATA BITS</span>
                    <span className={isPulsing ? 'pulse' : ''} style={{ color: bitsCollected >= 5 ? '#4ade80' : '#fff', transition: 'color 0.3s' }}>
                        {bitsCollected} <span style={{ opacity: 0.4 }}>/ 5</span>
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                    <span style={{ opacity: 0.6 }}>VISITORS</span>
                    <span style={{ color: '#fff' }}>{visitorCount.toLocaleString()}</span>
                </div>
            </div>

            {bitsCollected >= 5 && (
                <div style={{
                    marginTop: '16px',
                    padding: '10px',
                    background: 'rgba(74, 222, 128, 0.15)',
                    border: '1px solid rgba(74, 222, 128, 0.5)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    textAlign: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    animation: 'fadeIn 0.5s ease-out'
                }}>
                    MISSION: CONTACT $BRIAN AT THE GYM
                </div>
            )}
        </div>
    );
};
