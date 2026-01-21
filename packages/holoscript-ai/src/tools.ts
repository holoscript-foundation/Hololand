/**
 * @holoscript/ai - Tool System
 *
 * Tools and function calling support for AI agents.
 */

import type { Tool, JsonSchema, ToolCall, Message, AIProvider, AgentConfig, AgentResult } from './types.js';

/**
 * Tool builder for creating tool definitions
 */
export class ToolBuilder {
  private tool: Tool;

  constructor(name: string) {
    this.tool = {
      type: 'function',
      function: {
        name,
        description: '',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    };
  }

  static create(name: string): ToolBuilder {
    return new ToolBuilder(name);
  }

  description(desc: string): this {
    this.tool.function.description = desc;
    return this;
  }

  param(name: string, schema: Omit<Partial<JsonSchema>, 'required'> & { required?: boolean }): this {
    const { required, ...paramSchema } = schema;
    (this.tool.function.parameters.properties as Record<string, JsonSchema>)[name] = {
      type: 'string',
      ...paramSchema,
    } as JsonSchema;

    if (required) {
      this.tool.function.parameters.required!.push(name);
    }
    return this;
  }

  string(name: string, description?: string, isRequired = false): this {
    return this.param(name, { type: 'string', description, required: isRequired });
  }

  number(name: string, description?: string, isRequired = false): this {
    return this.param(name, { type: 'number', description, required: isRequired });
  }

  boolean(name: string, description?: string, isRequired = false): this {
    return this.param(name, { type: 'boolean', description, required: isRequired });
  }

  enum(name: string, values: string[], description?: string, isRequired = false): this {
    return this.param(name, { type: 'string', enum: values, description, required: isRequired });
  }

  array(name: string, items: Partial<JsonSchema>, description?: string, isRequired = false): this {
    return this.param(name, { type: 'array', items: items as JsonSchema, description, required: isRequired });
  }

  object(name: string, properties: Record<string, Partial<JsonSchema>>, description?: string, isRequired = false): this {
    return this.param(name, {
      type: 'object',
      properties: properties as Record<string, JsonSchema>,
      description,
      required: isRequired,
    });
  }

  build(): Tool {
    return this.tool;
  }
}

/**
 * Predefined tools for common operations
 */
export const CommonTools = {
  /**
   * Web search tool
   */
  webSearch: ToolBuilder.create('web_search')
    .description('Search the web for information')
    .string('query', 'The search query', true)
    .number('limit', 'Maximum number of results')
    .build(),

  /**
   * Read file tool
   */
  readFile: ToolBuilder.create('read_file')
    .description('Read the contents of a file')
    .string('path', 'Path to the file', true)
    .build(),

  /**
   * Write file tool
   */
  writeFile: ToolBuilder.create('write_file')
    .description('Write content to a file')
    .string('path', 'Path to the file', true)
    .string('content', 'Content to write', true)
    .build(),

  /**
   * Execute code tool
   */
  executeCode: ToolBuilder.create('execute_code')
    .description('Execute code in a sandbox')
    .string('language', 'Programming language', true)
    .string('code', 'Code to execute', true)
    .build(),

  /**
   * Get current time tool
   */
  getCurrentTime: ToolBuilder.create('get_current_time')
    .description('Get the current date and time')
    .string('timezone', 'Timezone (e.g., "UTC", "America/New_York")')
    .build(),

  /**
   * Calculate tool
   */
  calculate: ToolBuilder.create('calculate')
    .description('Perform a mathematical calculation')
    .string('expression', 'Mathematical expression to evaluate', true)
    .build(),

  /**
   * Generate HoloScript tool
   */
  generateHoloScript: ToolBuilder.create('generate_holoscript')
    .description('Generate HoloScript code from a description')
    .string('description', 'Description of what to generate', true)
    .enum('type', ['holo', 'hsplus'], 'Output type (holo or hsplus)')
    .build(),

  /**
   * Analyze scene tool
   */
  analyzeScene: ToolBuilder.create('analyze_scene')
    .description('Analyze a HoloScript scene for optimization opportunities')
    .string('code', 'HoloScript code to analyze', true)
    .build(),
};

/**
 * Tool registry for managing tools and handlers
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private handlers: Map<string, (args: unknown) => Promise<unknown>> = new Map();

  /**
   * Register a tool with its handler
   */
  register(tool: Tool, handler: (args: unknown) => Promise<unknown>): this {
    this.tools.set(tool.function.name, tool);
    this.handlers.set(tool.function.name, handler);
    return this;
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): this {
    this.tools.delete(name);
    this.handlers.delete(name);
    return this;
  }

  /**
   * Get all registered tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool call
   */
  async execute(toolCall: ToolCall): Promise<unknown> {
    const handler = this.handlers.get(toolCall.function.name);
    if (!handler) {
      throw new Error(`No handler registered for tool: ${toolCall.function.name}`);
    }

    const args = JSON.parse(toolCall.function.arguments);
    return handler(args);
  }

  /**
   * Execute multiple tool calls
   */
  async executeAll(toolCalls: ToolCall[]): Promise<Array<{ id: string; result: unknown; error?: string }>> {
    return Promise.all(
      toolCalls.map(async (call) => {
        try {
          const result = await this.execute(call);
          return { id: call.id, result };
        } catch (error) {
          return {
            id: call.id,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
  }
}

/**
 * AI Agent with tool support
 */
export class Agent {
  private config: AgentConfig;
  private provider: AIProvider;
  private registry: ToolRegistry;
  private messages: Message[] = [];

  constructor(config: AgentConfig) {
    this.config = {
      maxIterations: 10,
      temperature: 0.7,
      ...config,
    };

    if (!config.provider) {
      throw new Error('Agent requires a provider');
    }

    this.provider = config.provider;
    this.registry = new ToolRegistry();

    // Register tools and handlers
    if (config.tools) {
      for (const tool of config.tools) {
        const handler = config.toolHandlers?.[tool.function.name];
        if (handler) {
          this.registry.register(tool, handler);
        }
      }
    }
  }

  /**
   * Run the agent with a user message
   */
  async run(userMessage: string): Promise<AgentResult> {
    // Initialize messages with system prompt
    this.messages = [
      { role: 'system', content: this.config.system },
      { role: 'user', content: userMessage },
    ];

    const toolCallsHistory: AgentResult['toolCalls'] = [];
    let totalTokens = 0;
    let iterations = 0;

    while (iterations < this.config.maxIterations!) {
      iterations++;

      // Get completion
      const response = await this.provider.chat(this.messages, {
        model: this.config.model,
        temperature: this.config.temperature,
        tools: this.registry.getTools(),
        toolChoice: this.registry.getTools().length > 0 ? 'auto' : undefined,
      });

      totalTokens += response.usage?.totalTokens || 0;

      // Add assistant message
      this.messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          response: response.content,
          toolCalls: toolCallsHistory,
          iterations,
          totalTokens,
          messages: this.messages,
        };
      }

      // Execute tool calls
      const results = await this.registry.executeAll(response.toolCalls);

      // Add tool results as messages
      for (const result of results) {
        const toolCall = response.toolCalls.find((tc) => tc.id === result.id);
        if (toolCall) {
          toolCallsHistory.push({
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            result: result.result,
          });

          this.messages.push({
            role: 'tool',
            content: result.error || JSON.stringify(result.result),
            toolCallId: result.id,
          });
        }
      }
    }

    // Max iterations reached
    return {
      response: 'Max iterations reached. The task may be incomplete.',
      toolCalls: toolCallsHistory,
      iterations,
      totalTokens,
      messages: this.messages,
    };
  }

  /**
   * Continue the conversation with a new message
   */
  async continue(message: string): Promise<AgentResult> {
    this.messages.push({ role: 'user', content: message });
    return this.run(message);
  }

  /**
   * Reset the conversation
   */
  reset(): void {
    this.messages = [];
  }

  /**
   * Get the conversation history
   */
  getHistory(): Message[] {
    return [...this.messages];
  }
}

/**
 * Create an agent with common tools
 */
export function createAgent(
  config: Omit<AgentConfig, 'tools' | 'toolHandlers'> & {
    tools?: Array<'webSearch' | 'readFile' | 'writeFile' | 'executeCode' | 'calculate' | 'generateHoloScript' | 'getCurrentTime'>;
    customTools?: Tool[];
    customHandlers?: Record<string, (args: unknown) => Promise<unknown>>;
  }
): Agent {
  const tools: Tool[] = [];
  const handlers: Record<string, (args: unknown) => Promise<unknown>> = {};

  // Add requested common tools
  if (config.tools?.includes('calculate')) {
    tools.push(CommonTools.calculate);
    handlers['calculate'] = async (args: unknown) => {
      const { expression } = args as { expression: string };
      // Safe math evaluation (basic operations only)
      const result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().%\s]/g, '')})`)();
      return { result };
    };
  }

  if (config.tools?.includes('getCurrentTime')) {
    tools.push(CommonTools.getCurrentTime);
    handlers['get_current_time'] = async (args: unknown) => {
      const { timezone } = args as { timezone?: string };
      const date = new Date();
      return {
        iso: date.toISOString(),
        local: timezone
          ? date.toLocaleString('en-US', { timeZone: timezone })
          : date.toLocaleString(),
        timestamp: date.getTime(),
      };
    };
  }

  // Add custom tools
  if (config.customTools) {
    tools.push(...config.customTools);
  }

  if (config.customHandlers) {
    Object.assign(handlers, config.customHandlers);
  }

  return new Agent({
    ...config,
    tools,
    toolHandlers: handlers,
  });
}

/**
 * Create a simple function as a tool
 */
export function functionTool<T extends Record<string, unknown>, R>(
  name: string,
  description: string,
  parameters: Record<string, { type: JsonSchema['type']; description?: string; required?: boolean }>,
  handler: (args: T) => Promise<R>
): { tool: Tool; handler: (args: unknown) => Promise<R> } {
  const builder = ToolBuilder.create(name).description(description);

  for (const [paramName, paramDef] of Object.entries(parameters)) {
    builder.param(paramName, {
      type: paramDef.type,
      description: paramDef.description,
      required: paramDef.required,
    });
  }

  return {
    tool: builder.build(),
    handler: handler as (args: unknown) => Promise<R>,
  };
}
