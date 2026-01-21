/**
 * @holoscript/ai - Type Definitions
 *
 * Core types for the AI/LLM integration library.
 */

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/**
 * Tool/function call
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool definition
 */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
}

/**
 * JSON Schema type (simplified)
 */
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number | boolean | null)[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Chat completion options
 */
export interface CompletionOptions {
  /** Model to use */
  model?: string;
  /** System prompt */
  system?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Top P sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
  /** Tools/functions */
  tools?: Tool[];
  /** Tool choice */
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  /** Stream response */
  stream?: boolean;
  /** JSON mode */
  jsonMode?: boolean;
  /** Request timeout in ms */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Chat completion response
 */
export interface CompletionResponse {
  /** Generated content */
  content: string;
  /** Tool calls (if any) */
  toolCalls?: ToolCall[];
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Model used */
  model: string;
  /** Response ID */
  id: string;
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  /** Content delta */
  content?: string;
  /** Tool call delta */
  toolCalls?: Partial<ToolCall>[];
  /** Is final chunk */
  done: boolean;
  /** Finish reason (on final chunk) */
  finishReason?: string;
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  /** Model to use */
  model?: string;
  /** Dimensions (if model supports) */
  dimensions?: number;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  /** Embedding vectors */
  embeddings: number[][];
  /** Model used */
  model: string;
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** API key */
  apiKey?: string;
  /** Base URL */
  baseUrl?: string;
  /** Default model */
  defaultModel?: string;
  /** Organization ID */
  organization?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Request timeout */
  timeout?: number;
}

/**
 * AI provider interface
 */
export interface AIProvider {
  /** Provider name */
  readonly name: string;

  /** Complete a chat */
  chat(messages: Message[], options?: CompletionOptions): Promise<CompletionResponse>;

  /** Stream a chat completion */
  chatStream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;

  /** Generate embeddings */
  embed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse>;

  /** List available models */
  listModels(): Promise<string[]>;
}

/**
 * Conversation history
 */
export interface Conversation {
  /** Conversation ID */
  id: string;
  /** Messages */
  messages: Message[];
  /** System prompt */
  system?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent name */
  name: string;
  /** Agent description */
  description?: string;
  /** System prompt */
  system: string;
  /** Available tools */
  tools?: Tool[];
  /** Tool handlers */
  toolHandlers?: Record<string, (args: unknown) => Promise<unknown>>;
  /** Model to use */
  model?: string;
  /** Provider to use */
  provider?: AIProvider;
  /** Max iterations for tool loops */
  maxIterations?: number;
  /** Temperature */
  temperature?: number;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Final response */
  response: string;
  /** Tool calls made */
  toolCalls: Array<{
    name: string;
    arguments: unknown;
    result: unknown;
  }>;
  /** Total iterations */
  iterations: number;
  /** Total tokens used */
  totalTokens: number;
  /** Conversation messages */
  messages: Message[];
}
