/**
 * AIPromptPanel - Phase 2 "Prompt-to-World" interface
 * 
 * Allows users to describe spatial scenes which are then 
 * compiled into HOSL and injected into the live scene.
 */

import React, { useState } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import { AIService } from '@services/AIService';

const AIPromptPanel: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { setCode, editor } = usePlaygroundStore();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setSuggestion(null);

    try {
      const aiService = new AIService('brittney');
      let fullContent = '';
      
      const context = {
        currentCode: editor.code,
        language: 'holoscript',
        mode: 'generation'
      };

      const generator = aiService.generateCode(`Generate HOSL code for: ${prompt}`, context);

      for await (const chunk of generator) {
        fullContent += chunk;
      }

      // Extract code block
      const match = fullContent.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
      const code = match ? match[1] : fullContent;

      setSuggestion(code);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyGeneration = () => {
    if (suggestion) {
      setCode(suggestion);
      setSuggestion(null);
      setPrompt('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
            <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.784.785l.24 1.192a1 1 0 001.96 0l.24-1.192a1 1 0 01.784-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.784-.785l-.24-1.192zM5 2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H5zM2.21 10.512a.75.75 0 011.058-.143l1.16.927a.75.75 0 01.144 1.058l-1.16.927a.75.75 0 11-.914-1.202l.409-.327-.41-.328a.75.75 0 01-.127-1.012zM14.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">Prompt-to-World</h3>
          <p className="text-[10px] text-gray-400">Neural Space Bridge Active</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">What do you want to build?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your 3D world... (e.g., 'A forest with glowing fireflies')"
            className="w-full h-32 px-3 py-2 bg-gray-800 text-gray-100 rounded-lg border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm resize-none transition-all"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            isGenerating 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg active:scale-95'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              Generating World...
            </>
          ) : (
            'Generate HOSL Code'
          )}
        </button>

        {suggestion && (
          <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gray-800 rounded-lg border border-purple-500/30 overflow-hidden">
              <div className="px-3 py-2 bg-gray-850 flex justify-between items-center border-b border-gray-700">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">HOSL Generated</span>
                <span className="text-[10px] text-gray-500 italic">Previewing suggestions...</span>
              </div>
              <pre className="p-3 text-[11px] text-green-400 font-mono overflow-x-auto max-h-48 scrollbar-thin">
                {suggestion}
              </pre>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={applyGeneration}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Apply to World
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-all"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-500 text-center">
          Powered by uAA2++ Evolution Engine
        </p>
      </div>
    </div>
  );
};

export default AIPromptPanel;
