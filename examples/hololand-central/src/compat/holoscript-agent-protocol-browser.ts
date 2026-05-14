export const ProtocolPhase = {
  INTAKE: 'intake',
  REFLECT: 'reflect',
  EXECUTE: 'execute',
  COMPRESS: 'compress',
  REINTAKE: 'reintake',
  GROW: 'grow',
  EVOLVE: 'evolve',
} as const;

export class BaseAgent {
  async runCycle(task: string, context?: unknown): Promise<unknown> {
    return {
      task,
      context,
      status: 'skipped',
      reason: 'agent protocol runtime is unavailable in browser example bundles',
    };
  }
}

export class GoalSynthesizer {
  synthesize(domain = 'browser', source = 'autonomous-boredom') {
    return {
      id: `browser-goal-${Date.now()}`,
      description: `Browser-safe placeholder goal for ${domain}`,
      category: domain,
      priority: 'low',
      estimatedComplexity: 1,
      generatedAt: new Date().toISOString(),
      source,
    };
  }
}
