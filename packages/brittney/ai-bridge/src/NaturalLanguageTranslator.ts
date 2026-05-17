/**
 * Natural Language → HoloScript Translator
 *
 * Converts natural language descriptions into HoloScript code
 */

import { logger } from './logger';

export interface TranslationResult {
  holoScript: string;
  confidence: number;
  suggestions?: string[];
  explanation?: string;
}

export interface TranslationContext {
  existingCode?: string;
  location?: { x: number; y: number; z: number };
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
}

interface IntentPattern {
  pattern: RegExp;
  intent: string;
  confidence: number;
  generator: (matches: RegExpMatchArray, context?: TranslationContext) => string;
}

export class NaturalLanguageTranslator {
  private intentPatterns: IntentPattern[];

  constructor(_confidenceThreshold: number = 0.7) {
    // Note: Confidence threshold checking is handled by HololandAIBridge
    this.intentPatterns = this.initializeIntentPatterns();
  }

  /**
   * Translate natural language to HoloScript
   */
  async translate(
    naturalLanguage: string,
    context?: TranslationContext
  ): Promise<TranslationResult> {
    logger.debug('[NaturalLanguageTranslator] Starting translation', {
      input: naturalLanguage.substring(0, 50),
    });

    const normalized = naturalLanguage.toLowerCase().trim();

    // Try to match against intent patterns
    for (const pattern of this.intentPatterns) {
      const match = normalized.match(pattern.pattern);
      if (match) {
        const holoScript = pattern.generator(match, context);
        const explanation = this.generateExplanation(pattern.intent, match);

        logger.debug('[NaturalLanguageTranslator] Pattern matched', {
          intent: pattern.intent,
          confidence: pattern.confidence,
        });

        return {
          holoScript,
          confidence: pattern.confidence,
          explanation,
          suggestions: this.generateSuggestions(pattern.intent),
        };
      }
    }

    // If no pattern matches, try generic translation
    logger.warn('[NaturalLanguageTranslator] No pattern match, using generic translation');
    return this.genericTranslation(naturalLanguage, context);
  }

  /**
   * Get autocomplete suggestions for partial input
   */
  async getSuggestions(partialInput: string): Promise<string[]> {
    const normalized = partialInput.toLowerCase().trim();

    const suggestions: string[] = [];

    // Common starting phrases
    const starters = [
      'create a coffee shop',
      'create a store',
      'create an art gallery',
      'build a house',
      'make a function called',
      'add a counter',
      'connect',
      'visualize',
    ];

    for (const starter of starters) {
      if (starter.startsWith(normalized) && starter !== normalized) {
        suggestions.push(starter);
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Initialize intent patterns for common natural language constructs
   */
  private initializeIntentPatterns(): IntentPattern[] {
    return [
      // Forest environment pattern
      {
        pattern: /make (?:a|an) (?:spooky |dense |dark )?forest/,
        intent: 'create_forest',
        confidence: 0.95,
        generator: (_matches) => {
          return `composition "Forest Encounter" {
  environment {
    theme: "forest_dense_fog"
    time_of_day: "dusk"
    audio {
      ambient: "forest_night_crickets"
      volume: 0.6
    }
    lighting {
      global_illumination: true
      fog_density: 0.15
    }
  }
}`.trim();
        },
      },

      // Creature with throwing behavior pattern
      {
        pattern: /add (?:a|an) (\w+)(?: (?:that|which) throws? (.+?) when i (\w+))?/,
        intent: 'create_interactive_creature',
        confidence: 0.9,
        generator: (matches) => {
          const creatureType = matches[1];
          const projectile = matches[2] || 'rocks';
          const gesture = matches[3] || 'wave';
          const name = creatureType.charAt(0).toUpperCase() + creatureType.slice(1);

          return `
template "${name}" {
  model: "assets/creatures/${creatureType.toLowerCase()}.glb"
  physics: "character_controller"
  
  action throw_${projectile.toLowerCase()}(target_pos) {
    anim.play("throw")
    spawn "${projectile.charAt(0).toUpperCase() + projectile.slice(1)}" {
      position: self.position + [0, 1.5, 0.5]
      velocity: calculate_arc(self.position, target_pos, 15.0)
    }
  }
}

object "${name}_1" using "${name}" {
  position: [0, 0, 5]
  look_at: "user"
}

logic {
  on_user_gesture("${gesture}") {
    ${name}_1.throw_${projectile.toLowerCase()}(user.position)
  }
}`.trim();
        },
      },

      // Create object patterns
      {
        pattern: /create (?:a|an) (\w+)(?: called| named)? (\w+)?/,
        intent: 'create_object',
        confidence: 0.9,
        generator: (matches, context) => {
          const shape = matches[1];
          const name = matches[2] || shape;
          const pos = context?.location
            ? `at ${context.location.x} ${context.location.y} ${context.location.z}`
            : '';

          return `orb ${name} {\n  shape: "${shape}"\n  color: "#00ffff"\n  interactive: true\n} ${pos}`.trim();
        },
      },

      // Shop creation pattern
      {
        pattern: /create (?:a|an) (.+) shop(?: with (.+))?/,
        intent: 'create_shop',
        confidence: 0.85,
        generator: (matches) => {
          const shopType = matches[1];
          const features = matches[2] || 'counter and shelves';

          return `// ${shopType.charAt(0).toUpperCase() + shopType.slice(1)} Shop
orb shop_${shopType.replace(/\s+/g, '_')} {
  type: "shop"
  shopType: "${shopType}"
  features: "${features}"
  color: "#4ecdc4"
  size: 3
  interactive: true
}

orb counter {
  type: "furniture"
  parent: "shop_${shopType.replace(/\s+/g, '_')}"
  position: { x: 0, y: 1, z: 2 }
}

orb display {
  type: "furniture"
  parent: "shop_${shopType.replace(/\s+/g, '_')}"
  position: { x: -2, y: 1, z: 0 }
}`;
        },
      },

      // Function creation pattern
      {
        pattern: /(?:create|make) (?:a )?function (?:called|named) (\w+)(?: (?:that|which) (.+))?/,
        intent: 'create_function',
        confidence: 0.9,
        generator: (matches) => {
          const functionName = matches[1];
          const description = matches[2] || '';

          return `function ${functionName}() {
  // ${description || 'Function implementation'}

  return result
}`;
        },
      },

      // Connection pattern
      {
        pattern: /connect (\w+) to (\w+)/,
        intent: 'connect_objects',
        confidence: 0.95,
        generator: (matches) => {
          const from = matches[1];
          const to = matches[2];

          return `connect ${from} to ${to} as "data"`;
        },
      },

      // Visualization pattern
      {
        pattern: /(?:visualize|show|display) (\w+)/,
        intent: 'visualize_data',
        confidence: 0.85,
        generator: (matches) => {
          const target = matches[1];

          return `orb ${target}_viz {
  type: "visualization"
  dataSource: "${target}"
  visualType: "particles"
  color: "#32cd32"
  animated: true
}`;
        },
      },

      // Add furniture/object to space
      {
        pattern: /add (?:a|an) (\w+)(?: to (.+))?/,
        intent: 'add_object',
        confidence: 0.8,
        generator: (matches) => {
          const objectType = matches[1];
          const parent = matches[2] || 'scene';

          return `orb ${objectType} {
  type: "${objectType}"
  parent: "${parent.replace(/\s+/g, '_')}"
  interactive: true
}`;
        },
      },

      // Build structure pattern
      {
        pattern: /build (?:a|an) (.+) with (.+)/,
        intent: 'build_structure',
        confidence: 0.8,
        generator: (matches) => {
          const structureType = matches[1];
          const features = matches[2].split(/,| and /).map((f) => f.trim());

          let code = `// ${structureType.charAt(0).toUpperCase() + structureType.slice(1)} Structure
orb ${structureType.replace(/\s+/g, '_')} {
  type: "structure"
  size: 5
  color: "#45b7d1"
  interactive: true
}\n\n`;

          features.forEach((feature, index) => {
            code += `orb ${feature.replace(/\s+/g, '_')} {
  type: "component"
  parent: "${structureType.replace(/\s+/g, '_')}"
  position: { x: ${index * 2}, y: 1, z: 0 }
}\n\n`;
          });

          return code.trim();
        },
      },
    ];
  }

  /**
   * Generate explanation for the translation
   */
  private generateExplanation(intent: string, matches: RegExpMatchArray): string {
    const explanations: Record<string, string> = {
      create_object: `Creates a new holographic object called "${matches[2] || matches[1]}"`,
      create_shop: `Creates a ${matches[1]} shop with interactive features`,
      create_function: `Defines a reusable function called "${matches[1]}"`,
      connect_objects: `Establishes a data connection between ${matches[1]} and ${matches[2]}`,
      visualize_data: `Creates a visual representation of ${matches[1]}`,
      add_object: `Adds a ${matches[1]} to your VR space`,
      build_structure: `Builds a ${matches[1]} with multiple components`,
    };

    return explanations[intent] || 'Creates HoloScript code based on your description';
  }

  /**
   * Generate suggestions based on intent
   */
  private generateSuggestions(intent: string): string[] {
    const suggestions: Record<string, string[]> = {
      create_object: [
        'Try adding properties: color, size, glow',
        'You can specify a position with "at x y z"',
        'Make it interactive with interactive: true',
      ],
      create_shop: [
        'Add more features: "tables", "seating", "windows"',
        'Customize the layout with position coordinates',
        'Add a sign with: orb sign { text: "Welcome" }',
      ],
      create_function: [
        'Add parameters inside the parentheses',
        'Use orb objects inside the function',
        'Connect functions to create workflows',
      ],
      connect_objects: [
        'Specify data type: as "weights" or as "data"',
        'Create bidirectional connections',
        'Visualize the connection with stream',
      ],
    };

    return suggestions[intent] || [];
  }

  /**
   * Generic translation fallback
   */
  private genericTranslation(
    naturalLanguage: string,
    _context?: TranslationContext
  ): TranslationResult {
    // Extract potential object names and actions
    const words = naturalLanguage.toLowerCase().split(/\s+/);
    const actionWords = ['create', 'make', 'build', 'add', 'show'];
    const hasAction = words.some((w) => actionWords.includes(w));

    if (!hasAction) {
      return {
        holoScript: `// ${naturalLanguage}\n// (Unable to translate - try starting with an action verb)`,
        confidence: 0.3,
        explanation:
          'Could not identify a clear action. Try starting with "create", "build", or "add".',
      };
    }

    // Generic orb creation as fallback
    const objectName = words[words.length - 1] || 'object';

    return {
      holoScript: `orb ${objectName} {
  // Generated from: ${naturalLanguage}
  color: "#ffffff"
  interactive: true
}`,
      confidence: 0.5,
      explanation: 'Generic object created. Consider being more specific for better results.',
      suggestions: [
        'Try: "create a [type] called [name]"',
        'Try: "build a [structure] with [features]"',
        'Try: "add a [object] to [location]"',
      ],
    };
  }
}
