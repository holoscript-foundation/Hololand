/**
 * Top Bar Component - Navigation and controls
 */

import React from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import { HoloScriptService } from '@services/HoloScriptService';

interface TopBarProps {
  onToggleDarkMode: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleDarkMode }) => {
  const { editor, setSaved, setErrors, toggleChat, toggleErrors, ui } = usePlaygroundStore();
  const { setCode } = usePlaygroundStore();

  const handleCompile = () => {
    const compilation = HoloScriptService.compile(editor.code);
    if (compilation.success) {
      setErrors([]);
      alert('✓ Compilation successful!');
    } else {
      setErrors(compilation.errors);
    }
  };

  const handleSave = () => {
    setSaved(true);
    // In real app, would send to backend here
    console.log('Code saved:', editor.code);
  };

  const handleNewFile = () => {
    if (editor.code.trim() && !editor.isSaved) {
      if (!confirm('You have unsaved changes. Continue?')) return;
    }
    setCode(`world MyWorld {
  object cube {
    position: [0, 0, 0]
  }
}`);
    setSaved(true);
  };

  const handleLoadExample = (example: 'cube' | 'sphere' | 'grid') => {
    const examples: Record<string, string> = {
      cube: `world CubeWorld {
  object cube {
    position: [0, 0, 0]
    scale: [1, 1, 1]
    
    trait Material {
      color: 0x00ff00
      metalness: 0.5
      roughness: 0.5
    }
    
    behavior Rotate {
      speed: 2.0
    }
  }
}`,
      sphere: `world SphereWorld {
  object sphere {
    position: [0, 2, 0]
    scale: [1.5, 1.5, 1.5]
    
    trait Material {
      color: 0x0080ff
      metalness: 0.8
      roughness: 0.2
    }
  }
}`,
      grid: `world GridWorld {
  object ground {
    position: [0, -2, 0]
    scale: [10, 0.1, 10]
    
    trait Material {
      color: 0xaaaaaa
      metalness: 0.3
      roughness: 0.7
    }
  }
  
  object obstacle1 {
    position: [-3, 0, 0]
    scale: [1, 2, 1]
    
    trait Material {
      color: 0xff6600
      metalness: 0.5
      roughness: 0.5
    }
  }
}`,
    };

    setCode(examples[example]);
    setSaved(false);
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Section - Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
              HoloScript
            </span>
          </div>
          <div className="text-sm text-gray-400">Playground</div>
        </div>

        {/* Middle Section - File Controls */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleNewFile}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
              title="New file"
            >
              📄 New
            </button>

            <div className="flex gap-1 px-2 py-1 bg-gray-700 rounded">
              <button
                onClick={() => handleLoadExample('cube')}
                className="px-2 py-0.5 text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 rounded"
              >
                Cube
              </button>
              <button
                onClick={() => handleLoadExample('sphere')}
                className="px-2 py-0.5 text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 rounded"
              >
                Sphere
              </button>
              <button
                onClick={() => handleLoadExample('grid')}
                className="px-2 py-0.5 text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 rounded"
              >
                Grid
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={editor.isSaved}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
              title="Save (Ctrl+S)"
            >
              💾 Save
            </button>

            <button
              onClick={handleCompile}
              className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              title="Compile (Ctrl+Enter)"
            >
              ▶ Compile
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-600"></div>

          {/* Right Section - View Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleChat}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                ui.showChat
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Toggle AI Chat"
            >
              🤖 AI
            </button>

            <button
              onClick={toggleErrors}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                ui.showErrors
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Toggle Error Panel"
            >
              ⚠️ Errors
            </button>

            <button
              onClick={onToggleDarkMode}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
              title="Toggle dark mode"
            >
              🌙
            </button>
          </div>

          {/* Right Section - Links */}
          <div className="flex gap-2 ml-4">
            <a
              href="https://github.com/hololand/HoloScript"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              📚 Docs
            </a>

            <a
              href="https://github.com/hololand"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              ⭐ GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-1 text-xs text-gray-500 bg-gray-900/50 border-t border-gray-700">
        <span>{editor.isSaved ? '✓ All changes saved' : '● Unsaved changes'}</span>
        <span>Version 1.0.0-alpha • HoloScript 1.0</span>
      </div>
    </div>
  );
};

export default TopBar;
