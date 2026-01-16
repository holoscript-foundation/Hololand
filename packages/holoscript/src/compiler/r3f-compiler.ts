// HoloScript → React Three Fiber Compiler
import { ZoneNode, EntityNode, HandlerNode } from '../parser/types';

export interface CompilerOptions {
  target: 'r3f' | 'unity' | 'native';
  optimize: boolean;
  sourceMaps: boolean;
}

export class R3FCompiler {
  constructor(private options: CompilerOptions) {}

  compile(zones: ZoneNode[]): string {
    const imports = this.generateImports();
    const components = zones.map((zone) => this.compileZone(zone));

    return `
${imports}

${components.join('\n\n')}

export const AllZones = {
  ${zones.map((z) => `${this.toPascalCase(z.name)}`).join(',\n  ')},
};
    `.trim();
  }

  private generateImports(): string {
    return `
import React, { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

// Audio helper
function playSound(url: string) {
  const audio = new Audio(url);
  audio.play().catch(e => console.warn('Audio play failed:', e));
}

// Navigation helper
function navigate(target: string) {
  console.log('Navigating to:', target);
  window.location.hash = target;
}

// Dialog helper
function showDialog(title: string, options: any) {
  console.log('Dialog:', title, options);
  // TODO: Implement actual dialog UI
}

// Message helper
function showMessage(text: string, options?: any) {
  console.log('Message:', text);
  // TODO: Implement actual message UI
}
    `.trim();
  }

  private compileZone(zone: ZoneNode): string {
    const entities = zone.entities.map((e) => this.compileEntity(e)).join('\n      ');

    const positionStr = zone.position ? `[${zone.position.join(', ')}]` : '[0, 0, 0]';

    return `
export const ${this.toPascalCase(zone.name)} = React.forwardRef((props, ref) => {
  return (
    <group position={${positionStr}} ref={ref} {...props}>
      ${entities}
    </group>
  );
});

${this.toPascalCase(zone.name)}.displayName = '${this.toPascalCase(zone.name)}';
    `.trim();
  }

  private compileEntity(entity: EntityNode): string {
    const props = this.compileProperties(entity.properties);
    const handlers = this.compileHandlers(entity.handlers);

    const model = entity.properties.model;

    if (model && typeof model === 'string') {
      // GLB/GLTF model
      return `
<EntityModel
  path="${model}"
  position={${this.vectorToString(entity.properties.position)}}
  ${props}
  ${handlers}
/>
      `.trim();
    }

    // Primitive shape
    const shapeType = entity.properties.shape || 'box';

    if (shapeType === 'sphere') {
      const radius = entity.properties.radius || 0.5;
      return `
<mesh position={${this.vectorToString(entity.properties.position)}} ${handlers}>
  <sphereGeometry args={[${radius}, 32, 32]} />
  ${this.compileMaterial(entity.properties)}
</mesh>
      `.trim();
    }

    if (shapeType === 'cylinder') {
      const radius = entity.properties.radius || 0.5;
      const height = entity.properties.height || 1;
      return `
<mesh position={${this.vectorToString(entity.properties.position)}} ${handlers}>
  <cylinderGeometry args={[${radius}, ${radius}, ${height}, 32]} />
  ${this.compileMaterial(entity.properties)}
</mesh>
      `.trim();
    }

    // Default box
    const size = entity.properties.size || [1, 1, 1];
    return `
<mesh position={${this.vectorToString(entity.properties.position)}} ${handlers}>
  <boxGeometry args={[${Array.isArray(size) ? size.join(', ') : size}, ${Array.isArray(size) ? size.join(', ') : size}, ${Array.isArray(size) ? size.join(', ') : size}]} />
  ${this.compileMaterial(entity.properties)}
</mesh>
    `.trim();
  }

  private compileProperties(props: Record<string, any>): string {
    const entries: string[] = [];

    if (props.rotation) {
      entries.push(`rotation={[${this.vectorToArray(props.rotation)}]}`);
    }

    if (props.scale) {
      entries.push(`scale={[${this.vectorToArray(props.scale)}]}`);
    }

    return entries.join(' ');
  }

  private compileHandlers(handlers: HandlerNode[]): string {
    const entries: string[] = [];

    for (const handler of handlers) {
      if (handler.type === 'ON_CLICK') {
        const actions = this.compileActions(handler.action);
        entries.push(`onClick={() => { ${actions} }}`);
      } else if (handler.type === 'ON_HOVER') {
        const actions = this.compileActions(handler.action);
        entries.push(`onPointerEnter={() => { ${actions} }}`);
      }
    }

    return entries.join(' ');
  }

  private compileActions(actions: any[]): string {
    return actions
      .map((action) => {
        if (action.type === 'PLAY_SOUND') {
          const file = action.args?.[0] || 'sound.mp3';
          return `playSound("${file}");`;
        }
        if (action.type === 'NAVIGATE') {
          const target = action.args?.[0] || '/';
          return `navigate("${target}");`;
        }
        if (action.type === 'SHOW_MESSAGE') {
          const msg = action.args?.[0] || 'Message';
          return `showMessage("${msg}");`;
        }
        if (action.type === 'SHOW_DIALOG') {
          const title = action.args?.[0] || 'Dialog';
          return `showDialog("${title}", {});`;
        }
        return `console.log('${action.type}');`;
      })
      .join(' ');
  }

  private compileMaterial(props: Record<string, any>): string {
    const color = props.color || '#ffffff';

    return `<meshStandardMaterial color="${color}" />`;
  }

  private vectorToString(value: any): string {
    if (Array.isArray(value)) {
      return `[${value.join(', ')}]`;
    }
    return '[0, 0, 0]';
  }

  private vectorToArray(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return '0, 0, 0';
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^[a-z]/, (c) => c.toUpperCase());
  }
}

// Helper component for loading GLB models
const EntityModel = React.forwardRef(
  (
    {
      path,
      position,
      scale,
      rotation,
      ...handlers
    }: {
      path: string;
      position?: [number, number, number];
      scale?: [number, number, number];
      rotation?: [number, number, number];
      [key: string]: any;
    },
    ref
  ) => {
    const { scene } = useGLTF(path);

    return (
      <group position={position} scale={scale} rotation={rotation} ref={ref} {...handlers}>
        <primitive object={scene.clone()} />
      </group>
    );
  }
);

EntityModel.displayName = 'EntityModel';

export function compileHoloScript(ast: ZoneNode[]): string {
  const compiler = new R3FCompiler({ target: 'r3f', optimize: true, sourceMaps: true });
  return compiler.compile(ast);
}
