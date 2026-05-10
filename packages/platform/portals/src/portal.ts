import type { Portal, PortalConfig, PortalEvent, PortalEventHandler, PortalTraversalResult, PortalView, Quaternion, Vec3 } from './types';

const ID_PREFIX = 'portal';

export function generateId(prefix = ID_PREFIX): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function vec3Distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function quaternionMultiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function quaternionInverse(q: Quaternion): Quaternion {
  const lengthSquared = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w || 1;
  return {
    x: -q.x / lengthSquared,
    y: -q.y / lengthSquared,
    z: -q.z / lengthSquared,
    w: q.w / lengthSquared,
  };
}

export function rotateVector(vector: Vec3, rotation: Quaternion): Vec3 {
  const vectorQuat = { x: vector.x, y: vector.y, z: vector.z, w: 0 };
  const rotated = quaternionMultiply(quaternionMultiply(rotation, vectorQuat), quaternionInverse(rotation));
  return { x: rotated.x, y: rotated.y, z: rotated.z };
}

export class PortalFactory {
  static create(config: PortalConfig): Portal {
    return {
      id: config.id ?? generateId(),
      position: { ...config.position },
      rotation: config.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
      destination: {
        ...config.destination,
        position: { ...config.destination.position },
        rotation: config.destination.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
      },
      size: config.size ?? { width: 2, height: 3 },
      color: config.color ?? '#00ffff',
      renderDistance: config.renderDistance ?? 50,
      label: config.label ?? '',
    };
  }
}

export class PortalCollider {
  constructor(private readonly portal: Portal) {}

  containsPoint(point: Vec3): boolean {
    const local = toPortalLocal(point, this.portal);
    return Math.abs(local.x) <= this.portal.size.width / 2 && Math.abs(local.y) <= this.portal.size.height / 2 && Math.abs(local.z) <= 0.3;
  }

  crossedPlane(current: Vec3, previous: Vec3): boolean {
    const currentSide = signedPortalDistance(current, this.portal);
    const previousSide = signedPortalDistance(previous, this.portal);
    return currentSide * previousSide <= 0 && Math.abs(currentSide - previousSide) > 0.001 && this.containsPoint(current);
  }
}

export class PortalTraversal {
  static transform(portal: Portal, currentPosition: Vec3, velocity?: Vec3): PortalTraversalResult {
    const local = toPortalLocal(currentPosition, portal);
    const rotation = portal.destination.rotation ?? portal.rotation;
    const newPosition = {
      x: portal.destination.position.x + local.x,
      y: portal.destination.position.y + local.y,
      z: portal.destination.position.z - local.z,
    };

    return {
      portal,
      newPosition,
      newRotation: rotation,
      newVelocity: velocity ? rotateVector(velocity, rotation) : undefined,
    };
  }
}

export class PortalManager {
  private readonly portals = new Map<string, Portal>();
  private readonly handlers = new Map<PortalEvent, Set<PortalEventHandler>>();

  addPortal(portal: Portal): this {
    this.portals.set(portal.id, portal);
    return this;
  }

  removePortal(portalId: string): boolean {
    return this.portals.delete(portalId);
  }

  getPortal(portalId: string): Portal | undefined {
    return this.portals.get(portalId);
  }

  getAllPortals(): Portal[] {
    return [...this.portals.values()];
  }

  checkTraversal(currentPosition: Vec3, previousPosition: Vec3, velocity?: Vec3): PortalTraversalResult | null {
    for (const portal of this.portals.values()) {
      if (new PortalCollider(portal).crossedPlane(currentPosition, previousPosition)) {
        const result = PortalTraversal.transform(portal, currentPosition, velocity);
        void this.emit(portal.destination.server ? 'crossServerTraversal' : 'traversal', portal, result);
        return result;
      }
    }

    return null;
  }

  getPortalView(portalId: string, viewerPosition: Vec3, viewerRotation: Quaternion): PortalView | null {
    const portal = this.portals.get(portalId);
    if (!portal) {
      return null;
    }

    const result = PortalTraversal.transform(portal, viewerPosition);
    return {
      portal,
      position: result.newPosition,
      rotation: quaternionMultiply(portal.destination.rotation ?? portal.rotation, viewerRotation),
    };
  }

  on(event: PortalEvent, handler: PortalEventHandler): () => void {
    const handlers = this.handlers.get(event) ?? new Set<PortalEventHandler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return () => handlers.delete(handler);
  }

  private async emit(event: PortalEvent, portal: Portal, result: PortalTraversalResult): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) {
      return;
    }

    await Promise.all([...handlers].map((handler) => handler(portal, result)));
  }
}

function toPortalLocal(point: Vec3, portal: Portal): Vec3 {
  const offset = {
    x: point.x - portal.position.x,
    y: point.y - portal.position.y,
    z: point.z - portal.position.z,
  };
  return rotateVector(offset, quaternionInverse(portal.rotation));
}

function signedPortalDistance(point: Vec3, portal: Portal): number {
  const normal = rotateVector({ x: 0, y: 0, z: 1 }, portal.rotation);
  const offset = {
    x: point.x - portal.position.x,
    y: point.y - portal.position.y,
    z: point.z - portal.position.z,
  };
  return offset.x * normal.x + offset.y * normal.y + offset.z * normal.z;
}
