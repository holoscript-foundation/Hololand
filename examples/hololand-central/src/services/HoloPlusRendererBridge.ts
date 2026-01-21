import { HSPlusNode } from '../types/HoloScriptPlus';

export interface HoloEntityData {
  id: string;
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  color?: string;
  mesh?: string;
  text?: string;
  glow?: boolean;
  interactive?: boolean;
  traits: string[];
  properties: Record<string, unknown>;
  visible: boolean;
}

export interface Renderer {
  createElement(type: string, properties: Record<string, unknown>): string;
  updateElement(id: string, properties: Record<string, unknown>): void;
  appendChild(parent: string | null, child: string): void;
  removeChild(parent: string | null, child: string): void;
  destroy(id: string): void;
}

export class ReactHoloRenderer implements Renderer {
  constructor(
    private setEntities: (fn: (prev: HoloEntityData[]) => HoloEntityData[]) => void
  ) {}

  createElement(type: string, properties: Record<string, unknown>): string {
    const id = (properties.id as string) || `ent_${Math.random().toString(36).substr(2, 9)}`;
    
    const newEntity: HoloEntityData = {
      id,
      type,
      position: (properties.position as [number, number, number]) || [0, 0, 0],
      rotation: (properties.rotation as [number, number, number]) || [0, 0, 0],
      scale: typeof properties.scale === 'number' 
        ? [properties.scale, properties.scale, properties.scale] 
        : (properties.scale as [number, number, number]) || [1, 1, 1],
      color: (properties.color as string) || 'cyan',
      mesh: (properties.mesh as string) || properties.shape as string || type,
      text: (properties.text as string) || (properties.content as string),
      glow: !!properties.glow,
      interactive: properties.interactive !== false,
      traits: [], // Traits are managed by the runtime/trait system separately
      properties,
      visible: properties.visible !== false,
    };

    this.setEntities(prev => {
        // Prevent duplicates
        if (prev.some(e => e.id === id)) return prev;
        return [...prev, newEntity];
    });

    return id;
  }

  updateElement(id: string, properties: Record<string, unknown>): void {
    this.setEntities(prev => prev.map(e => {
        if (e.id !== id) return e;

        return {
          ...e,
          position: (properties.position as [number, number, number]) || e.position,
          rotation: (properties.rotation as [number, number, number]) || e.rotation,
          scale: typeof properties.scale === 'number'
            ? [properties.scale, properties.scale, properties.scale]
            : (properties.scale as [number, number, number]) || e.scale,
          color: (properties.color as string) || e.color,
          mesh: (properties.mesh as string) || properties.shape as string || e.mesh,
          text: (properties.text as string) || (properties.content as string) || e.text,
          glow: properties.glow !== undefined ? !!properties.glow : e.glow,
          interactive: properties.interactive !== undefined ? !!properties.interactive : e.interactive,
          visible: properties.visible !== undefined ? !!properties.visible : e.visible,
          properties: { ...e.properties, ...properties },
        };
    }));
  }

  appendChild(_parent: string | null, _child: string): void {
    // In this flat React implementation, we don't strictly enforce hierarchy in the state,
    // but we could track parentId if needed for nested transforms.
  }

  removeChild(_parent: string | null, child: string): void {
    this.destroy(child);
  }

  destroy(id: string): void {
    this.setEntities(prev => prev.filter(e => e.id !== id));
  }
}
