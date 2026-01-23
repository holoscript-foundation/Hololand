/**
 * HoloScript Code Optimizer
 *
 * Analyzes HoloScript code and suggests optimizations
 */

import { logger } from './logger';

export interface OptimizationResult {
  optimizedCode: string;
  suggestions: OptimizationSuggestion[];
  metrics: CodeMetrics;
}

export interface OptimizationSuggestion {
  type: 'performance' | 'readability' | 'best-practice' | 'security';
  severity: 'low' | 'medium' | 'high';
  message: string;
  lineNumber?: number;
  before?: string;
  after?: string;
}

export interface CodeMetrics {
  orbCount: number;
  functionCount: number;
  connectionCount: number;
  complexity: number;
  linesOfCode: number;
}

export class CodeOptimizer {
  private maxSuggestions: number;

  constructor(maxSuggestions: number = 5) {
    this.maxSuggestions = maxSuggestions;
  }

  /**
   * Optimize HoloScript code
   */
  async optimize(holoScript: string, maxSuggestions?: number): Promise<OptimizationResult> {
    logger.info('[CodeOptimizer] Starting optimization', {
      codeLength: holoScript.length,
    });

    const limit = maxSuggestions ?? this.maxSuggestions;

    const metrics = this.calculateMetrics(holoScript);
    const allSuggestions = this.analyzeSuggestions(holoScript);

    // Sort by severity and take top N
    const suggestions = allSuggestions
      .sort((a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity))
      .slice(0, limit);

    const optimizedCode = this.applyOptimizations(holoScript, suggestions);

    logger.debug('[CodeOptimizer] Optimization complete', {
      suggestionsCount: suggestions.length,
      metricsComplexity: metrics.complexity,
    });

    return {
      optimizedCode,
      suggestions,
      metrics,
    };
  }

  /**
   * Calculate code metrics
   */
  private calculateMetrics(holoScript: string): CodeMetrics {
    const lines = holoScript.split('\n');
    const linesOfCode = lines.filter((line) => line.trim().length > 0 && !line.trim().startsWith('//')).length;

    const orbCount = (holoScript.match(/orb \w+/g) || []).length;
    const functionCount = (holoScript.match(/function \w+/g) || []).length;
    const connectionCount = (holoScript.match(/connect \w+/g) || []).length;

    // Simple complexity calculation
    const complexity = this.calculateComplexity(holoScript);

    return {
      orbCount,
      functionCount,
      connectionCount,
      complexity,
      linesOfCode,
    };
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateComplexity(holoScript: string): number {
    let complexity = 1; // Base complexity

    // Add complexity for control structures
    complexity += (holoScript.match(/gate /g) || []).length;
    complexity += (holoScript.match(/if /g) || []).length;
    complexity += (holoScript.match(/while /g) || []).length;
    complexity += (holoScript.match(/for /g) || []).length;

    return complexity;
  }

  /**
   * Analyze and generate optimization suggestions
   */
  private analyzeSuggestions(holoScript: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    suggestions.push(...this.checkPerformance(holoScript));
    suggestions.push(...this.checkReadability(holoScript));
    suggestions.push(...this.checkBestPractices(holoScript));
    suggestions.push(...this.checkSecurity(holoScript));

    return suggestions;
  }

  /**
   * Check for performance issues
   */
  private checkPerformance(holoScript: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for duplicate orb definitions
    const orbNames: Record<string, number> = {};
    const orbMatches = holoScript.matchAll(/orb (\w+)/g);
    for (const match of orbMatches) {
      const name = match[1];
      orbNames[name] = (orbNames[name] || 0) + 1;
    }

    for (const [name, count] of Object.entries(orbNames)) {
      if (count > 1) {
        suggestions.push({
          type: 'performance',
          severity: 'medium',
          message: `Duplicate orb definition "${name}" found ${count} times. Consider reusing the same orb.`,
        });
      }
    }

    // Check for too many objects without spatial organization
    const orbCount = (holoScript.match(/orb \w+/g) || []).length;
    if (orbCount > 10 && !holoScript.includes('parent:')) {
      suggestions.push({
        type: 'performance',
        severity: 'medium',
        message: `${orbCount} orbs detected without spatial hierarchy. Consider grouping related orbs with parent relationships.`,
      });
    }

    return suggestions;
  }

  /**
   * Check for readability issues
   */
  private checkReadability(holoScript: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const lines = holoScript.split('\n');

    // Check for missing comments
    const codeLines = lines.filter((line) => line.trim().length > 0).length;
    const commentLines = lines.filter((line) => line.trim().startsWith('//')).length;

    if (codeLines > 10 && commentLines === 0) {
      suggestions.push({
        type: 'readability',
        severity: 'low',
        message: 'Consider adding comments to explain complex sections of code.',
      });
    }

    // Check for long lines
    lines.forEach((line, index) => {
      if (line.length > 100) {
        suggestions.push({
          type: 'readability',
          severity: 'low',
          message: `Line ${index + 1} is too long (${line.length} characters). Consider breaking it up.`,
          lineNumber: index + 1,
        });
      }
    });

    // Check for inconsistent naming
    const snakeCase = holoScript.match(/\b[a-z]+_[a-z]+\b/g);
    const camelCase = holoScript.match(/\b[a-z]+[A-Z][a-z]+\b/g);

    if (snakeCase && camelCase) {
      suggestions.push({
        type: 'readability',
        severity: 'low',
        message: 'Mixed naming conventions detected (snake_case and camelCase). Choose one style consistently.',
      });
    }

    return suggestions;
  }

  /**
   * Check for best practice violations
   */
  private checkBestPractices(holoScript: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for missing interactive flag
    if (holoScript.includes('orb ') && !holoScript.includes('interactive:')) {
      suggestions.push({
        type: 'best-practice',
        severity: 'low',
        message: 'Consider adding "interactive: true/false" to your orbs for clarity.',
        before: 'orb myObject {\n  color: "#00ffff"\n}',
        after: 'orb myObject {\n  color: "#00ffff"\n  interactive: true\n}',
      });
    }

    // Check for missing color definitions
    const orbsWithoutColor = holoScript.match(/orb \w+\s*{[^}]*}/g)?.filter((orb) => !orb.includes('color:'));

    if (orbsWithoutColor && orbsWithoutColor.length > 0) {
      suggestions.push({
        type: 'best-practice',
        severity: 'low',
        message: `${orbsWithoutColor.length} orb(s) without color definitions. Consider adding colors for better visualization.`,
      });
    }

    // Check for unconnected orbs
    const orbCount = (holoScript.match(/orb \w+/g) || []).length;
    const connectionCount = (holoScript.match(/connect /g) || []).length;

    if (orbCount > 2 && connectionCount === 0) {
      suggestions.push({
        type: 'best-practice',
        severity: 'low',
        message: 'Multiple orbs detected without connections. Consider connecting related objects to establish data flow.',
      });
    }

    return suggestions;
  }

  /**
   * Check for security issues
   */
  private checkSecurity(holoScript: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'Avoid using eval() as it can execute arbitrary code' },
      { pattern: /new\s+Function\s*\(/g, message: 'Avoid dynamic function creation' },
      { pattern: /__proto__/g, message: 'Avoid prototype pollution vulnerabilities' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(holoScript)) {
        suggestions.push({
          type: 'security',
          severity: 'high',
          message,
        });
      }
    }

    return suggestions;
  }

  /**
   * Apply automatic optimizations
   */
  private applyOptimizations(holoScript: string, suggestions: OptimizationSuggestion[]): string {
    let optimized = holoScript;

    // Apply automatic fixes for certain suggestions
    for (const suggestion of suggestions) {
      if (suggestion.before && suggestion.after) {
        optimized = optimized.replace(suggestion.before, suggestion.after);
      }
    }

    // Format code (basic)
    optimized = this.formatCode(optimized);

    return optimized;
  }

  /**
   * Basic code formatting
   */
  private formatCode(holoScript: string): string {
    const lines = holoScript.split('\n');
    const formatted: string[] = [];
    let indentLevel = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '}') {
        indentLevel--;
      }

      const indent = '  '.repeat(Math.max(0, indentLevel));
      formatted.push(indent + trimmed);

      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  }

  /**
   * Get numeric weight for severity
   */
  private severityWeight(severity: 'low' | 'medium' | 'high'): number {
    switch (severity) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }
}
