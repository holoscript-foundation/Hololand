import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { HoloScriptR3FRenderer } from './HoloScriptR3FRenderer';
import { HoloScriptPlusParser } from '@holoscript/core';

export interface HoloScriptPlaygroundProps {
  initialCode?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * HoloScriptPlayground
 * 
 * A live editing environment for HoloScript.
 * Provides a text editor sidebar and an R3F preview.
 */
export const HoloScriptPlayground: React.FC<HoloScriptPlaygroundProps> = ({
  initialCode = `
environment #sky {
  name: "forest_sunset"
  @bloom(intensity: 1.0)
}

orb #main {
  position: [0, 1, 0]
  color: "#00ffff"
}
  `,
  className,
  style,
}) => {
  const [code, setCode] = useState(initialCode);
  const parser = useMemo(() => new HoloScriptPlusParser(), []);

  const ast = useMemo(() => {
    try {
      return parser.parse(code).ast;
    } catch (e) {
      console.error('Failed to parse HoloScript:', e);
      return null;
    }
  }, [code, parser]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e1e',
    ...style,
  };

  const sidebarStyle: React.CSSProperties = {
    width: '400px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333',
    padding: '1rem',
  };

  const editorStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#121212',
    color: '#d4d4d4',
    fontFamily: 'monospace',
    padding: '10px',
    border: 'none',
    outline: 'none',
    resize: 'none',
  };

  const previewStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={sidebarStyle}>
        <h2 style={{ color: '#fff', marginBottom: '1rem' }}>HoloScript Playground</h2>
        <textarea
          style={editorStyle}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />
        <div style={{ marginTop: '1rem', color: '#888', fontSize: '12px' }}>
          Tip: Try changing the environment preset or orb color!
        </div>
      </div>
      <div style={previewStyle}>
        {ast ? (
          <Canvas
            shadows
            camera={{ position: [0, 3, 8], fov: 60 }}
            gl={{ antialias: true, toneMapping: 3 }}
            style={{ width: '100%', height: '100%' }}
          >
            <HoloScriptR3FRenderer ast={ast} debug />
          </Canvas>
        ) : (
          <div style={{ color: '#ff5555', padding: '20px' }}>
            Syntax Error - Check Console
          </div>
        )}
      </div>
    </div>
  );
};
