/**
 * Core types for Brittney Toolkit
 */

/**
 * Chat message format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * Chat request
 */
export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Chat response
 */
export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'error';
}

/**
 * Streaming callback
 */
export type StreamCallback = (chunk: string, done: boolean) => void;

/**
 * Inference provider interface
 */
export interface InferenceProvider {
  /** Provider name */
  readonly name: string;
  
  /** Whether provider is ready */
  isReady(): Promise<boolean>;
  
  /** Initialize the provider */
  initialize(): Promise<void>;
  
  /** Chat completion */
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  /** Streaming chat completion */
  chatStream(request: ChatRequest, callback: StreamCallback): Promise<void>;
  
  /** Cleanup resources */
  dispose(): Promise<void>;
}

/**
 * Supported cloud providers (user brings their own API key)
 */
export type SupportedCloudProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'together'
  | 'ollama'; // Local Ollama server

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Streaming chunk for progressive responses
 */
export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}
