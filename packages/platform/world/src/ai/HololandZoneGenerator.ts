/**
 * Hololand Zone Generator
 *
 * Generates HoloScript zone definitions for Hololand Central metaverse.
 * Users describe zones/places, AI generates HoloScript, zones appear in the world.
 *
 * Ready Player One paradigm: Everything exists in ONE persistent world.
 */

import { createInferenceClient } from '@hololand/inference';
import { parseHoloScriptPlus } from '@holoscript/core';
import type { InferenceClient, ChatMessage } from '@hololand/inference';

export interface ZoneGeneratorConfig {
  /** API provider: 'anthropic' (Claude) or 'grok' */
  provider: 'anthropic' | 'grok';
  apiKey: string;
  model?: string;
  temperature?: number;
}

export interface ZoneRequest {
  /** Natural language description of the zone */
  prompt: string;

  /** Zone metadata */
  metadata?: {
    name?: string;
    category?: 'social' | 'business' | 'entertainment' | 'education' | 'art' | 'custom';
    maxPlayers?: number;
    accessibility?: boolean;
  };
}

export interface GeneratedZone {
  /** Zone name */
  name: string;

  /** Generated HoloScript code */
  holoScript: string;

  /** Portal configuration for Hololand Central */
  portal: {
    position: [number, number, number];
    color: string;
    label: string;
  };

  /** Zone metadata */
  metadata: {
    category: string;
    description: string;
    features: string[];
  };

  /** Parsed AST (if valid) */
  ast?: any;

  /** Parse errors (if any) */
  errors?: string[];

  /** Generation time */
  generationTimeMs: number;
}

/**
 * Hololand Zone Generator
 *
 * Generates zones for the Hololand Central metaverse.
 */
export class HololandZoneGenerator {
  private inferenceClient: InferenceClient;
  private config: Required<Omit<ZoneGeneratorConfig, 'model'>>;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: ZoneGeneratorConfig) {
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
    };

    this.inferenceClient = createInferenceClient({
      activeProvider: config.provider,
      providers: {
        [config.provider]: {
          type: config.provider,
          apiKey: config.apiKey,
          enabled: true,
          defaultModel: config.model,
        },
      },
    });
  }

  /**
   * Initialize the AI client
   */
  async initialize(): Promise<void> {
    await this.inferenceClient.initialize();

    const status = await this.inferenceClient.getStatus();
    if (!status.ready) {
      throw new Error(`AI provider ${this.config.provider} not available`);
    }
  }

  /**
   * Generate a zone for Hololand Central
   */
  async generateZone(request: ZoneRequest): Promise<GeneratedZone> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt();

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: this.buildUserPrompt(request) },
    ];

    // Generate zone using AI
    const response = await this.inferenceClient.chat({
      messages,
      temperature: this.config.temperature,
      maxTokens: 4096,
    });

    // Extract HoloScript and metadata
    const { holoScript, metadata } = this.extractZoneDefinition(response.content);

    // Parse HoloScript
    const parseResult = parseHoloScriptPlus(holoScript);

    // Generate portal config
    const portal = this.generatePortalConfig(metadata);

    // Update conversation history
    this.conversationHistory.push(
      { role: 'user', content: this.buildUserPrompt(request) },
      { role: 'assistant', content: response.content }
    );

    return {
      name: metadata.name || request.metadata?.name || 'Unnamed Zone',
      holoScript,
      portal,
      metadata,
      ast: parseResult.success ? parseResult.ast : undefined,
      errors: parseResult.success ? undefined : parseResult.errors?.map((e) => e.message),
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Stream zone generation
   */
  async *generateZoneStream(request: ZoneRequest): AsyncGenerator<{
    chunk: string;
    done: boolean;
  }> {
    const systemPrompt = this.buildSystemPrompt();

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: this.buildUserPrompt(request) },
    ];

    let fullContent = '';

    for await (const chunk of this.inferenceClient.chatStream({ messages })) {
      fullContent += chunk.content;

      yield {
        chunk: chunk.content,
        done: chunk.done,
      };
    }

    // Update history
    this.conversationHistory.push(
      { role: 'user', content: this.buildUserPrompt(request) },
      { role: 'assistant', content: fullContent }
    );
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Build system prompt for zone generation
   */
  private buildSystemPrompt(): string {
    return `You are an expert HoloScript zone designer for Hololand Central, a Ready Player One-style metaverse.

# Your Role
Generate HoloScript zone definitions that will exist as PLACES in the Hololand Central metaverse. Each zone you create becomes a real location that users can visit via portals.

# Hololand Central Context
- ONE persistent shared world (like OASIS from Ready Player One)
- Users portal between zones: Plaza, Casino, Shops, Art Gallery, Social spaces, etc.
- Everything is social, multiplayer, and persistent
- Zones use HoloScript to define objects, NPCs, systems, physics, networking

# HoloScript Zone Template

\`\`\`holoscript
// Zone metadata (first line, required)
@zone "Zone Name" category:"social" maxPlayers:50

composition "Zone Name" {
  // Zone configuration
  config {
    bounds: {
      min: { x: -50, y: 0, z: -50 }
      max: { x: 50, y: 30, z: 50 }
    }
    skybox: "sunset" // or "night", "cyberpunk", "space", etc.
    ambientLight: { intensity: 0.5, color: "#ffffff" }
  }

  // Ground/Floor
  object "Ground" {
    @spatial @networked
    geometry: "plane"
    position: [0, 0, 0]
    scale: [100, 1, 100]
    material: {
      color: "#2a5a3c"
      texture: "grass"
    }
  }

  // Walls/Boundaries
  object "NorthWall" {
    @spatial @networked @collision
    geometry: "box"
    position: [0, 5, -50]
    scale: [100, 10, 1]
    material: { color: "#8b4513" }
  }

  // Interactive objects
  object "CentralFountain" {
    @spatial @networked @interactive @emissive
    geometry: "cylinder"
    position: [0, 2, 0]
    scale: [3, 4, 3]
    material: {
      color: "#4a90e2"
      emissive: "#4a90e2"
      emissiveIntensity: 0.5
    }

    // Particle system for water
    particles: {
      rate: 50
      lifetime: 2.0
      velocity: { x: 0, y: 2, z: 0 }
      color: "#87ceeb"
    }
  }

  // NPCs
  npc "Greeter" {
    @spatial @networked @dialogue
    position: [5, 0, 5]
    model: "humanoid"
    animation: "idle"

    start_dialog: "greeting"
  }

  // Dialogue
  dialog "greeting" {
    text: "Welcome to {zone.name}! How can I help you?"

    option "Tell me about this place" -> @dialog("about")
    option "Show me around" -> @trigger("tour_start")
    option "Thanks, just looking" -> @close
  }

  dialog "about" {
    text: "This is {zone.description}. We have {zone.features}."

    option "Cool, what else?" -> @dialog("greeting")
    option "Got it, thanks!" -> @close
  }

  // Portal to other zones (connects to Hololand Central)
  portal "ReturnToPlaza" {
    @spatial @networked @interactive
    position: [-20, 0, -20]
    destination: "main_plaza"
    label: "← Back to Plaza"
    effect: "swirl"
  }

  // Multiplayer spawn points
  spawnpoint "Entrance" {
    position: [0, 1, 20]
    rotation: [0, 180, 0]
  }

  // Physics objects (if interactive zone)
  object "Ball" {
    @spatial @physics @networked @grabbable
    geometry: "sphere"
    position: [10, 3, 10]
    material: { color: "#ff6600" }
    physics: {
      mass: 1
      restitution: 0.8
    }
  }

  // Lighting
  light "MainLight" {
    type: "directional"
    position: [10, 20, 10]
    intensity: 1.0
    castShadows: true
  }

  // Ambient audio
  audio "BackgroundMusic" {
    source: "ambient_chill.mp3"
    loop: true
    volume: 0.3
    spatial: false
  }
}
\`\`\`

# Important Rules

1. **Always start with @zone directive** - defines metadata
2. **Include portal back to Plaza** - users need to navigate
3. **Add spawn points** - multiplayer entry locations
4. **Make it social** - NPCs, dialogue, interactive elements
5. **Use @networked trait** - for multiplayer sync
6. **VR scale** - 1 unit = 1 meter, position at eye level (1.6m)
7. **Performance** - Don't exceed ~50 objects for mobile VR
8. **Accessibility** - Ensure walkable spaces (2m x 2m minimum)

# Zone Categories

- **social**: Lounges, parks, meeting spaces
- **business**: Shops, offices, services
- **entertainment**: Games, casinos, arcades
- **education**: Museums, libraries, classrooms
- **art**: Galleries, performance spaces
- **custom**: Unique experiences

# Output Format

Return ONLY:
1. HoloScript code in \`\`\`holoscript code block
2. After code, add metadata in JSON:

\`\`\`json
{
  "name": "Zone Name",
  "category": "social",
  "description": "Brief description",
  "features": ["feature1", "feature2"],
  "portalColor": "#4a90e2",
  "icon": "🎨"
}
\`\`\`

Generate zones that feel ALIVE, SOCIAL, and PART OF A BIGGER WORLD.`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(request: ZoneRequest): string {
    let prompt = request.prompt;

    if (request.metadata) {
      prompt += '\n\nZone Requirements:';
      if (request.metadata.name) prompt += `\n- Name: ${request.metadata.name}`;
      if (request.metadata.category) prompt += `\n- Category: ${request.metadata.category}`;
      if (request.metadata.maxPlayers) prompt += `\n- Max Players: ${request.metadata.maxPlayers}`;
      if (request.metadata.accessibility) prompt += '\n- Must be accessible (ramps, clear paths)';
    }

    return prompt;
  }

  /**
   * Extract HoloScript and metadata from AI response
   */
  private extractZoneDefinition(content: string): {
    holoScript: string;
    metadata: GeneratedZone['metadata'];
  } {
    // Extract HoloScript code
    const holoScriptMatch = content.match(/```holoscript\n([\s\S]*?)```/);
    const holoScript = holoScriptMatch ? holoScriptMatch[1].trim() : content;

    // Extract JSON metadata
    const jsonMatch = content.match(/```json\n([\s\S]*?)```/);
    let metadata: GeneratedZone['metadata'] = {
      category: 'custom',
      description: 'A generated zone',
      features: [],
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        metadata = {
          category: parsed.category || 'custom',
          description: parsed.description || 'A generated zone',
          features: parsed.features || [],
        };
      } catch {
        // Use defaults
      }
    }

    return { holoScript, metadata };
  }

  /**
   * Generate portal configuration for Hololand Central
   */
  private generatePortalConfig(metadata: GeneratedZone['metadata']): GeneratedZone['portal'] {
    // Position portals in a circle around the main plaza
    // Categories get different positions
    const categoryPositions: Record<string, [number, number, number]> = {
      social: [15, 1, 15],
      business: [15, 1, -15],
      entertainment: [-15, 1, 15],
      education: [-15, 1, -15],
      art: [20, 1, 0],
      custom: [0, 1, 20],
    };

    const categoryColors: Record<string, string> = {
      social: '#4a90e2',
      business: '#2ecc71',
      entertainment: '#e74c3c',
      education: '#f39c12',
      art: '#9b59b6',
      custom: '#34495e',
    };

    return {
      position: categoryPositions[metadata.category] || [0, 1, 20],
      color: categoryColors[metadata.category] || '#34495e',
      label: metadata.description.substring(0, 30),
    };
  }
}
