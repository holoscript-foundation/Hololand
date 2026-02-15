/**
 * Brittney AI Service
 * Connects to the Brittney AI via @hololand/ai-bridge for world creation
 */

// Types for Brittney API responses
interface BrittneyCompileResult {
  success: boolean;
  holoScript?: string;
  r3fCode?: string;
  errors?: string[];
  warnings?: string[];
}

interface BrittneyStreamChunk {
  type: 'text' | 'code' | 'done' | 'error';
  content: string;
}

// Configuration
const BRITTNEY_API_URL = import.meta.env.VITE_BRITTNEY_API_URL || 'http://localhost:11434';
const BRITTNEY_MODEL = import.meta.env.VITE_BRITTNEY_MODEL || 'brittney-v14';

/**
 * Translate natural language to HoloScript
 */
export async function translateToHoloScript(
  prompt: string,
  options?: {
    worldContext?: string;
    style?: 'detailed' | 'minimal' | 'balanced';
  }
): Promise<BrittneyCompileResult> {
  try {
    const response = await fetch(`${BRITTNEY_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: BRITTNEY_MODEL,
        prompt: buildHoloScriptPrompt(prompt, options?.worldContext),
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Brittney API error: ${response.statusText}`);
    }

    const data = await response.json();
    return parseHoloScriptResponse(data.response);
  } catch (error) {
    console.error('[Brittney] Translation error:', error);
    return {
      success: false,
      errors: [(error as Error).message],
    };
  }
}

/**
 * Stream HoloScript generation
 */
export async function* streamHoloScript(
  prompt: string,
  options?: {
    worldContext?: string;
    onChunk?: (chunk: BrittneyStreamChunk) => void;
  }
): AsyncGenerator<BrittneyStreamChunk> {
  try {
    const response = await fetch(`${BRITTNEY_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: BRITTNEY_MODEL,
        prompt: buildHoloScriptPrompt(prompt, options?.worldContext),
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Brittney API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    let inCodeBlock = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const json = JSON.parse(line);
          const content = json.response || '';

          // Track code blocks
          if (content.includes('```')) {
            inCodeBlock = !inCodeBlock;
          }

          const chunk: BrittneyStreamChunk = {
            type: inCodeBlock ? 'code' : 'text',
            content,
          };

          options?.onChunk?.(chunk);
          yield chunk;

          if (json.done) {
            yield { type: 'done', content: '' };
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }
  } catch (error) {
    yield { type: 'error', content: (error as Error).message };
  }
}

/**
 * HoloScript language reference for Brittney context
 */
const HOLOSCRIPT_CONTEXT = `
## HoloScript Syntax Reference

### Root Structure
\`\`\`holo
composition "Name" {
  environment { sky: "gradient", sky_top: "#87CEEB", ambient_light: 0.5 }
  state { score: 0, active: true }
  objects { }
  spatial_groups { }
  lights { }
  logic { }
}
\`\`\`

### Objects
\`\`\`holo
object "name" {
  mesh: "sphere" | "box" | "cylinder" | "plane" | "torus"
  position: [x, y, z]
  rotation: [x, y, z]  // degrees
  scale: [x, y, z]
  radius: 0.5
  color: "#hexcolor"
  material: { color: "#fff", roughness: 0.5, metalness: 0.0, emissive: "#color", emissive_intensity: 0.5 }
  @grabbable @throwable @physics(mass: 1.0)
}
\`\`\`

### Spatial Groups (hierarchical)
\`\`\`holo
spatial_group "GroupName" at [0, 5, 0] {
  object "child" { position: [1, 0, 0] }
}
\`\`\`

### Templates (inheritance)
\`\`\`holo
template "Orb" {
  @grabbable @glowing
  on_grab { play_sound("pickup") }
}
object "myOrb" using "Orb" { mesh: "sphere", color: "#ff0000" }
\`\`\`

### Operators (ALL SUPPORTED)
- Null coalescing: \`value ?? "default"\`, \`state.x ??= 42\`
- Ternary: \`color: active ? "#0f0" : "#f00"\`
- String interpolation: \`"Score: \${state.score}"\`
- Spread: \`items: [...old, new]\`

### Logic Block
\`\`\`holo
logic {
  on_scene_start { wait(1s); state.ready = true }
  on_click("btn") { state.count += 1 }
  on_grab("obj") { play_sound("grab") }
  on_collision("a", "b", force) { emit_particles("spark", 10) }
}
\`\`\`

### Lifecycle Hooks
on_mount, on_unmount, on_grab, on_release, on_throw, on_hover_enter, on_hover_exit,
on_click, on_collision(other, force), on_player_enter, on_player_exit, on_scene_start

### Traits (@directives)
VR: @grabbable(snap_to_hand: true), @throwable(force_multiplier: 2.0), @hoverable, @clickable, @scalable, @rotatable
Physics: @physics(mass: 1.0, bounce: 0.8, friction: 0.5), @rigidbody, @collidable
Visual: @glowing, @billboard, @rotating(speed: 1.0), @animated(idle: "bounce", loop: true)
Audio: @spatial_audio, @voice
AI: @ai_driven, @networked

### Lights
\`\`\`holo
light "sun" { type: "directional", position: [50,80,30], color: "#FFD54F", intensity: 1.5, cast_shadow: true }
light "amb" { type: "hemisphere", sky_color: "#87CEEB", ground_color: "#7CB342", intensity: 0.5 }
\`\`\`

### Built-in Actions
play_sound(name), emit_particles(type, count), animate(target) { property, to, duration },
wait(time), spawn(template, config), emit(event, data), show_toast(msg)
`;

/**
 * Build the system prompt for HoloScript generation
 */
function buildHoloScriptPrompt(userPrompt: string, worldContext?: string): string {
  return `You are Brittney, an AI assistant specialized in creating HoloScript worlds for Hololand.

${HOLOSCRIPT_CONTEXT}

IMPORTANT SYNTAX RULES:
1. Use \`composition\` as the root (not "world" or "scene")
2. Rotations are in DEGREES, not radians
3. \`??=\` and \`??\` ARE VALID (null coalescing)
4. Templates use \`using "Name"\` for inheritance
5. State: \`state.var\` (global), \`self.var\` (local)
6. Time: \`1000\` (ms) or \`1s\` (seconds)

${worldContext ? `Current world context: ${worldContext}\n` : ''}

User request: ${userPrompt}

Generate clean, working HoloScript code. Use \`\`\`holo code blocks.
Include helpful comments. Output ONLY valid HoloScript syntax.`;
}

/**
 * Parse the Brittney response into structured format
 */
function parseHoloScriptResponse(response: string): BrittneyCompileResult {
  // Extract code blocks
  const codeBlockRegex = /```(?:holoscript|holo)?\n?([\s\S]*?)```/g;
  const codeBlocks: string[] = [];
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    codeBlocks.push(match[1].trim());
  }

  if (codeBlocks.length === 0) {
    // Try to extract code without backticks
    const lines = response.split('\n');
    const codeLines = lines.filter(
      (line) =>
        line.includes('world') ||
        line.includes('entity') ||
        line.includes('ambient') ||
        line.trim().startsWith('@')
    );

    if (codeLines.length > 0) {
      codeBlocks.push(codeLines.join('\n'));
    }
  }

  if (codeBlocks.length === 0) {
    return {
      success: false,
      errors: ['No HoloScript code found in response'],
    };
  }

  return {
    success: true,
    holoScript: codeBlocks.join('\n\n'),
  };
}

/**
 * Validate HoloScript syntax (basic validation)
 */
export function validateHoloScript(code: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for composition block (correct root element)
  if (!code.includes('composition')) {
    // Also accept 'world' for backwards compatibility but warn
    if (code.includes('world')) {
      warnings.push('Use "composition" instead of "world" as root element');
    } else {
      errors.push('Missing composition block');
    }
  }

  // Check for balanced braces
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Unbalanced braces');
  }

  // Check for balanced brackets
  const openBrackets = (code.match(/\[/g) || []).length;
  const closeBrackets = (code.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push('Unbalanced brackets');
  }

  // Check for common issues
  if (code.includes('position:') && !code.includes('[')) {
    warnings.push('Position values should use array syntax: [x, y, z]');
  }

  // Check for deprecated syntax
  if (code.includes('entity ') && !code.includes('object ')) {
    warnings.push('Use "object" instead of "entity" for 3D objects');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get suggestions for world creation
 */
export function getWorldSuggestions(): string[] {
  return [
    'Create a cozy coffee shop with jazz music and warm lighting',
    'Build a neon-lit cyberpunk arcade with retro games',
    'Design a peaceful zen garden with a koi pond and cherry blossoms',
    'Make a space station observation deck with Earth view',
    'Create a medieval tavern with a fireplace and bard music',
    'Build a tropical beach with palm trees and sunset',
    'Design an art gallery with interactive exhibits',
    'Create a rooftop party space with city skyline views',
  ];
}

/**
 * Get available world templates
 */
export function getWorldTemplates(): Array<{
  id: string;
  name: string;
  description: string;
  preview?: string;
}> {
  return [
    {
      id: 'empty',
      name: 'Empty World',
      description: 'Start from scratch',
    },
    {
      id: 'social-hub',
      name: 'Social Hub',
      description: 'Gathering space with seating and ambient music',
    },
    {
      id: 'game-room',
      name: 'Game Room',
      description: 'Interactive space with game elements',
    },
    {
      id: 'gallery',
      name: 'Art Gallery',
      description: 'Display space for images and 3D art',
    },
    {
      id: 'outdoor',
      name: 'Outdoor Scene',
      description: 'Nature environment with sky and terrain',
    },
  ];
}
