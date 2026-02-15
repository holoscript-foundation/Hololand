import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrittney } from '@/hooks/useBrittney';

type Tab = 'editor' | 'brittney' | 'assets';

export default function CreatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('brittney');
  const [prompt, setPrompt] = useState('');

  // Use Brittney AI hook
  const {
    messages,
    isGenerating,
    currentCode,
    error,
    sendMessage,
    setCode,
    suggestions,
  } = useBrittney();

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    await sendMessage(prompt);
    setPrompt('');
  };

  return (
    <div className="h-full flex flex-col animate-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-oasis-text">Creator Studio</h1>
          <p className="text-sm text-oasis-text-muted">
            Build worlds with AI assistance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Save Draft</button>
          <button className="btn-primary">Publish</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-white/5">
        <TabButton
          active={activeTab === 'brittney'}
          onClick={() => setActiveTab('brittney')}
          icon={<AIIcon />}
        >
          Brittney AI
        </TabButton>
        <TabButton
          active={activeTab === 'editor'}
          onClick={() => setActiveTab('editor')}
          icon={<CodeIcon />}
        >
          Code Editor
        </TabButton>
        <TabButton
          active={activeTab === 'assets'}
          onClick={() => setActiveTab('assets')}
          icon={<AssetIcon />}
        >
          Assets
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'brittney' && (
          <div className="h-full flex">
            {/* Chat panel */}
            <div className="w-1/2 border-r border-white/5 flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Render all messages from Brittney hook */}
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'assistant'
                        ? 'bg-gradient-to-br from-oasis-primary to-oasis-secondary'
                        : 'bg-oasis-surface-light'
                    }`}>
                      {message.role === 'assistant' ? (
                        <AIIcon className="w-5 h-5 text-white" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-oasis-text" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-oasis-text mb-1">
                        {message.role === 'assistant' ? 'Brittney' : 'You'}
                      </p>
                      <div className="card p-3">
                        <p className="text-sm text-oasis-text whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {message.code && (
                          <>
                            <pre className="text-xs bg-oasis-bg p-3 rounded overflow-x-auto mt-2">
                              <code className="text-oasis-text">{message.code}</code>
                            </pre>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => setActiveTab('editor')}
                                className="btn-primary text-sm"
                              >
                                Edit Code
                              </button>
                              <button className="btn-secondary text-sm">Preview</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show generating indicator */}
                {isGenerating && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-oasis-primary to-oasis-secondary flex items-center justify-center flex-shrink-0">
                      <LoadingIcon className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-oasis-text mb-1">Brittney</p>
                      <div className="card p-3">
                        <p className="text-sm text-oasis-text-muted">Generating HoloScript...</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div className="card p-3 border-oasis-error/50 bg-oasis-error/10">
                    <p className="text-sm text-oasis-error">{error}</p>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-oasis-text-muted mb-2">Try these:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 3).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(suggestion)}
                        className="text-xs bg-oasis-surface-light px-2 py-1 rounded-full text-oasis-text-muted hover:text-oasis-text transition-colors"
                      >
                        {suggestion.slice(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="Describe your world..."
                    className="input flex-1"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={handleGenerate}
                    className="btn-primary"
                    disabled={isGenerating || !prompt.trim()}
                  >
                    {isGenerating ? (
                      <LoadingIcon className="w-5 h-5 animate-spin" />
                    ) : (
                      'Generate'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview panel */}
            <div className="w-1/2 bg-oasis-bg flex items-center justify-center">
              {currentCode ? (
                <div className="text-center p-4">
                  <PreviewIcon className="w-12 h-12 text-oasis-primary mx-auto mb-4" />
                  <p className="text-oasis-text mb-2">Code ready for preview</p>
                  <button className="btn-primary">Launch Preview</button>
                </div>
              ) : (
                <div className="text-center">
                  <PreviewIcon className="w-16 h-16 text-oasis-text-muted mx-auto mb-4" />
                  <p className="text-oasis-text-muted">
                    3D preview will appear here
                  </p>
                  <p className="text-sm text-oasis-text-muted mt-1">
                    Generate code to see a preview
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="h-full flex">
            {/* Code editor */}
            <div className="w-1/2 border-r border-white/5">
              <div className="h-full p-4">
                <textarea
                  className="w-full h-full bg-oasis-bg font-mono text-sm text-oasis-text p-4 rounded-lg resize-none border border-white/10 focus:border-oasis-primary/50 focus:outline-none"
                  placeholder="// Write your HoloScript code here..."
                  value={currentCode}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="w-1/2 bg-oasis-bg flex items-center justify-center">
              <div className="text-center">
                <PreviewIcon className="w-16 h-16 text-oasis-text-muted mx-auto mb-4" />
                <p className="text-oasis-text-muted">Live preview</p>
                <button className="btn-primary mt-4">Run Code</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="h-full p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {['Furniture', 'Nature', 'Buildings', 'Vehicles', 'Characters', 'Effects'].map((category) => (
                <Link
                  key={category}
                  to={`/create/assets/${category.toLowerCase()}`}
                  className="card p-4 text-center hover:border-oasis-primary/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-oasis-surface-light mx-auto mb-2 flex items-center justify-center">
                    <AssetIcon className="w-6 h-6 text-oasis-text-muted" />
                  </div>
                  <p className="text-sm font-medium text-oasis-text">{category}</p>
                  <p className="text-xs text-oasis-text-muted mt-1">24 items</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
        ${active
          ? 'bg-oasis-surface text-oasis-text'
          : 'text-oasis-text-muted hover:text-oasis-text'
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}

// Icons
function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function AssetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function PreviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
