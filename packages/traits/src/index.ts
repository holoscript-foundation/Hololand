export type TraitHandler = {
  apply?: (target: unknown, properties?: Record<string, unknown>) => void;
  update?: (delta: number) => void;
  dispose?: () => void;
};

export class TraitRegistry {
  private handlers = new Map<string, TraitHandler>();
  private active = new Set<TraitHandler>();

  register(name: string, handler: TraitHandler): void {
    this.handlers.set(normalizeTraitName(name), handler);
  }

  apply(target: unknown, name: string, properties?: Record<string, unknown>): void {
    const handler = this.handlers.get(normalizeTraitName(name));
    if (!handler) return;
    handler.apply?.(target, properties);
    this.active.add(handler);
  }

  update(delta: number): void {
    for (const handler of this.active) {
      handler.update?.(delta);
    }
  }

  clear(): void {
    for (const handler of this.active) {
      handler.dispose?.();
    }
    this.active.clear();
  }
}

function normalizeTraitName(name: string): string {
  return name.startsWith('@') ? name : `@${name}`;
}

export const traitRegistry = new TraitRegistry();

traitRegistry.register('@rotate', {
  update: () => {},
});

traitRegistry.register('@float', {
  update: () => {},
});

traitRegistry.register('@hover', {});
traitRegistry.register('@talkable', {});
traitRegistry.register('@lookAtPlayer', {});
traitRegistry.register('@grabbable', {});
traitRegistry.register('@collectible', {});
traitRegistry.register('@portal-gate', {});
traitRegistry.register('@settings', {});
traitRegistry.register('@chat', {});

export default traitRegistry;
