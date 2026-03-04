/**
 * Mock for @hololand/world used in renderer tests.
 */

export class SpatialObject {
  id = '';
  type = 'box';
  getPosition() { return { x: 0, y: 0, z: 0 }; }
  getRotation() { return { x: 0, y: 0, z: 0, w: 1 }; }
  getScale() { return { x: 1, y: 1, z: 1 }; }
  getMetadata() { return {}; }
  isVisible() { return true; }
}

export class HololandWorld {
  private listeners: Map<string, Function[]> = new Map();

  getAllObjects(): SpatialObject[] { return []; }
  getObject(_id: string): SpatialObject | null { return null; }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  emit(event: string, data: unknown) {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      handler(data);
    }
  }
}
