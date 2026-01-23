/**
 * ChatWidget - Brittney Chat Interface
 * 
 * A device-adaptive chat widget for interacting with Brittney AI.
 * Works with local GGUF model (bundled) or cloud APIs (user-provided keys).
 * Built in HoloScript+ for seamless Hololand integration.
 */

import type { ChatMessage, ChatRequest, ChatResponse } from '../types';
import type { BrittneyEngine } from '../inference/BrittneyEngine';

export interface ChatWidgetConfig {
  /** The Brittney inference engine */
  engine: BrittneyEngine;
  /** Widget position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'fullscreen';
  /** Initial collapsed state */
  collapsed?: boolean;
  /** Theme variant */
  theme?: 'light' | 'dark' | 'system' | 'holographic';
  /** Enable voice input (requires microphone permission) */
  enableVoice?: boolean;
  /** Enable code syntax highlighting */
  enableCodeHighlight?: boolean;
  /** Custom welcome message */
  welcomeMessage?: string;
  /** Max conversation history to display */
  maxHistory?: number;
  /** Enable streaming responses */
  streaming?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Custom CSS classes */
  className?: string;
  /** Z-index for overlay */
  zIndex?: number;
  /** Device type override (auto-detected if not specified) */
  device?: 'mobile' | 'tablet' | 'desktop' | 'vr' | 'ar';
  /** Callback when message is sent */
  onMessageSent?: (message: ChatMessage) => void;
  /** Callback when response is received */
  onResponseReceived?: (response: ChatResponse) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface ChatWidgetState {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  isCollapsed: boolean;
  currentInput: string;
  streamingContent: string;
  error: string | null;
}

/**
 * ChatWidget class for Brittney AI interactions
 */
export class ChatWidget {
  private config: Required<ChatWidgetConfig>;
  private state: ChatWidgetState;
  private container: HTMLElement | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private abortController: AbortController | null = null;

  constructor(config: ChatWidgetConfig) {
    this.config = {
      position: 'bottom-right',
      collapsed: false,
      theme: 'system',
      enableVoice: false,
      enableCodeHighlight: true,
      welcomeMessage: "👋 Hi! I'm Brittney, your HoloScript assistant. I can help you build worlds, create agents, and write HoloScript code. What would you like to create today?",
      maxHistory: 50,
      streaming: true,
      placeholder: 'Ask Brittney anything about HoloScript...',
      className: '',
      zIndex: 9999,
      device: this.detectDevice(),
      onMessageSent: () => {},
      onResponseReceived: () => {},
      onError: () => {},
      ...config,
    };

    this.state = {
      messages: [{
        role: 'assistant',
        content: this.config.welcomeMessage,
        timestamp: Date.now(),
      }],
      isLoading: false,
      isTyping: false,
      isCollapsed: this.config.collapsed,
      currentInput: '',
      streamingContent: '',
      error: null,
    };
  }

  /**
   * Detect the current device type
   */
  private detectDevice(): 'mobile' | 'tablet' | 'desktop' | 'vr' | 'ar' {
    if (typeof window === 'undefined') return 'desktop';

    // Check for XR session
    if ('xr' in navigator) {
      // @ts-ignore - XR types
      const xr = navigator.xr;
      if (xr?.isSessionSupported) {
        // Could be VR or AR capable
      }
    }

    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();

    // Check for VR headsets
    if (userAgent.includes('oculus') || userAgent.includes('quest') || userAgent.includes('vive')) {
      return 'vr';
    }

    // Check for AR glasses
    if (userAgent.includes('hololens') || userAgent.includes('magic leap')) {
      return 'ar';
    }

    // Standard device detection
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Mount the widget to a container element
   */
  mount(container: HTMLElement | string): void {
    const el = typeof container === 'string' 
      ? document.querySelector<HTMLElement>(container)
      : container;

    if (!el) {
      throw new Error(`ChatWidget: Container "${container}" not found`);
    }

    this.container = el;
    this.render();
    this.attachEventListeners();
  }

  /**
   * Unmount and cleanup the widget
   */
  unmount(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    this.listeners.clear();
  }

  /**
   * Send a message to Brittney
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this.state.isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    this.state.messages.push(userMessage);
    this.state.currentInput = '';
    this.state.isLoading = true;
    this.state.error = null;
    this.config.onMessageSent(userMessage);
    this.render();

    try {
      this.abortController = new AbortController();

      if (this.config.streaming) {
        await this.handleStreamingResponse(userMessage);
      } else {
        await this.handleStandardResponse(userMessage);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        this.state.error = error.message || 'An error occurred';
        this.config.onError(error);
      }
    } finally {
      this.state.isLoading = false;
      this.state.isTyping = false;
      this.abortController = null;
      this.render();
    }
  }

  /**
   * Handle streaming response from Brittney
   */
  private async handleStreamingResponse(_userMessage: ChatMessage): Promise<void> {
    this.state.isTyping = true;
    this.state.streamingContent = '';
    this.render();

    const request: ChatRequest = {
      messages: this.state.messages.slice(-this.config.maxHistory),
      stream: true,
    };

    let fullContent = '';

    await this.config.engine.chatStream(request, (chunk: string, _done: boolean) => {
      if (this.abortController?.signal.aborted) return;
      
      fullContent += chunk;
      this.state.streamingContent = fullContent;
      this.render();
    });

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now(),
    };

    this.state.messages.push(assistantMessage);
    this.state.streamingContent = '';
    this.config.onResponseReceived({ id: 'stream', content: fullContent, model: 'brittney', finishReason: 'stop', usage: undefined });
  }

  /**
   * Handle standard (non-streaming) response
   */
  private async handleStandardResponse(_userMessage: ChatMessage): Promise<void> {
    const request: ChatRequest = {
      messages: this.state.messages.slice(-this.config.maxHistory),
    };

    const response = await this.config.engine.chat(request);

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
    };

    this.state.messages.push(assistantMessage);
    this.config.onResponseReceived(response);
  }

  /**
   * Cancel the current request
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.state.isLoading = false;
      this.state.isTyping = false;
      this.state.streamingContent = '';
      this.render();
    }
  }

  /**
   * Toggle collapsed state
   */
  toggle(): void {
    this.state.isCollapsed = !this.state.isCollapsed;
    this.render();
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.state.messages = [{
      role: 'assistant',
      content: this.config.welcomeMessage,
      timestamp: Date.now(),
    }];
    this.state.error = null;
    this.render();
  }

  /**
   * Get current messages
   */
  getMessages(): ChatMessage[] {
    return [...this.state.messages];
  }

  /**
   * Set input value programmatically
   */
  setInput(value: string): void {
    this.state.currentInput = value;
    this.render();
  }

  /**
   * Render the widget
   */
  private render(): void {
    if (!this.container) return;

    const theme = this.getTheme();
    const device = this.config.device;
    const position = this.getPositionStyles();

    this.container.innerHTML = `
      <div class="brittney-chat-widget ${theme} ${device} ${this.config.className}" 
           style="${position} z-index: ${this.config.zIndex};">
        ${this.state.isCollapsed ? this.renderCollapsed() : this.renderExpanded()}
      </div>
    `;

    this.attachEventListeners();
    this.scrollToBottom();
  }

  /**
   * Render collapsed state (just the toggle button)
   */
  private renderCollapsed(): string {
    return `
      <button class="brittney-toggle-btn" data-action="toggle" aria-label="Open Brittney Chat">
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span class="brittney-badge">B</span>
      </button>
    `;
  }

  /**
   * Render expanded chat interface
   */
  private renderExpanded(): string {
    const messagesHtml = this.state.messages
      .map(msg => this.renderMessage(msg))
      .join('');

    const streamingHtml = this.state.streamingContent 
      ? this.renderMessage({ role: 'assistant', content: this.state.streamingContent, timestamp: Date.now() }, true)
      : '';

    const typingHtml = this.state.isTyping && !this.state.streamingContent
      ? '<div class="brittney-typing"><span></span><span></span><span></span></div>'
      : '';

    return `
      <div class="brittney-chat-container">
        <header class="brittney-header">
          <div class="brittney-avatar">
            <span>B</span>
          </div>
          <div class="brittney-title">
            <h3>Brittney</h3>
            <span class="brittney-status">${this.getStatusText()}</span>
          </div>
          <div class="brittney-actions">
            <button data-action="clear" aria-label="Clear chat" title="Clear chat">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
            <button data-action="toggle" aria-label="Minimize chat">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
          </div>
        </header>
        
        <div class="brittney-messages" role="log" aria-live="polite">
          ${messagesHtml}
          ${streamingHtml}
          ${typingHtml}
          ${this.state.error ? `<div class="brittney-error">${this.state.error}</div>` : ''}
        </div>
        
        <footer class="brittney-input-area">
          <form class="brittney-form" data-action="send">
            <input 
              type="text" 
              class="brittney-input"
              placeholder="${this.config.placeholder}"
              value="${this.escapeHtml(this.state.currentInput)}"
              ${this.state.isLoading ? 'disabled' : ''}
              autocomplete="off"
            />
            ${this.config.enableVoice ? `
              <button type="button" class="brittney-voice-btn" data-action="voice" aria-label="Voice input">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            ` : ''}
            <button 
              type="submit" 
              class="brittney-send-btn" 
              ${this.state.isLoading || !this.state.currentInput.trim() ? 'disabled' : ''}
              aria-label="Send message"
            >
              ${this.state.isLoading ? `
                <svg class="brittney-spinner" viewBox="0 0 24 24" width="20" height="20">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="40 60"/>
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              `}
            </button>
          </form>
          <div class="brittney-powered-by">
            Powered by Brittney AI • ${this.config.engine.isUsingCloud() ? 'Cloud' : 'Local'} Mode
          </div>
        </footer>
      </div>
      
      <style>${this.getStyles()}</style>
    `;
  }

  /**
   * Render a single message
   */
  private renderMessage(message: ChatMessage, isStreaming = false): string {
    const isUser = message.role === 'user';
    const content = this.config.enableCodeHighlight 
      ? this.highlightCode(message.content)
      : this.escapeHtml(message.content);

    return `
      <div class="brittney-message ${isUser ? 'user' : 'assistant'} ${isStreaming ? 'streaming' : ''}">
        <div class="brittney-message-content">
          ${content}
        </div>
        ${!isStreaming ? `
          <div class="brittney-message-time">
            ${this.formatTime(message.timestamp ?? Date.now())}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Highlight code blocks in message content
   */
  private highlightCode(content: string): string {
    // Escape HTML first
    let escaped = this.escapeHtml(content);
    
    // Replace code blocks with highlighted versions
    escaped = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'holoscript';
      return `<pre class="brittney-code ${language}"><code>${code.trim()}</code></pre>`;
    });

    // Replace inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="brittney-inline-code">$1</code>');

    // Convert newlines to breaks
    escaped = escaped.replace(/\n/g, '<br/>');

    return escaped;
  }

  /**
   * Get status text
   */
  private getStatusText(): string {
    if (this.state.isTyping) return 'Thinking...';
    if (this.state.isLoading) return 'Processing...';
    return this.config.engine.isUsingCloud() ? 'Online (Cloud)' : 'Online (Local)';
  }

  /**
   * Get theme class
   */
  private getTheme(): string {
    if (this.config.theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }
    return this.config.theme;
  }

  /**
   * Get position styles based on config
   */
  private getPositionStyles(): string {
    const device = this.config.device;
    const pos = this.config.position;

    // Fullscreen for mobile or when specified
    if (pos === 'fullscreen' || (device === 'mobile' && !this.state.isCollapsed)) {
      return 'position: fixed; inset: 0;';
    }

    // VR/AR positioning - center with 3D offset
    if (device === 'vr' || device === 'ar') {
      return 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }

    const positions: Record<string, string> = {
      'bottom-right': 'position: fixed; bottom: 20px; right: 20px;',
      'bottom-left': 'position: fixed; bottom: 20px; left: 20px;',
      'top-right': 'position: fixed; top: 20px; right: 20px;',
      'top-left': 'position: fixed; top: 20px; left: 20px;',
      'center': 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);',
    };

    return positions[pos] || positions['bottom-right'];
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Toggle button
    this.container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });

    // Clear button
    this.container.querySelectorAll('[data-action="clear"]').forEach(btn => {
      btn.addEventListener('click', () => this.clearHistory());
    });

    // Form submit
    const form = this.container.querySelector<HTMLFormElement>('.brittney-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector<HTMLInputElement>('.brittney-input');
        if (input) {
          this.sendMessage(input.value);
        }
      });
    }

    // Input tracking
    const input = this.container.querySelector<HTMLInputElement>('.brittney-input');
    if (input) {
      input.addEventListener('input', (e) => {
        this.state.currentInput = (e.target as HTMLInputElement).value;
      });

      // Focus on mount
      if (!this.state.isCollapsed) {
        input.focus();
      }
    }
  }

  /**
   * Scroll messages to bottom
   */
  private scrollToBottom(): void {
    if (!this.container) return;
    const messages = this.container.querySelector<HTMLElement>('.brittney-messages');
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }

  /**
   * Format timestamp
   */
  private formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = text;
      return div.innerHTML;
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get widget styles
   */
  private getStyles(): string {
    return `
      .brittney-chat-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }

      /* Theme: Light */
      .brittney-chat-widget.light {
        --bg-primary: #ffffff;
        --bg-secondary: #f5f5f5;
        --bg-message-user: #0066cc;
        --bg-message-assistant: #e8e8e8;
        --text-primary: #1a1a1a;
        --text-secondary: #666666;
        --text-message-user: #ffffff;
        --text-message-assistant: #1a1a1a;
        --border-color: #e0e0e0;
        --accent-color: #0066cc;
        --error-color: #dc3545;
      }

      /* Theme: Dark */
      .brittney-chat-widget.dark {
        --bg-primary: #1a1a2e;
        --bg-secondary: #16213e;
        --bg-message-user: #0f3460;
        --bg-message-assistant: #2a2a4a;
        --text-primary: #e8e8e8;
        --text-secondary: #a0a0a0;
        --text-message-user: #ffffff;
        --text-message-assistant: #e8e8e8;
        --border-color: #333366;
        --accent-color: #4facfe;
        --error-color: #ff6b6b;
      }

      /* Theme: Holographic */
      .brittney-chat-widget.holographic {
        --bg-primary: rgba(10, 10, 30, 0.85);
        --bg-secondary: rgba(20, 20, 50, 0.9);
        --bg-message-user: rgba(79, 172, 254, 0.3);
        --bg-message-assistant: rgba(100, 100, 150, 0.3);
        --text-primary: #00ffff;
        --text-secondary: #80ffff;
        --text-message-user: #ffffff;
        --text-message-assistant: #00ffff;
        --border-color: rgba(0, 255, 255, 0.3);
        --accent-color: #00ffff;
        --error-color: #ff4757;
      }

      .brittney-chat-widget.holographic .brittney-chat-container {
        backdrop-filter: blur(10px);
        border: 1px solid var(--border-color);
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
      }

      /* Toggle Button */
      .brittney-toggle-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
      }

      .brittney-toggle-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }

      .brittney-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 20px;
        height: 20px;
        background: #00d9ff;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Chat Container */
      .brittney-chat-container {
        width: 380px;
        max-width: 100vw;
        height: 520px;
        max-height: 80vh;
        background: var(--bg-primary);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      }

      /* Mobile fullscreen */
      .brittney-chat-widget.mobile .brittney-chat-container {
        width: 100%;
        height: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      /* Header */
      .brittney-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-color);
        gap: 12px;
      }

      .brittney-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
      }

      .brittney-title {
        flex: 1;
      }

      .brittney-title h3 {
        margin: 0;
        font-size: 16px;
        color: var(--text-primary);
      }

      .brittney-status {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .brittney-actions {
        display: flex;
        gap: 8px;
      }

      .brittney-actions button {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: var(--text-secondary);
        border-radius: 8px;
        transition: background 0.2s;
      }

      .brittney-actions button:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
      }

      /* Messages */
      .brittney-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .brittney-message {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px;
        animation: slideIn 0.2s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .brittney-message.user {
        align-self: flex-end;
        background: var(--bg-message-user);
        color: var(--text-message-user);
        border-bottom-right-radius: 4px;
      }

      .brittney-message.assistant {
        align-self: flex-start;
        background: var(--bg-message-assistant);
        color: var(--text-message-assistant);
        border-bottom-left-radius: 4px;
      }

      .brittney-message.streaming {
        background: var(--bg-message-assistant);
        color: var(--text-message-assistant);
      }

      .brittney-message-content {
        word-wrap: break-word;
      }

      .brittney-message-time {
        font-size: 10px;
        opacity: 0.7;
        margin-top: 4px;
        text-align: right;
      }

      /* Typing indicator */
      .brittney-typing {
        display: flex;
        gap: 4px;
        padding: 16px;
      }

      .brittney-typing span {
        width: 8px;
        height: 8px;
        background: var(--accent-color);
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }

      .brittney-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .brittney-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: 0.4;
        }
        30% {
          transform: translateY(-8px);
          opacity: 1;
        }
      }

      /* Error */
      .brittney-error {
        background: var(--error-color);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
      }

      /* Code highlighting */
      .brittney-code {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 12px;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
        margin: 8px 0;
        border: 1px solid var(--border-color);
      }

      .brittney-inline-code {
        background: var(--bg-secondary);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
      }

      /* Input Area */
      .brittney-input-area {
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border-color);
      }

      .brittney-form {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .brittney-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .brittney-input:focus {
        border-color: var(--accent-color);
      }

      .brittney-input:disabled {
        opacity: 0.6;
      }

      .brittney-voice-btn,
      .brittney-send-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, opacity 0.2s;
      }

      .brittney-voice-btn {
        background: var(--bg-primary);
        color: var(--text-secondary);
      }

      .brittney-voice-btn:hover {
        color: var(--accent-color);
      }

      .brittney-send-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .brittney-send-btn:hover:not(:disabled) {
        transform: scale(1.05);
      }

      .brittney-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .brittney-spinner {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .brittney-powered-by {
        text-align: center;
        font-size: 10px;
        color: var(--text-secondary);
        margin-top: 8px;
        opacity: 0.7;
      }

      /* VR/AR specific styles */
      .brittney-chat-widget.vr .brittney-chat-container,
      .brittney-chat-widget.ar .brittney-chat-container {
        width: 500px;
        height: 600px;
        font-size: 16px;
      }

      .brittney-chat-widget.vr .brittney-input,
      .brittney-chat-widget.ar .brittney-input {
        font-size: 18px;
        padding: 14px 18px;
      }

      /* Scrollbar styling */
      .brittney-messages::-webkit-scrollbar {
        width: 6px;
      }

      .brittney-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .brittney-messages::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 3px;
      }

      .brittney-messages::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
      }
    `;
  }
}

export default ChatWidget;
