/**
 * HoloScript+ Parser
 *
 * Lightweight parser for reading HoloScript+ (.hs) files.
 * Extracts structured data for use in TypeScript runtime.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface HSMeta {
  id: string;
  name: string;
  version: string;
  [key: string]: unknown;
}

export interface HSKnowledgeChunk {
  id: string;
  category: string;
  content: string;
  keywords: string[];
  description?: string;
}

export interface HSPrompt {
  id: string;
  role?: string;
  name?: string;
  domain?: string;
  extends?: string;
  context?: string;
  instructions?: string;
  tone?: string;
  example?: string;
  output_format?: string;
  [key: string]: unknown;
}

export interface HSRoute {
  method: string;
  path: string;
  description: string;
  handler: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  auth_required?: boolean;
  response_type?: string;
}

export interface HSProvider {
  id: string;
  name: string;
  color: string;
  endpoint: string;
  priority: number;
  enabled?: boolean;
}

export interface HSParsedFile {
  meta: HSMeta;
  raw: string;
}

export interface HSKnowledgeFile extends HSParsedFile {
  chunks: HSKnowledgeChunk[];
  categories: string[];
}

export interface HSPromptFile extends HSParsedFile {
  prompts: Map<string, HSPrompt>;
  modes: string[];
}

export interface HSServerFile extends HSParsedFile {
  routes: HSRoute[];
  providers: string[];
  port: number;
}

// =============================================================================
// Parser Utilities
// =============================================================================

/**
 * Extract content between triple backticks
 */
function extractMultilineString(content: string): string {
  const match = content.match(/```\s*([\s\S]*?)\s*```/);
  return match ? match[1].trim() : content.replace(/^["']|["']$/g, '');
}

/**
 * Extract array items from HoloScript array syntax
 */
function extractArray(content: string): string[] {
  const match = content.match(/\[([\s\S]*?)\]/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map(s => s.trim().replace(/^["']|["']$/g, ''))
    .filter(s => s.length > 0);
}

/**
 * Parse meta block
 */
function parseMeta(content: string): HSMeta {
  const metaMatch = content.match(/meta\s*\{([\s\S]*?)\n\}/);
  if (!metaMatch) {
    return { id: 'unknown', name: 'Unknown', version: '1.0.0' };
  }

  const metaContent = metaMatch[1];
  const meta: HSMeta = { id: 'unknown', name: 'Unknown', version: '1.0.0' };

  const idMatch = metaContent.match(/id:\s*["']([^"']+)["']/);
  if (idMatch) meta.id = idMatch[1];

  const nameMatch = metaContent.match(/name:\s*["']([^"']+)["']/);
  if (nameMatch) meta.name = nameMatch[1];

  const versionMatch = metaContent.match(/version:\s*["']([^"']+)["']/);
  if (versionMatch) meta.version = versionMatch[1];

  return meta;
}

// =============================================================================
// Knowledge Parser
// =============================================================================

/**
 * Parse knowledge base HoloScript+ file
 */
export function parseKnowledgeFile(filePath: string): HSKnowledgeFile {
  if (!existsSync(filePath)) {
    throw new Error(`Knowledge file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const meta = parseMeta(raw);
  const chunks: HSKnowledgeChunk[] = [];
  const categories = new Set<string>();

  // Parse knowledge chunks
  const chunkRegex = /chunk\s+(\w+)\s*\{([\s\S]*?)^\s*\}/gm;
  let match;

  while ((match = chunkRegex.exec(raw)) !== null) {
    const chunkId = match[1];
    const chunkContent = match[2];

    const categoryMatch = chunkContent.match(/category:\s*["']([^"']+)["']/);
    const category = categoryMatch ? categoryMatch[1] : 'general';
    categories.add(category);

    const keywordsMatch = chunkContent.match(/keywords:\s*\[([\s\S]*?)\]/);
    const keywords = keywordsMatch ? extractArray(`[${keywordsMatch[1]}]`) : [];

    const descriptionMatch = chunkContent.match(/description:\s*["']([^"']+)["']/);
    const description = descriptionMatch ? descriptionMatch[1] : undefined;

    const exampleMatch = chunkContent.match(/example:\s*```([\s\S]*?)```/);
    const content = exampleMatch ? exampleMatch[1].trim() : '';

    chunks.push({
      id: chunkId,
      category,
      content,
      keywords,
      description,
    });
  }

  return {
    meta,
    raw,
    chunks,
    categories: Array.from(categories),
  };
}

// =============================================================================
// Prompts Parser
// =============================================================================

/**
 * Parse prompts HoloScript+ file
 */
export function parsePromptsFile(filePath: string): HSPromptFile {
  if (!existsSync(filePath)) {
    throw new Error(`Prompts file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const meta = parseMeta(raw);
  const prompts = new Map<string, HSPrompt>();
  const modes: string[] = [];

  // Extract modes from meta
  const modesMatch = raw.match(/modes:\s*\[([\s\S]*?)\]/);
  if (modesMatch) {
    modes.push(...extractArray(`[${modesMatch[1]}]`));
  }

  // Parse prompt blocks
  const promptRegex = /prompt\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match;

  while ((match = promptRegex.exec(raw)) !== null) {
    const promptId = match[1];
    const promptContent = match[2];

    const prompt: HSPrompt = { id: promptId };

    // Parse simple string properties
    const simpleProps = ['role', 'name', 'domain', 'extends', 'context', 'tone'];
    for (const prop of simpleProps) {
      const propMatch = promptContent.match(new RegExp(`${prop}:\\s*["']([^"']+)["']`));
      if (propMatch) {
        prompt[prop] = propMatch[1];
      }
    }

    // Parse multiline properties
    const multilineProps = ['identity', 'instructions', 'output_format', 'example'];
    for (const prop of multilineProps) {
      const propMatch = promptContent.match(new RegExp(`${prop}:\\s*\`\`\`([\\s\\S]*?)\`\`\``));
      if (propMatch) {
        prompt[prop] = propMatch[1].trim();
      }
    }

    // Parse arrays
    const arrayProps = ['principles', 'expertise'];
    for (const prop of arrayProps) {
      const propMatch = promptContent.match(new RegExp(`${prop}:\\s*\\[([\\s\\S]*?)\\]`));
      if (propMatch) {
        prompt[prop] = extractArray(`[${propMatch[1]}]`);
      }
    }

    prompts.set(promptId, prompt);
  }

  return {
    meta,
    raw,
    prompts,
    modes,
  };
}

// =============================================================================
// Server Routes Parser
// =============================================================================

/**
 * Parse server routes HoloScript+ file
 */
export function parseServerFile(filePath: string): HSServerFile {
  if (!existsSync(filePath)) {
    throw new Error(`Server file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const meta = parseMeta(raw);
  const routes: HSRoute[] = [];
  const providers: string[] = [];

  // Extract port
  const portMatch = raw.match(/port:\s*(\d+)/);
  const port = portMatch ? parseInt(portMatch[1], 10) : 11435;

  // Parse routes (POST, GET, WS)
  const routeRegex = /(POST|GET|WS)\s+(\/[^\s{]*)\s*\{([\s\S]*?)^\s*\}/gm;
  let match;

  while ((match = routeRegex.exec(raw)) !== null) {
    const method = match[1];
    const path = match[2];
    const routeContent = match[3];

    const descMatch = routeContent.match(/description:\s*["']([^"']+)["']/);
    const handlerMatch = routeContent.match(/handler:\s*(\w+)/);

    routes.push({
      method,
      path,
      description: descMatch ? descMatch[1] : '',
      handler: handlerMatch ? handlerMatch[1] : 'default_handler',
    });
  }

  // Extract provider IDs from switch endpoint enum
  const providerEnumMatch = raw.match(/enum:\s*\[([\s\S]*?)\]/);
  if (providerEnumMatch) {
    const providerList = extractArray(`[${providerEnumMatch[1]}]`);
    providers.push(...providerList);
  }

  return {
    meta,
    raw,
    routes,
    providers,
    port,
  };
}

// =============================================================================
// File Discovery
// =============================================================================

const KNOWLEDGE_DIR = join(__dirname);

/**
 * Get path to a knowledge file
 */
export function getKnowledgePath(filename: string): string {
  return join(KNOWLEDGE_DIR, filename);
}

/**
 * Load all knowledge files
 */
export function loadAllKnowledge(): {
  knowledge: HSKnowledgeFile;
  prompts: HSPromptFile;
  server: HSServerFile;
} {
  return {
    knowledge: parseKnowledgeFile(getKnowledgePath('holoscript-knowledge.hs')),
    prompts: parsePromptsFile(getKnowledgePath('brittney-prompts.hs')),
    server: parseServerFile(getKnowledgePath('brittney-server.hs')),
  };
}
