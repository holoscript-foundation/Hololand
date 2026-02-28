import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { compileToTarget } from './compiler';
import './App.css';

const DEFAULT_HOLOSCRIPT = `@zone "Simple Demo" category:"demo" maxPlayers:20

composition "Demo Scene" {
  // Spinning cube with emissive glow
  object "MagicCube" {
    @spatial @networked @rotate @emissive
    geometry: "cube"
    position: [0, 2, 0]
    scale: [1, 1, 1]
    material: {
      color: "#ff00ff"
      emissive: "#ff00ff"
      emissiveIntensity: 0.5
      roughness: 0.3
      metallic: 0.7
    }
  }

  // Floating sphere with pulse animation
  object "FloatingSphere" {
    @spatial @float @pulse
    geometry: "sphere"
    position: [3, 2, 0]
    material: {
      color: "#00ffff"
      roughness: 0.5
    }
  }

  // Interactive portal
  portal "ToAnotherZone" {
    @spatial @interactive
    position: [0, 1, -5]
    destination: "main_plaza"
    label: "← Main Plaza"
  }

  // Directional light (sun)
  light "Sun" {
    type: "directional"
    position: [10, 10, 5]
    color: "#fff8e1"
    intensity: 1.2
  }

  // Point light (glowing orb)
  light "GlowOrb" {
    type: "point"
    position: [0, 3, 0]
    color: "#ff00ff"
    intensity: 0.8
    range: 10
  }
}`;

type CompilationTarget = 'unity' | 'unreal' | 'godot' | 'babylon' | 'webgpu';

function App() {
  const [holoScript, setHoloScript] = useState(DEFAULT_HOLOSCRIPT);
  const [selectedTarget, setSelectedTarget] = useState<CompilationTarget>('unity');
  const [compiledCode, setCompiledCode] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompile = () => {
    setIsCompiling(true);

    // Simulate compilation delay
    setTimeout(() => {
      const result = compileToTarget(holoScript, selectedTarget);
      setCompiledCode(result);
      setIsCompiling(false);
    }, 300);
  };

  const handleDownload = () => {
    const extension = {
      unity: '.cs',
      unreal: '.cpp',
      godot: '.gd',
      babylon: '.ts',
      webgpu: '.wgsl'
    }[selectedTarget];

    const blob = new Blob([compiledCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo_scene${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🚀 HoloScript Cross-Compilation Demo</h1>
        <p className="subtitle">Write Once, Deploy Everywhere - See it in action!</p>
      </header>

      <div className="container">
        {/* Left Panel: HoloScript Editor */}
        <div className="panel">
          <div className="panel-header">
            <h2>HoloScript Source</h2>
            <button className="compile-btn" onClick={handleCompile} disabled={isCompiling}>
              {isCompiling ? '⏳ Compiling...' : '⚡ Compile'}
            </button>
          </div>
          <div className="editor-wrapper">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={holoScript}
              onChange={(value) => setHoloScript(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
            />
          </div>
        </div>

        {/* Right Panel: Compiled Output */}
        <div className="panel">
          <div className="panel-header">
            <h2>Compiled Output</h2>
            <div className="controls">
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value as CompilationTarget)}
                className="target-select"
              >
                <option value="unity">Unity (C#)</option>
                <option value="unreal">Unreal (C++)</option>
                <option value="godot">Godot (GDScript)</option>
                <option value="babylon">Babylon.js (TypeScript)</option>
                <option value="webgpu">WebGPU (WGSL)</option>
              </select>
              <button
                className="download-btn"
                onClick={handleDownload}
                disabled={!compiledCode}
              >
                ⬇️ Download
              </button>
            </div>
          </div>
          <div className="editor-wrapper">
            <Editor
              height="100%"
              defaultLanguage={selectedTarget === 'unity' ? 'csharp' : selectedTarget === 'godot' ? 'python' : 'cpp'}
              theme="vs-dark"
              value={compiledCode || '// Compiled code will appear here...\n// Click "Compile" to see the magic! ✨'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
            />
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>
          <strong>HoloScript v3.42.0</strong> | Demonstrating cross-platform compilation to Unity, Unreal, Godot, Babylon.js, and WebGPU
        </p>
        <p className="stats">
          Generated {compiledCode.split('\n').length} lines from {holoScript.split('\n').length} lines of HoloScript
        </p>
      </footer>
    </div>
  );
}

export default App;
