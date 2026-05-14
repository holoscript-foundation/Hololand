export interface SimulationSolver {
  step?(dt: number): void;
  solve?(): unknown;
  dispose(): void;
  getStats?(): Record<string, unknown>;
}

export type SolverFactory = (config: Record<string, unknown>) => SimulationSolver;

const factories = new Map<string, SolverFactory>();

export const SimulationSolverFactory = {
  register(type: string, factory: SolverFactory): void {
    factories.set(type, factory);
  },
  create(type: string, config: Record<string, unknown>): SimulationSolver | null {
    return factories.get(type)?.(config) ?? null;
  },
  has(type: string): boolean {
    return factories.has(type);
  },
  types(): string[] {
    return [...factories.keys()];
  },
  clear(): void {
    factories.clear();
  },
};
