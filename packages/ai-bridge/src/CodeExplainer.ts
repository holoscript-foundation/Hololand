/**
 * HoloScript Code Explainer
 *
 * Explains HoloScript code in simple, beginner-friendly language
 */

import { logger } from './logger';

export interface ExplanationResult {
  summary: string;
  lineByLine: LineExplanation[];
  concepts: string[];
  suggestions?: string[];
}

export interface LineExplanation {
  lineNumber: number;
  code: string;
  explanation: string;
}

type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export class CodeExplainer {
  /**
   * Explain HoloScript code
   */
  async explain(holoScript: string, userLevel: UserLevel = 'beginner'): Promise<ExplanationResult> {
    logger.info('[CodeExplainer] Explaining code', {
      codeLength: holoScript.length,
      userLevel,
    });

    const lines = holoScript.split('\n').filter((line) => line.trim().length > 0);

    const lineByLine = lines.map((line, index) => this.explainLine(line, index + 1, userLevel));

    const summary = this.generateSummary(holoScript, userLevel);
    const concepts = this.extractConcepts(holoScript);
    const suggestions = this.generateSuggestions(holoScript, userLevel);

    return {
      summary,
      lineByLine,
      concepts,
      suggestions,
    };
  }

  /**
   * Explain a single line of code
   */
  private explainLine(line: string, lineNumber: number, userLevel: UserLevel): LineExplanation {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith('//')) {
      return {
        lineNumber,
        code: line,
        explanation: 'This is a comment explaining the code',
      };
    }

    // Orb declaration
    if (trimmed.startsWith('orb ')) {
      const name = trimmed.match(/orb\s+(\w+)/)?.[1] || 'object';
      return {
        lineNumber,
        code: line,
        explanation: this.explainByLevel(
          userLevel,
          `Creates a hologram (3D object) named "${name}"`,
          `Declares an orb entity "${name}" in the VR space`,
          `Instantiates orb entity "${name}" with default properties`
        ),
      };
    }

    // Function declaration
    if (trimmed.startsWith('function ')) {
      const name = trimmed.match(/function\s+(\w+)/)?.[1] || 'unknown';
      return {
        lineNumber,
        code: line,
        explanation: this.explainByLevel(
          userLevel,
          `Creates a reusable action called "${name}"`,
          `Defines function "${name}" that can be called multiple times`,
          `Declares function "${name}" with scope and closure`
        ),
      };
    }

    // Connect statement
    if (trimmed.startsWith('connect ')) {
      const match = trimmed.match(/connect\s+(\w+)\s+to\s+(\w+)/);
      if (match) {
        return {
          lineNumber,
          code: line,
          explanation: this.explainByLevel(
            userLevel,
            `Links ${match[1]} to ${match[2]} so they can share data`,
            `Establishes data flow connection between ${match[1]} and ${match[2]}`,
            `Creates directed edge from ${match[1]} to ${match[2]} in computation graph`
          ),
        };
      }
    }

    // Property assignment
    if (trimmed.includes(':')) {
      const match = trimmed.match(/(\w+):\s*(.+)/);
      if (match) {
        const [, property, value] = match;
        return {
          lineNumber,
          code: line,
          explanation: this.explainByLevel(
            userLevel,
            `Sets ${property} to ${value.replace(/[",]/g, '')}`,
            `Assigns value ${value} to property ${property}`,
            `Property binding: ${property} = ${value}`
          ),
        };
      }
    }

    // Generic explanation
    return {
      lineNumber,
      code: line,
      explanation: 'HoloScript code line',
    };
  }

  /**
   * Generate summary based on user level
   */
  private generateSummary(holoScript: string, userLevel: UserLevel): string {
    const hasOrbs = holoScript.includes('orb ');
    const hasFunctions = holoScript.includes('function ');
    const hasConnections = holoScript.includes('connect ');

    const parts: string[] = [];

    if (hasOrbs) {
      parts.push(
        this.explainByLevel(
          userLevel,
          'creates 3D objects in your VR world',
          'defines holographic entities in the virtual space',
          'instantiates orb entities with spatial properties'
        )
      );
    }

    if (hasFunctions) {
      parts.push(
        this.explainByLevel(
          userLevel,
          'defines reusable actions',
          'implements callable functions',
          'declares functional components'
        )
      );
    }

    if (hasConnections) {
      parts.push(
        this.explainByLevel(
          userLevel,
          'connects objects to share data',
          'establishes data flow connections',
          'defines computation graph edges'
        )
      );
    }

    if (parts.length === 0) {
      return 'This HoloScript code defines elements in your VR environment';
    }

    return `This HoloScript code ${parts.join(' and ')}.`;
  }

  /**
   * Extract key concepts from code
   */
  private extractConcepts(holoScript: string): string[] {
    const concepts: string[] = [];

    if (holoScript.includes('orb ')) {
      concepts.push('Orbs - 3D objects that exist in your VR world');
    }

    if (holoScript.includes('function ')) {
      concepts.push('Functions - Reusable blocks of code that perform actions');
    }

    if (holoScript.includes('connect ')) {
      concepts.push('Connections - Links between objects that allow data to flow');
    }

    if (holoScript.includes('stream ')) {
      concepts.push('Streams - Continuous flows of data that can be transformed');
    }

    if (holoScript.includes('gate ')) {
      concepts.push('Gates - Decision points that control program flow');
    }

    if (holoScript.includes('interactive: true')) {
      concepts.push('Interactive Objects - Objects you can touch and manipulate in VR');
    }

    return concepts;
  }

  /**
   * Generate helpful suggestions
   */
  private generateSuggestions(holoScript: string, userLevel: UserLevel): string[] {
    const suggestions: string[] = [];

    // Suggest adding interactivity
    if (!holoScript.includes('interactive')) {
      suggestions.push(
        this.explainByLevel(
          userLevel,
          'Try adding "interactive: true" to make objects touchable',
          'Consider enabling interactivity for better UX',
          'Implement interactive flag for spatial input handling'
        )
      );
    }

    // Suggest adding colors
    if (!holoScript.includes('color')) {
      suggestions.push(
        this.explainByLevel(
          userLevel,
          'Add colors to your objects with "color: #00ffff"',
          'Define color properties for visual differentiation',
          'Apply color attributes for enhanced visual semantics'
        )
      );
    }

    // Suggest connections for multiple orbs
    const orbCount = (holoScript.match(/orb \w+/g) || []).length;
    if (orbCount > 1 && !holoScript.includes('connect')) {
      suggestions.push(
        this.explainByLevel(
          userLevel,
          'You can connect your objects with "connect objA to objB"',
          'Consider establishing connections between your orbs',
          'Define data flow topology between entity nodes'
        )
      );
    }

    return suggestions;
  }

  /**
   * Choose explanation based on user level
   */
  private explainByLevel(
    userLevel: UserLevel,
    beginner: string,
    intermediate: string,
    advanced: string
  ): string {
    switch (userLevel) {
      case 'beginner':
        return beginner;
      case 'intermediate':
        return intermediate;
      case 'advanced':
        return advanced;
      default:
        return beginner;
    }
  }
}
