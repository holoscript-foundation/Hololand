/**
 * Brittney Panel - Main React Component
 *
 * The AI-powered debugging assistant for Hololand applications.
 *
 * State Management: Uses chrome.storage.session to persist across panel hide/show.
 * See gotcha G.EXT.011: Panel State Loss on Tab Switch
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
interface Message {
  id: string;
  role: 'user' | 'brittney';
  content: string;
  timestamp: Date;
}

interface HololandApp {
  id: string;
  name: string;
  version?: string;
}

interface AppState {
  hololandDetected: boolean;
  connectedApp: HololandApp | null;
  messages: Message[];
  scenes: string[];
  components: string[];
  profilerStats: unknown | null;
}

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#1e1e1e',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    backgroundColor: '#252526',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  status: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  statusActive: {
    backgroundColor: '#2d5a3d',
    color: '#4ade80',
  },
  statusInactive: {
    backgroundColor: '#5a2d2d',
    color: '#f87171',
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
  },
  message: {
    marginBottom: '12px',
    padding: '12px',
    borderRadius: '8px',
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#0e639c',
    marginLeft: 'auto',
  },
  brittneyMessage: {
    backgroundColor: '#333',
    marginRight: 'auto',
  },
  messageRole: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap' as const,
  },
  inputContainer: {
    padding: '12px 16px',
    borderTop: '1px solid #333',
    backgroundColor: '#252526',
  },
  inputWrapper: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #3c3c3c',
    borderRadius: '6px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    outline: 'none',
  },
  button: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#0e639c',
    color: '#fff',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    borderTop: '1px solid #333',
    backgroundColor: '#252526',
    flexWrap: 'wrap' as const,
  },
  quickButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #3c3c3c',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#d4d4d4',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    color: '#888',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
    textAlign: 'center' as const,
    padding: '32px',
  },
};

export function BrittneyPanel(): React.ReactElement {
  const [state, setState] = useState<AppState>({
    hololandDetected: false,
    connectedApp: null,
    messages: [],
    scenes: [],
    components: [],
    profilerStats: null,
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load state from storage on mount
  useEffect(() => {
    chrome.storage.session.get(['brittneyState'], (result) => {
      if (result.brittneyState) {
        setState((s) => ({
          ...s,
          ...result.brittneyState,
          messages: result.brittneyState.messages?.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })) || [],
        }));
      }
    });
  }, []);

  // Save state to storage when it changes
  useEffect(() => {
    chrome.storage.session.set({ brittneyState: state });
  }, [state]);

  // Listen for messages from devtools.ts
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'session') return;

      if (changes.lastMessage?.newValue) {
        const msg = changes.lastMessage.newValue;

        if (msg.type === 'HOOK_EVENT') {
          if (msg.event === 'app-registered') {
            setState((s) => ({
              ...s,
              hololandDetected: true,
              connectedApp: msg.payload[0],
            }));
          }

          if (msg.event === 'scene-registered') {
            setState((s) => ({
              ...s,
              scenes: [...s.scenes, msg.payload[0].id],
            }));
          }

          if (msg.event === 'component-registered') {
            setState((s) => ({
              ...s,
              components: [...s.components, msg.payload[0].id],
            }));
          }

          if (msg.event === 'profiler-stats') {
            setState((s) => ({
              ...s,
              profilerStats: msg.payload[0],
            }));
          }
        }

        if (msg.type === 'TAB_NAVIGATED') {
          // Reset state on navigation
          setState({
            hololandDetected: false,
            connectedApp: null,
            messages: [],
            scenes: [],
            components: [],
            profilerStats: null,
          });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [state.messages]);

  // Query Brittney AI
  const askBrittney = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMessage],
    }));

    setInput('');
    setLoading(true);

    try {
      // Try Chrome's built-in AI first (P.EXT.017: Hybrid AI Integration)
      let response: string;

      if ('ai' in window && (window as { ai?: { languageModel?: unknown } }).ai?.languageModel) {
        // Use Chrome's on-device AI
        const ai = (window as { ai: { languageModel: { create: (config: unknown) => Promise<{ prompt: (text: string) => Promise<string> }> } } }).ai;
        const session = await ai.languageModel.create({
          systemPrompt: `You are Brittney, an AI assistant for Hololand VR/AR developers.
            Help debug scenes, components, and 3D rendering issues.
            Be concise and provide actionable suggestions.
            Current app: ${state.connectedApp?.name || 'Not connected'}
            Scenes: ${state.scenes.length}
            Components: ${state.components.length}`,
        });
        response = await session.prompt(userMessage.content);
      } else {
        // Fallback to simple responses
        response = generateLocalResponse(userMessage.content, state);
      }

      const brittneyMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'brittney',
        content: response,
        timestamp: new Date(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, brittneyMessage],
      }));
    } catch (error) {
      console.error('Brittney query failed:', error);

      const errorMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'brittney',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, errorMessage],
      }));
    }

    setLoading(false);
  }, [input, loading, state]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askBrittney();
    }
  };

  // Quick action presets
  const quickActions = [
    { label: 'Debug Rendering', query: 'Why is my scene not rendering correctly?' },
    { label: 'Optimize', query: 'How can I optimize my scene performance?' },
    { label: 'Check Errors', query: 'Are there any errors in my Hololand app?' },
    { label: 'Explain Code', query: 'Explain how Hololand components work' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          <span>Brittney</span>
        </div>
        <div
          style={{
            ...styles.status,
            ...(state.hololandDetected ? styles.statusActive : styles.statusInactive),
          }}
        >
          {state.hololandDetected
            ? `Connected: ${state.connectedApp?.name || 'Hololand App'}`
            : 'No Hololand App'}
        </div>
      </div>

      {/* Chat Messages */}
      <div style={styles.chatContainer} ref={chatContainerRef}>
        {state.messages.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>AI</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>
              Hi, I'm Brittney!
            </div>
            <div style={{ fontSize: '14px' }}>
              {state.hololandDetected
                ? 'Ask me anything about your Hololand app.'
                : 'Open a page with a Hololand app to get started.'}
            </div>
          </div>
        ) : (
          state.messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.brittneyMessage),
              }}
            >
              <div style={styles.messageRole}>
                {msg.role === 'user' ? 'You' : 'Brittney'}
              </div>
              <div style={styles.messageContent}>{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div style={styles.loading}>
            <span>Brittney is thinking...</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            style={styles.quickButton}
            onClick={() => {
              setInput(action.query);
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={styles.inputContainer}>
        <div style={styles.inputWrapper}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Brittney about your Hololand app..."
            disabled={loading}
          />
          <button
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onClick={askBrittney}
            disabled={loading || !input.trim()}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate simple local responses when AI is not available
 */
function generateLocalResponse(query: string, state: AppState): string {
  const lowerQuery = query.toLowerCase();

  if (!state.hololandDetected) {
    return "I don't see a Hololand app on this page. Make sure your app is using @hololand/core and the page has loaded.";
  }

  if (lowerQuery.includes('render') || lowerQuery.includes('display')) {
    return `Your Hololand app "${state.connectedApp?.name}" has ${state.scenes.length} scenes and ${state.components.length} components registered.

Common rendering issues:
1. Check if your scene is added to the world
2. Verify camera position and orientation
3. Ensure objects have materials assigned
4. Check the console for WebGL errors

Would you like me to check the profiler stats?`;
  }

  if (lowerQuery.includes('optim') || lowerQuery.includes('performance')) {
    return `Performance tips for Hololand apps:

1. **Reduce draw calls**: Batch similar materials
2. **LOD**: Use level-of-detail for distant objects
3. **Frustum culling**: Hide off-screen objects
4. **Texture atlases**: Combine small textures
5. **Physics**: Use simple colliders for complex meshes

Current stats: ${state.scenes.length} scenes, ${state.components.length} components`;
  }

  if (lowerQuery.includes('error') || lowerQuery.includes('bug')) {
    return `To debug errors in your Hololand app:

1. Open browser DevTools Console (F12)
2. Look for red error messages
3. Check the Network tab for failed requests
4. Use @hololand/devtools Profiler for performance issues

App: ${state.connectedApp?.name || 'Unknown'}
Scenes: ${state.scenes.length}
Components: ${state.components.length}`;
  }

  return `I'm here to help with your Hololand app "${state.connectedApp?.name}".

What I can help with:
- Debugging rendering issues
- Performance optimization
- Understanding Hololand architecture
- Troubleshooting errors

What would you like to know?`;
}

export default BrittneyPanel;
