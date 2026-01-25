/**
 * HoloScript Playground - Main Application
 * 
 * Real-time 3D world building in the browser.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from './components/Editor';
import { Preview3D } from './components/Preview3D';
import { useHoloScriptCompiler } from './hooks/useHoloScriptCompiler';
import { STARTER_CODE } from './templates/starter';

export function App() {
  const [code, setCode] = useState(STARTER_CODE);
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'preview'>('split');
  const { ast, errors, compile, isCompiling } = useHoloScriptCompiler();
  
  // Compile on code change with debounce
  const compileTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    
    // Debounce compilation
    if (compileTimeoutRef.current) {
      clearTimeout(compileTimeoutRef.current);
    }
    
    compileTimeoutRef.current = setTimeout(() => {
      compile(newCode);
    }, 300);
  }, [compile]);
  
  // Initial compile
  useEffect(() => {
    compile(code);
  }, []);
  
  return (
    <div className="playground-container">
      {/* Header */}
      <header className="playground-header">
        <div className="logo">
          <span className="logo-icon">🌐</span>
          <span>HoloScript Playground</span>
        </div>
        
        <div className="toolbar">
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
            >
              Code
            </button>
            <button 
              className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button 
              className={`mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
          </div>
          
          <button className="btn btn-primary">
            <span>▶</span> Run
          </button>
          
          <button className="btn btn-secondary">
            Share
          </button>
        </div>
      </header>
      
      {/* Editor Panel */}
      {(viewMode === 'split' || viewMode === 'code') && (
        <div className="editor-panel">
          <div className="panel-header">
            <div className="file-tab">
              <span>📄</span>
              <span>scene.holo</span>
            </div>
          </div>
          <div className="editor-wrapper">
            <Editor 
              value={code} 
              onChange={handleCodeChange}
              language="holoscript"
            />
          </div>
        </div>
      )}
      
      {/* Preview Panel */}
      {(viewMode === 'split' || viewMode === 'preview') && (
        <div className="preview-panel">
          <div className="panel-header">
            <span>Live Preview</span>
            <div className="preview-stats">
              <span className="stat">
                FPS: <span className="stat-value">60</span>
              </span>
              <span className="stat">
                Objects: <span className="stat-value">{ast?.objects?.length || 0}</span>
              </span>
            </div>
          </div>
          <div className="preview-canvas">
            <Preview3D ast={ast} isCompiling={isCompiling} />
          </div>
        </div>
      )}
      
      {/* Error Bar */}
      <div className={`error-bar ${errors.length > 0 ? 'has-errors' : 'success'}`}>
        {errors.length > 0 ? (
          <>
            <span className="error-icon">⚠️</span>
            <span>{errors.length} error{errors.length > 1 ? 's' : ''}: {errors[0]?.message}</span>
          </>
        ) : (
          <>
            <span className="success-icon">✓</span>
            <span>Ready • Live preview active</span>
          </>
        )}
      </div>
    </div>
  );
}
