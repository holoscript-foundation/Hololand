# HoloScript/Hololand MCP Best Practices

This document provides best practices for building, using, and extending MCP servers for the HoloScript ecosystem.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Design Principles](#server-design-principles)
3. [Tool Design Guidelines](#tool-design-guidelines)
4. [Configuration Best Practices](#configuration-best-practices)
5. [IDE Integration Patterns](#ide-integration-patterns)
6. [Security Considerations](#security-considerations)
7. [Testing MCP Tools](#testing-mcp-tools)
8. [Training Data for AI](#training-data-for-ai)
9. [AI Assistant Configuration](#ai-assistant-configuration)

---

## Architecture Overview

### Two-Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           AI AGENTS (Brittney, Copilot, Claude, Cursor)     │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     Brittney MCP        │   │    HoloScript MCP       │
│  (Hololand repo)        │   │   (HoloScript repo)     │
│  ────────────────────── │   │  ────────────────────── │
│  • IDE tools            │   │  • Language tooling     │
│  • Runtime debugging    │   │  • Parser (hs/hsplus/   │
│  • Browser integration  │   │    holo)                │
│  • VR world management  │   │  • Validation           │
│  • AI assistance        │   │  • Code generation      │
│  • Graph visualization  │   │  • Trait documentation  │
└─────────────────────────┘   └─────────────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
         ┌───────────────────┐
         │  @holoscript/core │
         │  (Shared Parser)  │
         └───────────────────┘
```

**Both servers can be used by:**
- **Brittney** (local AI assistant)
- **Cloud agents** (Copilot, Claude, Cursor, etc.)

### When to Use Each Server

| Use Case | Server | Tools |
|----------|--------|-------|
| Parse HoloScript code | holoscript | `parse_hs`, `parse_holo` |
| Validate syntax | holoscript | `validate_holoscript` |
| Generate code from description | holoscript | `generate_object`, `generate_scene` |
| Get trait documentation | holoscript | `list_traits`, `explain_trait` |
| Scan project files | hololand | `brittney_scan_project` |
| Get autocomplete suggestions | hololand | `brittney_autocomplete` |
| Debug running app | hololand | `brittney_error_monitor` |
| Understand .holo graph structure | hololand | `holo_parse_to_graph` |
| Create VR world | hololand | `create_world` |

---

## Server Design Principles

### 1. Stateless Operations

MCP tools should be stateless when possible. Each call should be self-contained.

```typescript
// ✅ Good: Self-contained
async function parseCode(code: string) {
  const parser = new HoloScriptPlusParser();
  return parser.parse(code);
}

// ❌ Bad: Relies on global state
let lastParsedCode: string;
async function parseCode(code: string) {
  lastParsedCode = code;  // Side effect!
  return parser.parse(code);
}
```

### 2. Graceful Error Handling

Always return structured errors, never throw unhandled exceptions.

```typescript
try {
  const result = await parser.parse(code);
  return JSON.stringify({ success: true, ast: result });
} catch (error: any) {
  return JSON.stringify({ 
    success: false, 
    error: error.message,
    line: error.line,
    column: error.column
  });
}
```

### 3. Progressive Enhancement

Tools should work offline first, then enhance with network features.

```typescript
// Local parsing always works
const ast = parser.parse(code);

// Optional: AI enhancement if Brittney is available
if (brittneyAvailable) {
  const suggestions = await brittney.analyze(ast);
  return { ast, suggestions };
}
return { ast };
```

### 4. Clear Tool Descriptions

Tool descriptions should tell the AI **when** to use the tool, not just what it does.

```typescript
// ✅ Good: Tells when to use
{
  name: 'brittney_diagnostics',
  description: 'Get LSP-style diagnostics for HoloScript code with quick fixes. ' +
    'Use after editing to validate code and get actionable fixes. ' +
    'Returns errors with line numbers and suggested corrections.',
}

// ❌ Bad: Just describes what it does
{
  name: 'brittney_diagnostics',
  description: 'Runs diagnostics on code.',
}
```

---

## Tool Design Guidelines

### Tool Naming Conventions

| Prefix | Category | Examples |
|--------|----------|----------|
| `parse_` | Parsing operations | `parse_hs`, `parse_holo` |
| `validate_` | Validation | `validate_holoscript` |
| `generate_` | Code generation | `generate_object`, `generate_scene` |
| `explain_` | Documentation/explanation | `explain_trait`, `explain_code` |
| `list_` | Enumeration | `list_traits`, `list_worlds` |
| `get_` | Retrieval | `get_examples`, `get_syntax_reference` |
| `brittney_` | Brittney AI features | `brittney_ask_question` |
| `holo_` | Graph/visual tools | `holo_parse_to_graph` |

### Input Schema Best Practices

```typescript
{
  name: 'generate_object',
  description: 'Generate HoloScript object from description',
  inputSchema: {
    type: 'object',
    properties: {
      // Required fields first
      description: {
        type: 'string',
        description: 'Natural language description (e.g., "a glowing blue orb")',
      },
      // Optional fields with defaults
      format: {
        type: 'string',
        enum: ['hs', 'hsplus', 'holo'],
        description: 'Output format (default: hsplus)',
        default: 'hsplus',
      },
    },
    required: ['description'],  // Explicit required fields
  },
}
```

### Output Format Guidelines

1. **JSON for structured data**
```typescript
return JSON.stringify({
  success: true,
  data: result,
  metadata: { version: '1.0.0' }
}, null, 2);
```

2. **Markdown for documentation**
```typescript
return `## @${trait}
${docs.description}

### Parameters
${formatParams(docs.params)}

### Example
\`\`\`hsplus
${docs.example}
\`\`\``;
```

3. **Plain text for simple responses**
```typescript
return `Found ${count} files with ${errors} errors.`;
```

---

## Configuration Best Practices

### VS Code / GitHub Copilot

Location: `.vscode/mcp.json`

```jsonc
{
  "servers": {
    "holoscript": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"]
    }
  }
}
```

### Antigravity IDE

Location: `.antigravity/mcp.json`

```jsonc
{
  "servers": {
    "holoscript": {
      "name": "HoloScript Language",
      "description": "...",
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"],
      "cwd": "${workspaceFolder}"
    }
  },
  "toolGroups": {
    // Organize tools by category for UI
  }
}
```

### Claude Desktop

Location: `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "holoscript": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-server/src/index.ts"]
    }
  }
}
```

### Cursor

Location: `.cursor/mcp.json`

```json
{
  "holoscript": {
    "command": "npx",
    "args": ["tsx", "packages/mcp-server/src/index.ts"],
    "cwd": "/path/to/HoloScript"
  }
}
```

---

## IDE Integration Patterns

### 1. Project Scanning Pattern

When opening a workspace, scan for HoloScript files:

```
Agent: "I'll scan the project to understand the codebase."
Tool: brittney_scan_project
Result: Summary of all .holo/.hsplus files with objects/templates
```

### 2. Edit-Validate-Fix Loop

After every code edit:

```
1. User edits code
2. Agent: brittney_diagnostics
3. If errors: brittney_code_action for quick fixes
4. Apply fixes
```

### 3. Hover Documentation

When user hovers on a symbol:

```
1. User hovers on @grabbable
2. Agent: brittney_hover(code, line, column)
3. Display: Full documentation with example
```

### 4. Code Generation Flow

When user describes what they want:

```
1. User: "Create a sword that can be grabbed"
2. Agent: suggest_traits({ description: "..." })
3. Agent: generate_object({ description: "...", format: "hsplus" })
4. Insert generated code
```

---

## Security Considerations

### 1. Never Execute Arbitrary Code

MCP tools should parse/analyze code, not execute it.

```typescript
// ✅ Good: Parse only
const ast = parser.parse(userCode);

// ❌ Bad: Executes user code
eval(userCode);
```

### 2. Validate All Inputs

```typescript
const code = args.code as string;
if (!code || typeof code !== 'string') {
  return JSON.stringify({ error: 'Invalid code input' });
}
```

### 3. Limit File System Access

```typescript
// ✅ Good: Restrict to workspace
const safePath = path.resolve(workspaceRoot, relativePath);
if (!safePath.startsWith(workspaceRoot)) {
  throw new Error('Path traversal detected');
}
```

### 4. API Keys in Environment

```typescript
// ✅ Good: From environment
const apiKey = process.env.BRITTNEY_ADMIN_KEY;

// ❌ Bad: Hardcoded
const apiKey = 'secret-key-123';
```

---

## Testing MCP Tools

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { handleTool } from './index';

describe('parse_hs', () => {
  it('parses valid HoloScript', async () => {
    const result = await handleTool('parse_hs', {
      code: 'orb test { position: [0, 0, 0] }'
    });
    const parsed = JSON.parse(result);
    expect(parsed.objects).toHaveLength(1);
  });

  it('returns errors for invalid code', async () => {
    const result = await handleTool('parse_hs', {
      code: 'invalid {'
    });
    const parsed = JSON.parse(result);
    expect(parsed.errors).toBeDefined();
  });
});
```

### Integration Tests

```typescript
import { spawn } from 'child_process';

describe('MCP Server', () => {
  it('responds to list_tools', async () => {
    const server = spawn('npx', ['tsx', 'src/index.ts']);
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    const response = await readFromStdout(server);
    expect(response.result.tools).toBeDefined();
  });
});
```

---

## Training Data for AI

### Format

Use JSONL format for training examples:

```jsonl
{"messages":[{"role":"user","content":"How do I make an object grabbable?"},{"role":"assistant","content":"","tool_calls":[{"name":"brittney_docs","arguments":{"query":"grabbable","type":"trait"}}]}],"tool":"brittney_docs"}
```

### Key Examples to Include

1. **Project understanding**: "What files are in this project?"
2. **Trait documentation**: "How do I use @grabbable?"
3. **Error fixing**: "Fix this code"
4. **Code generation**: "Create a glowing sword"
5. **Scene visualization**: "Show me the event flow"

### Training Data Location

- `packages/brittney/mcp-server/brittney-mcp-training.jsonl`
- `packages/mcp-server/holoscript-mcp-training.jsonl` (if created)

---

## AI Assistant Configuration

### GitHub Copilot Instructions

Add MCP tool usage to `.github/copilot-instructions.md`:

```markdown
## ⚠️ CRITICAL: Use Brittney MCP Tools First

Before writing HoloScript code, ALWAYS use MCP tools:
- `brittney_scan_project` - Understand project structure
- `brittney_diagnostics` - Check for errors
- `suggest_traits` - Get appropriate VR traits
- `generate_object` - Create objects from descriptions
- `validate_holoscript` - Verify syntax
```

**Key principles for copilot instructions:**
1. List MCP tools at the top (before any other guidance)
2. Specify the workflow order (suggest → generate → validate)
3. Reference HoloScript-first development
4. Include the format table (.hs/.hsplus/.holo)

### Claude Desktop/Code Settings

Configure `.claude/settings.json` in each repo:

```json
{
  "mcpServers": {
    "hololand": {
      "command": "npx",
      "args": ["tsx", "packages/brittney/mcp-server/src/index.ts"]
    },
    "holoscript": {
      "command": "npx",
      "args": ["tsx", "../HoloScript/packages/mcp-server/src/index.ts"]
    }
  },
  "instructions": [
    "ALWAYS Use Brittney MCP Tools",
    "Before writing HoloScript code, use these MCP tools:",
    "- brittney_scan_project",
    "- brittney_diagnostics",
    "- suggest_traits",
    "- generate_object"
  ],
  "preferredTools": [
    "brittney_scan_project",
    "brittney_diagnostics",
    "generate_object",
    "suggest_traits",
    "validate_holoscript"
  ]
}
```

**Note:** Both Hololand and HoloScript repos already have `.claude/settings.json` configured with preferred tools and MCP servers.

### Cursor Settings

Configure `.cursor/mcp.json`:

```json
{
  "holoscript": {
    "command": "npx",
    "args": ["tsx", "packages/mcp-server/src/index.ts"]
  },
  "hololand": {
    "command": "npx",
    "args": ["tsx", "packages/brittney/mcp-server/src/index.ts"]
  }
}
```

### Tips for Maximum MCP Usage

1. **List preferred tools** - Use `preferredTools` array to prioritize Brittney tools
2. **Add workflow instructions** - Tell the AI to use tools in a specific order
3. **Reference context files** - Point to copilot-instructions.md and README
4. **Include examples** - Show example tool calls in instructions
5. **Set environment variables** - Include API URLs for runtime features

### Pre-Configured Files

Both repos include these configuration files:

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | GitHub Copilot guidance |
| `.claude/settings.json` | Claude Desktop/Code MCP config |
| `.vscode/mcp.json` | VS Code MCP config |
| `.antigravity/mcp.json` | Antigravity IDE MCP config |

---

## Quick Reference

### Must-Have Tools for Any HoloScript MCP

| Tool | Purpose |
|------|---------|
| `parse_hs` | Parse code → AST |
| `validate_holoscript` | Check for errors |
| `list_traits` | Show available traits |
| `explain_trait` | Document a trait |
| `generate_object` | NL → code |

### Must-Have Tools for IDE Integration

| Tool | Purpose |
|------|---------|
| `brittney_scan_project` | Project overview |
| `brittney_diagnostics` | Errors with fixes |
| `brittney_autocomplete` | Code completions |
| `brittney_hover` | Cursor info |

### Response Time Targets

| Tool Type | Target |
|-----------|--------|
| Parsing | < 100ms |
| Validation | < 200ms |
| Autocomplete | < 50ms |
| AI Generation | < 2s |

---

## Changelog

- **2026-01-25**: Initial best practices document
- Added two-server architecture
- Added IDE integration patterns
- Added training data guidelines
