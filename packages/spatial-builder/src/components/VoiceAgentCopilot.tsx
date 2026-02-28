import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Loader2 } from 'lucide-react';

export interface VoiceAgentCopilotProps {
  targetObjectId: string | null;
  onOutputTrait: (traitPayload: any) => void;
}

export function VoiceAgentCopilot({ targetObjectId, onOutputTrait }: VoiceAgentCopilotProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Simulating Voice-to-Text and LLM Trait Generation Pipeline
  const handleToggleVoice = () => {
    if (!targetObjectId) {
      alert("Select an object first to use the Voice Copilot.");
      return;
    }

    if (isListening) {
      // 1. Stop Listening
      setIsListening(false);
      setIsProcessing(true);

      // 2. Simulate AI parsing the transcript into a HoloScript Trait Payload
      setTimeout(() => {
        setIsProcessing(false);
        const generatedPayload = {
          target: targetObjectId,
          traits: [
            {
              type: '@vfx/glow',
              properties: { color: '#ff0000', intensity: 2.5 }
            },
            {
              type: '@combat/damage',
              properties: { amount: 50, damageType: 'fire' }
            }
          ]
        };
        onOutputTrait(generatedPayload);
        setTranscript('');
      }, 1500);

    } else {
      // Start Listening
      setIsListening(true);
      setTranscript('Make this sword glow red and deal 50 fire damage...');
    }
  };

  if (!targetObjectId) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {/* Voice Transcript Bubble */}
      {(isListening || isProcessing || transcript) && (
        <div className="bg-neutral-900/90 border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md max-w-md text-center text-sm font-medium animate-fade-in-up">
          {isProcessing ? (
            <span className="flex items-center gap-2 text-orange-400">
              <Sparkles size={16} className="animate-pulse" />
              Agent compiling HoloScript traits...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {transcript}
            </span>
          )}
        </div>
      )}

      {/* Mic Button */}
      <button
        onClick={handleToggleVoice}
        disabled={isProcessing}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] ${
          isProcessing ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' :
          isListening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 
          'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
      >
        {isProcessing ? (
          <Loader2 size={28} className="animate-spin" />
        ) : isListening ? (
          <MicOff size={28} />
        ) : (
          <Mic size={28} />
        )}
      </button>
    </div>
  );
}
