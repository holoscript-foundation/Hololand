/**
 * @holoscript/ai - AI/LLM Integration Library for HoloScript Plus
 *
 * Provides AI capabilities including chat completion, embeddings,
 * tool calling, and agents for HoloScript Plus programs.
 *
 * @example
 * ```hsplus
 * import { chat, brittney, Agent } from "@holoscript/ai";
 *
 * // Simple chat
 * let response = await chat("Explain HoloScript", { model: "brittney" });
 *
 * // Use Brittney for HoloScript help
 * let code = await brittney().generateHoloScript("Create a floating crystal");
 *
 * // Create an agent with tools
 * let agent = Agent({
 *   name: "WorldBuilder",
 *   system: "You build 3D worlds",
 *   tools: [generateHoloScriptTool],
 * });
 *
 * let result = await agent.run("Build a forest scene");
 * ```
 */

// Types
export type {
  MessageRole,
  Message,
  ToolCall,
  Tool,
  JsonSchema,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
  AIProvider,
  Conversation,
  AgentConfig,
  AgentResult,
} from './types.js';

// Providers
export {
  OllamaProvider,
  LMStudioProvider,
  ClaudeProvider,
  createProvider,
  getDefaultProvider,
} from './providers.js';

// Brittney
export {
  type BrittneyConfig,
  BrittneyProvider,
  brittney,
  askBrittney,
  generateWithBrittney,
} from './brittney.js';

// Tools
export {
  ToolBuilder,
  CommonTools,
  ToolRegistry,
  Agent,
  createAgent,
  functionTool,
} from './tools.js';

// Embeddings
export {
  Similarity,
  type EmbeddedDocument,
  type SearchResult,
  type VectorStoreOptions,
  VectorStore,
  EmbeddingService,
  RAGHelper,
  chunkText,
  chunkHoloScript,
} from './embeddings.js';

// Templates
export {
  type Template,
  type TemplateParameter,
  Templates,
  getTemplatesByCategory,
  generateFromTemplate,
  listTemplates,
  // Individual templates
  EmptyWorldTemplate,
  GalleryWorldTemplate,
  OutdoorWorldTemplate,
  SimpleNPCTemplate,
  PatrollingNPCTemplate,
  InventorySystemTemplate,
  HealthSystemTemplate,
  GlowingMaterialTemplate,
} from './templates/index.js';

import type { Message, CompletionOptions, CompletionResponse, StreamChunk, AIProvider } from './types.js';
import { getDefaultProvider } from './providers.js';
import { BrittneyProvider } from './brittney.js';

// Cached default provider
let defaultProvider: AIProvider | null = null;

/**
 * Get or create the default provider
 */
async function ensureProvider(): Promise<AIProvider> {
  if (!defaultProvider) {
    try {
      defaultProvider = await getDefaultProvider();
    } catch {
      // Default to Brittney if no other provider available
      defaultProvider = new BrittneyProvider();
    }
  }
  return defaultProvider;
}

/**
 * Simple chat function
 */
export async function chat(
  messageOrMessages: string | Message[],
  options?: CompletionOptions
): Promise<CompletionResponse> {
  const provider = await ensureProvider();

  const messages: Message[] =
    typeof messageOrMessages === 'string'
      ? [{ role: 'user', content: messageOrMessages }]
      : messageOrMessages;

  return provider.chat(messages, options);
}

/**
 * Stream a chat response
 */
export async function* chatStream(
  messageOrMessages: string | Message[],
  options?: CompletionOptions
): AsyncIterable<StreamChunk> {
  const provider = await ensureProvider();

  const messages: Message[] =
    typeof messageOrMessages === 'string'
      ? [{ role: 'user', content: messageOrMessages }]
      : messageOrMessages;

  yield* provider.chatStream(messages, options);
}

/**
 * Quick completion (returns just the text)
 */
export async function complete(prompt: string, options?: CompletionOptions): Promise<string> {
  const response = await chat(prompt, options);
  return response.content;
}

/**
 * Generate embeddings
 */
export async function embed(
  texts: string | string[],
  options?: { model?: string; dimensions?: number }
): Promise<number[][]> {
  const provider = await ensureProvider();
  const textsArray = Array.isArray(texts) ? texts : [texts];
  const response = await provider.embed(textsArray, options);
  return response.embeddings;
}

/**
 * Set the default provider
 */
export function setDefaultProvider(provider: AIProvider): void {
  defaultProvider = provider;
}

/**
 * Build a conversation
 */
export class ConversationBuilder {
  private messages: Message[] = [];
  private options: CompletionOptions = {};

  system(content: string): this {
    this.messages = this.messages.filter((m) => m.role !== 'system');
    this.messages.unshift({ role: 'system', content });
    return this;
  }

  user(content: string): this {
    this.messages.push({ role: 'user', content });
    return this;
  }

  assistant(content: string): this {
    this.messages.push({ role: 'assistant', content });
    return this;
  }

  withOptions(options: CompletionOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  temperature(value: number): this {
    this.options.temperature = value;
    return this;
  }

  maxTokens(value: number): this {
    this.options.maxTokens = value;
    return this;
  }

  model(value: string): this {
    this.options.model = value;
    return this;
  }

  async send(): Promise<CompletionResponse> {
    return chat(this.messages, this.options);
  }

  async *stream(): AsyncIterable<StreamChunk> {
    yield* chatStream(this.messages, { ...this.options, stream: true });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }
}

/**
 * Create a conversation builder
 */
export function conversation(): ConversationBuilder {
  return new ConversationBuilder();
}

/**
 * Prompt templates
 */
export const Prompts = {
  /**
   * Create a HoloScript generation prompt
   */
  generateHoloScript: (description: string, type: 'holo' | 'hsplus' = 'hsplus'): string => `
Generate ${type === 'holo' ? 'HoloScript (.holo)' : 'HoloScript Plus (.hsplus)'} code for:
${description}

Requirements:
- Use proper ${type === 'holo' ? 'HoloScript' : 'HoloScript Plus'} syntax
- Include necessary imports
- Add helpful comments
- Make the code production-ready

Return only the code, no explanations.
`.trim(),

  /**
   * Create a code review prompt
   */
  reviewCode: (code: string, language = 'hsplus'): string => `
Review this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Brief summary of what the code does
2. Potential issues or bugs
3. Performance considerations
4. Suggestions for improvement
`.trim(),

  /**
   * Create a code explanation prompt
   */
  explainCode: (code: string, language = 'hsplus'): string => `
Explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Include:
- What the code does at a high level
- How each part works
- Any important patterns or techniques used
- When you might use code like this
`.trim(),

  /**
   * Create a debugging prompt
   */
  debugCode: (code: string, error: string, language = 'hsplus'): string => `
Debug this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Error: ${error}

Provide:
1. What's causing the error
2. How to fix it
3. The corrected code
`.trim(),

  /**
   * Create a world building prompt
   */
  buildWorld: (description: string): string => `
Create a 3D world/scene in HoloScript Plus:
${description}

Include:
- Appropriate orbs and geometry
- Materials and colors
- Lighting setup
- Optional: physics, audio, interactions

Return complete, runnable HoloScript Plus code.
`.trim(),
};
