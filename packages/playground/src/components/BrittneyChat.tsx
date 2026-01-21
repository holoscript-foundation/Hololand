/**
 * Brittney Chat Component - AI-Powered Code Assistant with Streaming
 */

import React, { useRef, useEffect, useState } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import { AIService } from '@services/AIService';
import { CodeTemplates } from '@services/CodeTemplates';
import type { ChatMessage } from '@types/playground';

interface StreamingMessage {
  id: string;
  content: string;
  isStreaming: boolean;
}

const BrittneyChat: React.FC = () => {
  const { chat, editor, addMessage, setChatLoading, setCode } = usePlaygroundStore();
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'brittney' | 'openai' | 'claude' | 'ollama'>('brittney');
  const [providers, setProviders] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const aiService = useRef<AIService | null>(null);

  useEffect(() => {
    // Initialize AI Service
    aiService.current = new AIService(selectedProvider as any);
    const availableProviders = AIService.getProviders();
    setProviders(availableProviders);
  }, [selectedProvider]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, streamingMessage]);

  const handleProviderChange = (newProvider: string) => {
    setSelectedProvider(newProvider as any);
    if (aiService.current) {
      aiService.current.setProvider(newProvider as any);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !aiService.current) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setChatLoading(true);

    // Create streaming message container
    const msgId = `msg-${Date.now()}-ai`;
    setStreamingMessage({
      id: msgId,
      content: '',
      isStreaming: true,
    });

    try {
      // Check if user is asking for a template
      const templateMatch = input.match(/template\s+(\w+)/i);
      if (templateMatch) {
        const templateName = templateMatch[1];
        const template = CodeTemplates.getTemplate(templateName);
        if (template) {
          const templateContent = CodeTemplates.render(template, {});
          setStreamingMessage({
            id: msgId,
            content: `\`\`\`holoscript\n${templateContent}\n\`\`\`\n\nTemplate "${templateName}" loaded successfully!`,
            isStreaming: false,
          });
          return;
        }
      }

      // Stream response from selected AI provider
      const context = {
        currentCode: editor.code,
        language: 'holoscript',
        userQuery: input,
      };

      let fullContent = '';
      const generator = aiService.current.generateCode(input, context);

      for await (const chunk of generator) {
        fullContent += chunk;
        setStreamingMessage((prev) =>
          prev ? { ...prev, content: fullContent } : null
        );
      }

      // Add completed message to chat
      const assistantMessage: ChatMessage = {
        id: msgId,
        role: 'assistant',
        content: fullContent || 'No response generated',
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
      setStreamingMessage(null);
    } catch (error) {
      console.error('Error streaming response:', error);
      
      // Fallback to mock response
      const mockContent = generateAISuggestions(input, {
        currentCode: editor.code,
        language: 'holoscript',
      });

      const assistantMessage: ChatMessage = {
        id: msgId,
        role: 'assistant',
        content: mockContent,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
      setStreamingMessage(null);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-700 bg-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            Brittney AI Assistant
          </h3>
          <span className="text-xs text-gray-500">Streaming • Templates • Code Generation</span>
        </div>

        {/* Provider Selector */}
        <div className="flex gap-2">
          <label className="text-xs text-gray-400 flex items-center">Provider:</label>
          <select
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="flex-1 text-xs px-2 py-1 bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-purple-500 outline-none"
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages.length === 0 && !streamingMessage ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="text-4xl mb-4">✨</div>
            <p className="text-sm font-semibold mb-2">Welcome to Brittney AI</p>
            <p className="text-xs text-center max-w-xs mb-4">
              Ask me to generate HoloScript, fix errors, optimize code, or explain your world.
            </p>
            <div className="text-xs bg-gray-800 p-3 rounded max-w-xs">
              <p className="font-semibold mb-2">Try asking:</p>
              <ul className="space-y-1">
                <li>• Generate a spinning cube</li>
                <li>• Create a particle system</li>
                <li>• Load template BasicObject</li>
                <li>• Fix errors in my code</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100 border border-purple-500'
                  }`}
                >
                  {/* Message Content Parser */}
                  <div className="text-sm break-words whitespace-pre-wrap">
                    {message.content.split(/(```[\s\S]*?```)/g).map((part, i) => {
                      if (part.startsWith('```')) {
                        // Extract code content
                        const match = part.match(/```(?:holoscript|holo)?\n([\s\S]*?)```/);
                        const code = match ? match[1] : '';
                        
                        if (!code.trim()) return null;

                        return (
                          <div key={i} className="my-2 bg-gray-950 rounded border border-gray-700 overflow-hidden">
                            <div className="flex justify-between items-center px-2 py-1 bg-gray-900 border-b border-gray-700">
                              <span className="text-xs text-gray-400">HoloScript</span>
                              <button
                                onClick={() => editor.code !== code && setCode(code)} 
                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                                Apply
                              </button>
                            </div>
                            <pre className="p-2 text-xs overflow-x-auto text-green-400 font-mono">
                              {code}
                            </pre>
                          </div>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </div>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {streamingMessage && (
              <div className="flex gap-2 justify-start">
                <div className="max-w-xs bg-gray-800 border border-purple-500 text-gray-100 px-4 py-2 rounded-lg">
                  <p className="text-sm break-words whitespace-pre-wrap">{streamingMessage.content}</p>
                  {streamingMessage.isStreaming && (
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 bg-gray-800 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Brittney... (template TEMPLATE_NAME for templates)"
            className="flex-1 px-3 py-2 bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-sm"
            disabled={streamingMessage?.isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || streamingMessage?.isStreaming}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-semibold text-sm transition-colors"
          >
            {streamingMessage?.isStreaming ? '...' : 'Send'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Use "template" keyword to load pre-built code patterns
        </p>
      </div>
    </div>
  );
};

/**
 * Generate AI suggestions based on user input
 */
function generateAISuggestions(input: string, context: any): string {
  const lower = input.toLowerCase();

  if (lower.includes('cube') || lower.includes('box')) {
    return `I'll create a spinning cube for you! Here's the code:

\`\`\`holoscript
world SpinningCube {
  object cube {
    position: [0, 0, 0]
    rotation: [0, 0, 0]
    scale: [1, 1, 1]
    
    trait Material {
      color: 0x00ff00
      metalness: 0.5
      roughness: 0.5
    }
    
    behavior Rotate {
      speed: 1.0
    }
  }
}
\`\`\`

You can paste this into the editor to see the cube in action!`;
  }

  if (lower.includes('sphere')) {
    return `Let me create a shiny sphere for you:

\`\`\`holoscript
world ShinyBall {
  object sphere {
    position: [0, 2, 0]
    scale: [1.5, 1.5, 1.5]
    
    trait Material {
      color: 0x0080ff
      metalness: 0.8
      roughness: 0.2
    }
  }
}
\`\`\`

This will create a glossy blue sphere!`;
  }

  if (lower.includes('grid') || lower.includes('platform')) {
    return `Here's a nice grid platform:

\`\`\`holoscript
world Platform {
  object platform {
    position: [0, -1, 0]
    scale: [5, 0.1, 5]
    
    trait Material {
      color: 0xaaaaaa
      metalness: 0.3
      roughness: 0.7
    }
  }
}
\`\`\`

Perfect for placing objects on!`;
  }

  if (lower.includes('error') || lower.includes('debug')) {
    return `I can see the errors in your code. The main issues are:

1. **Unclosed braces** - Make sure all opening { have matching closing }
2. **Invalid property syntax** - Use colons (:) not equals (=)
3. **Type mismatches** - Colors should be hex format (0xRRGGBB)

Try using Ctrl+Enter to compile and see detailed error messages in the Error panel!`;
  }

  if (lower.includes('help') || lower.includes('how')) {
    return `Here are some things I can help with:

• **Generate code** - "Create a rotating sphere"
• **Fix errors** - "Why is my code not working?"
• **Optimize** - "Make this code more efficient"
• **Explain** - "What does this do?"

What would you like to do?`;
  }

  return `I'm Brittney, your AI coding assistant! I can help you:
- Generate HoloScript code
- Fix syntax errors
- Optimize performance
- Explain concepts

What can I help you build today?`;
}

export default BrittneyChat;
