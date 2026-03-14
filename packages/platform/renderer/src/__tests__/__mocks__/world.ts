/**
 * Mock for @hololand/world used in renderer tests.
 */

export class SpatialObject {
  id: string;
  type: string;
  metadata: Record<string, any>;

  constructor(config?: { type?: string; metadata?: Record<string, any>; id?: string }) {
    this.id = config?.id ?? '';
    this.type = config?.type ?? 'box';
    this.metadata = config?.metadata ?? {};
  }

  getPosition() { return { x: 0, y: 0, z: 0 }; }
  getRotation() { return { x: 0, y: 0, z: 0, w: 1 }; }
  getScale() { return { x: 1, y: 1, z: 1 }; }
  getMetadata() { return this.metadata; }
  isVisible() { return true; }
  isActive() { return true; }
  update(_dt: number) {}
}

export class HololandWorld {
  private listeners: Map<string, Function[]> = new Map();
  private objects: SpatialObject[] = [];

  getAllObjects(): SpatialObject[] { return [...this.objects]; }
  getObject(id: string): SpatialObject | null {
    return this.objects.find((o) => o.id === id) ?? null;
  }

  addObject(obj: SpatialObject | { type?: string; metadata?: Record<string, any>; id?: string }): SpatialObject {
    const spatial = obj instanceof SpatialObject ? obj : new SpatialObject(obj);
    this.objects.push(spatial);
    return spatial;
  }

  removeObject(id: string): boolean {
    const idx = this.objects.findIndex((o) => o.id === id);
    if (idx !== -1) { this.objects.splice(idx, 1); return true; }
    return false;
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    return () => {};
  }

  emit(event: string, data: unknown) {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      handler(data);
    }
  }
}
