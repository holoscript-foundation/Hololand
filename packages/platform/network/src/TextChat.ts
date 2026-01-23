/**
 * @hololand/network TextChat
 *
 * Real-time text messaging system for rooms
 */

import { logger } from './logger';
import type { NetworkClient } from './NetworkClient';
import type { ChatMessage, ChatConfig, MessageType } from './types';

const DEFAULT_CONFIG: Required<ChatConfig> = {
  maxMessageLength: 500,
  rateLimit: 5, // messages per second
  profanityFilter: false,
  allowEmotes: true,
  historySize: 100,
};

export interface TextChatEventMap {
  message: { message: ChatMessage };
  history: { messages: ChatMessage[] };
  rateLimit: { remainingMs: number };
  error: { message: string };
}

export type TextChatEventType = keyof TextChatEventMap;
export type TextChatEventHandler<T extends TextChatEventType> = (
  event: TextChatEventMap[T]
) => void;

// Simple emote definitions
const EMOTES: Record<string, string> = {
  ':)': '\u{1F642}',
  ':(': '\u{2639}',
  ':D': '\u{1F604}',
  ':P': '\u{1F61B}',
  ';)': '\u{1F609}',
  '<3': '\u{2764}',
  ':thumbsup:': '\u{1F44D}',
  ':thumbsdown:': '\u{1F44E}',
  ':fire:': '\u{1F525}',
  ':star:': '\u{2B50}',
  ':wave:': '\u{1F44B}',
  ':clap:': '\u{1F44F}',
  ':party:': '\u{1F389}',
  ':rocket:': '\u{1F680}',
  ':vr:': '\u{1F97D}',
};

export class TextChat {
  private config: Required<ChatConfig>;
  private client: NetworkClient;
  private roomId: string | null = null;
  private messages: ChatMessage[] = [];
  private lastSendTime: number = 0;
  private sendCount: number = 0;
  private rateLimitResetTime: number = 0;
  private localDisplayName: string = 'Player';

  private eventListeners: Map<
    TextChatEventType,
    Set<TextChatEventHandler<TextChatEventType>>
  > = new Map();
  private unsubscribers: (() => void)[] = [];

  constructor(client: NetworkClient, config: ChatConfig = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupMessageHandlers();
    logger.info('TextChat initialized', { config: this.config });
  }

  // ============================================================================
  // Chat Control
  // ============================================================================

  joinRoom(roomId: string, displayName: string): void {
    this.roomId = roomId;
    this.localDisplayName = displayName;
    this.messages = [];

    // Request history
    this.client.send({
      type: 'chatJoin',
      category: 'chat',
      payload: { roomId },
      timestamp: Date.now(),
    });

    logger.info('Joined chat room', { roomId });
  }

  leaveRoom(): void {
    if (!this.roomId) return;

    this.client.send({
      type: 'chatLeave',
      category: 'chat',
      payload: { roomId: this.roomId },
      timestamp: Date.now(),
    });

    this.roomId = null;
    this.messages = [];
    logger.info('Left chat room');
  }

  // ============================================================================
  // Sending Messages
  // ============================================================================

  send(content: string): boolean {
    if (!this.roomId) {
      logger.warn('Cannot send message: not in a room');
      return false;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      const remaining = this.rateLimitResetTime - Date.now();
      this.emit('rateLimit', { remainingMs: remaining });
      return false;
    }

    // Validate and process content
    const processedContent = this.processContent(content);
    if (!processedContent) {
      this.emit('error', { message: 'Invalid message content' });
      return false;
    }

    const message: ChatMessage = {
      id: this.generateMessageId(),
      type: 'text',
      senderId: this.client.getClientId(),
      senderName: this.localDisplayName,
      content: processedContent,
      timestamp: Date.now(),
      roomId: this.roomId,
    };

    this.client.send({
      type: 'chatMessage',
      category: 'chat',
      payload: message,
      timestamp: Date.now(),
    });

    // Add to local history
    this.addMessage(message);
    this.updateRateLimit();

    return true;
  }

  sendEmote(emoteName: string): boolean {
    if (!this.config.allowEmotes) {
      this.emit('error', { message: 'Emotes are disabled' });
      return false;
    }

    const emote = EMOTES[emoteName] || emoteName;
    return this.sendAsType(`*${emote}*`, 'emote');
  }

  sendWhisper(targetId: string, content: string): boolean {
    if (!this.roomId) return false;

    const processedContent = this.processContent(content);
    if (!processedContent) return false;

    const message: ChatMessage = {
      id: this.generateMessageId(),
      type: 'whisper',
      senderId: this.client.getClientId(),
      senderName: this.localDisplayName,
      content: processedContent,
      timestamp: Date.now(),
      roomId: this.roomId,
      targetId,
    };

    this.client.send({
      type: 'chatWhisper',
      category: 'chat',
      payload: message,
      timestamp: Date.now(),
    });

    // Add to local history
    this.addMessage(message);

    return true;
  }

  private sendAsType(content: string, type: MessageType): boolean {
    if (!this.roomId) return false;

    if (!this.checkRateLimit()) {
      return false;
    }

    const message: ChatMessage = {
      id: this.generateMessageId(),
      type,
      senderId: this.client.getClientId(),
      senderName: this.localDisplayName,
      content,
      timestamp: Date.now(),
      roomId: this.roomId,
    };

    this.client.send({
      type: 'chatMessage',
      category: 'chat',
      payload: message,
      timestamp: Date.now(),
    });

    this.addMessage(message);
    this.updateRateLimit();

    return true;
  }

  // ============================================================================
  // Content Processing
  // ============================================================================

  private processContent(content: string): string | null {
    // Trim and check length
    const trimmed = content.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > this.config.maxMessageLength) {
      return trimmed.substring(0, this.config.maxMessageLength);
    }

    let processed = trimmed;

    // Convert emotes
    if (this.config.allowEmotes) {
      Object.entries(EMOTES).forEach(([code, emoji]) => {
        processed = processed.split(code).join(emoji);
      });
    }

    return processed;
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  private checkRateLimit(): boolean {
    const now = Date.now();

    // Reset counter if window passed
    if (now >= this.rateLimitResetTime) {
      this.sendCount = 0;
      this.rateLimitResetTime = now + 1000;
    }

    return this.sendCount < this.config.rateLimit;
  }

  private updateRateLimit(): void {
    this.lastSendTime = Date.now();
    this.sendCount++;
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  private setupMessageHandlers(): void {
    // Incoming message
    this.unsubscribers.push(
      this.client.onMessage('chatMessage', (message) => {
        const chatMsg = message.payload as ChatMessage;

        // Skip if not our room
        if (chatMsg.roomId !== this.roomId) return;

        // Skip our own messages (already added locally)
        if (chatMsg.senderId === this.client.getClientId()) return;

        this.addMessage(chatMsg);
        this.emit('message', { message: chatMsg });
      })
    );

    // Whisper received
    this.unsubscribers.push(
      this.client.onMessage('chatWhisper', (message) => {
        const chatMsg = message.payload as ChatMessage;

        // Only receive whispers meant for us
        if (chatMsg.targetId !== this.client.getClientId()) return;

        this.addMessage(chatMsg);
        this.emit('message', { message: chatMsg });
      })
    );

    // History received
    this.unsubscribers.push(
      this.client.onMessage('chatHistory', (message) => {
        const { messages } = message.payload as { messages: ChatMessage[] };

        messages.forEach((msg) => this.addMessage(msg));
        this.emit('history', { messages: this.messages });
      })
    );

    // System message
    this.unsubscribers.push(
      this.client.onMessage('chatSystem', (message) => {
        const { content } = message.payload as { content: string };

        const systemMsg: ChatMessage = {
          id: this.generateMessageId(),
          type: 'system',
          senderId: 'system',
          senderName: 'System',
          content,
          timestamp: Date.now(),
          roomId: this.roomId || undefined,
        };

        this.addMessage(systemMsg);
        this.emit('message', { message: systemMsg });
      })
    );
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);

    // Trim to history size
    while (this.messages.length > this.config.historySize) {
      this.messages.shift();
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends TextChatEventType>(
    event: T,
    handler: TextChatEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(
      handler as TextChatEventHandler<TextChatEventType>
    );

    return () => this.off(event, handler);
  }

  off<T extends TextChatEventType>(
    event: T,
    handler: TextChatEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(
      handler as TextChatEventHandler<TextChatEventType>
    );
  }

  private emit<T extends TextChatEventType>(
    event: T,
    data: TextChatEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getRecentMessages(count: number): ChatMessage[] {
    return this.messages.slice(-count);
  }

  getMessageById(id: string): ChatMessage | undefined {
    return this.messages.find((m) => m.id === id);
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  isInRoom(): boolean {
    return this.roomId !== null;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  clearHistory(): void {
    this.messages = [];
  }

  getAvailableEmotes(): Record<string, string> {
    return { ...EMOTES };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.leaveRoom();
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.eventListeners.clear();
    logger.info('TextChat destroyed');
  }
}
