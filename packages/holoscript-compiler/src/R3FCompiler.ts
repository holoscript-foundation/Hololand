/**
 * React Three Fiber Compiler
 *
 * Transforms HoloScript AST into React Three Fiber component code.
 */

import {
  HoloScriptCodeParser,
  HoloScriptValidator,
  type ASTNode,
  type OrbNode,
} from '@hololand/core';

export interface CompilerOptions {
  /** Output target format */
  target: 'r3f' | 'vanilla-three' | 'babylon';
  /** Enable tree shaking / dead code elimination */
  optimize: boolean;
  /** Generate source maps */
  sourceMaps: boolean;
  /** Use TypeScript output */
  typescript: boolean;
  /** Include runtime helpers inline */
  inlineRuntime: boolean;
  /** Module format */
  module: 'esm' | 'cjs';
}

export interface CompilationResult {
  success: boolean;
  code?: string;
  sourceMap?: string;
  errors: Array<{ line?: number; column?: number; message: string }>;
  warnings: Array<{ line?: number; column?: number; message: string }>;
  metadata: {
    orbs: number;
    worlds: number;
    imports: string[];
    exports: string[];
    duration: number;
  };
}

const DEFAULT_OPTIONS: CompilerOptions = {
  target: 'r3f',
  optimize: true,
  sourceMaps: false,
  typescript: true,
  inlineRuntime: false,
  module: 'esm',
};

export class R3FCompiler {
  private options: CompilerOptions;
  private parser: HoloScriptCodeParser;
  private validator: HoloScriptValidator;

  constructor(options: Partial<CompilerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.parser = new HoloScriptCodeParser();
    this.validator = new HoloScriptValidator();
  }

  /**
   * Compile HoloScript source code to R3F
   */
  compile(source: string): CompilationResult {
    const startTime = performance.now();
    const errors: CompilationResult['errors'] = [];
    const warnings: CompilationResult['warnings'] = [];

    // Parse
    const parseResult = this.parser.parse(source);

    if (!parseResult.success) {
      return {
        success: false,
        errors: parseResult.errors?.map((e) => ({
          line: e.line,
          column: e.column,
          message: e.message,
        })) || [{ message: 'Parse failed' }],
        warnings: [],
        metadata: {
          orbs: 0,
          worlds: 0,
          imports: [],
          exports: [],
          duration: performance.now() - startTime,
        },
      };
    }

    // Validate
    const validationResult = (this.validator as any).validateSource(source);
    const validationErrors = [...validationResult.errors, ...validationResult.warnings];
    for (const err of validationErrors) {
      if (err.severity === 'warning') {
        warnings.push({ line: err.line, column: err.column, message: err.message });
      } else {
        errors.push({ line: err.line, column: err.column, message: err.message });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings,
        metadata: {
          orbs: 0,
          worlds: 0,
          imports: [],
          exports: [],
          duration: performance.now() - startTime,
        },
      };
    }

    // Generate code
    const { code, imports, exports, orbCount, worldCount } = this.generateCode(parseResult.ast);

    return {
      success: true,
      code,
      errors: [],
      warnings,
      metadata: {
        orbs: orbCount,
        worlds: worldCount,
        imports,
        exports,
        duration: performance.now() - startTime,
      },
    };
  }

  /**
   * Generate R3F code from AST
   */
  private generateCode(ast: ASTNode[]): {
    code: string;
    imports: string[];
    exports: string[];
    orbCount: number;
    worldCount: number;
  } {
    const imports = new Set<string>();
    const exports: string[] = [];
    let orbCount = 0;
    let worldCount = 0;

    // Collect required imports
    imports.add("import React, { useState, useRef, useCallback } from 'react';");
    imports.add("import { useFrame } from '@react-three/fiber';");
    imports.add("import { useGLTF } from '@react-three/drei';");

    const components: string[] = [];

    for (const node of ast) {
      if (node.type === 'orb') {
        const orbNode = node as OrbNode;
        orbCount++;

        const componentName = this.toPascalCase(orbNode.name);
        const componentCode = this.generateOrbComponent(orbNode);

        components.push(componentCode);
        exports.push(componentName);

        // Check for additional imports needed
        if (orbNode.properties?.physics) {
          imports.add("import { RigidBody } from '@react-three/rapier';");
        }
        if (orbNode.properties?.audio) {
          imports.add("import { PositionalAudio } from '@react-three/drei';");
        }
        if (orbNode.properties?.model) {
          imports.add("import { useGLTF } from '@react-three/drei';");
        }
      } else if (node.type === 'world') {
        worldCount++;
        const worldNode = node as any;
        const componentName = this.toPascalCase(worldNode.name || 'World');
        const componentCode = this.generateWorldComponent(worldNode, ast);

        components.push(componentCode);
        exports.push(componentName);
      }
    }

    // Build final code
    const importLines = Array.from(imports).join('\n');
    const componentLines = components.join('\n\n');
    const exportLine = exports.length > 0 ? `\nexport { ${exports.join(', ')} };` : '';

    const code = `/**
 * Auto-generated by @hololand/holoscript-compiler
 * Do not edit manually - changes will be overwritten
 */

${importLines}

${componentLines}
${exportLine}
`;

    return {
      code,
      imports: Array.from(imports),
      exports,
      orbCount,
      worldCount,
    };
  }

  /**
   * Generate a React component for an orb
   */
  private generateOrbComponent(orb: OrbNode): string {
    const name = this.toPascalCase(orb.name);
    const props = orb.properties || {};

    // Extract properties
    const position = this.formatVector(props.position, [0, 0, 0]);
    const rotation = this.formatVector(props.rotation, [0, 0, 0]);
    const scale = this.formatVector(props.scale, [1, 1, 1]);
    const color = props.color || '#ffffff';
    const opacity = props.opacity ?? 1;
    const visible = props.visible ?? true;
    const interactive = props.interactive ?? false;

    // Build event handlers
    const handlers: string[] = [];
    if (props.on_click || interactive) {
      handlers.push(this.generateEventHandler('onClick', props.on_click));
    }
    if (props.on_hover) {
      handlers.push(this.generateEventHandler('onPointerOver', props.on_hover));
      handlers.push(this.generateEventHandler('onPointerOut', props.on_hover_end));
    }

    // Determine mesh type
    let meshContent = this.generateMeshContent(props);

    // Build component
    const ts = this.options.typescript;
    const propsType = ts ? `: { position?: [number, number, number] }` : '';

    let component = `
export function ${name}(props${propsType}) {
  const meshRef = useRef${ts ? '<THREE.Mesh>' : ''}(null);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
`;

    // Add animation frame hook if needed
    if (props.animation || props.spin) {
      component += `
  useFrame((state, delta) => {
    if (meshRef.current) {
${props.spin ? '      meshRef.current.rotation.y += delta;' : ''}
    }
  });
`;
    }

    // Add handlers
    if (handlers.length > 0) {
      component += `
  ${handlers.join('\n  ')}
`;
    }

    // Build JSX
    const wrapWithPhysics = props.physics;
    const physicsType = (props.physics as { type?: string } | undefined)?.type || 'dynamic';

    let jsx = `
  return (
    ${wrapWithPhysics ? `<RigidBody type="${physicsType}">` : ''}
    <mesh
      ref={meshRef}
      position={props.position || ${position}}
      rotation={${rotation}}
      scale={${scale}}
      visible={${visible}}
      ${handlers.map((h) => h.split('=')[0] + '={' + h.split('=')[0] + '}').join('\n      ')}
    >
      ${meshContent}
      <meshStandardMaterial
        color={${typeof color === 'string' ? `"${color}"` : color}}
        opacity={${opacity}}
        transparent={${Number(opacity) < 1}}
      />
    </mesh>
    ${wrapWithPhysics ? '</RigidBody>' : ''}
  );
}`;

    component += jsx;

    return component;
  }

  /**
   * Generate mesh geometry based on orb type
   */
  private generateMeshContent(props: Record<string, any>): string {
    const type = props.type || 'box';
    const size = props.size || [1, 1, 1];

    switch (type) {
      case 'sphere':
        return `<sphereGeometry args={[${size[0] || 1}, 32, 32]} />`;
      case 'cylinder':
        return `<cylinderGeometry args={[${size[0] || 1}, ${size[0] || 1}, ${size[1] || 2}, 32]} />`;
      case 'plane':
        return `<planeGeometry args={[${size[0] || 1}, ${size[1] || 1}]} />`;
      case 'torus':
        return `<torusGeometry args={[${size[0] || 1}, ${size[1] || 0.4}, 16, 100]} />`;
      case 'cone':
        return `<coneGeometry args={[${size[0] || 1}, ${size[1] || 2}, 32]} />`;
      case 'model':
        // Will be handled differently with useGLTF
        return `{/* Model: ${props.model} */}`;
      case 'cube':
      case 'box':
      default:
        return `<boxGeometry args={[${size[0] || 1}, ${size[1] || 1}, ${size[2] || 1}]} />`;
    }
  }

  /**
   * Generate event handler code
   */
  private generateEventHandler(eventName: string, handler: any): string {
    if (!handler) {
      return `const ${eventName} = useCallback(() => {}, []);`;
    }

    // Parse handler actions
    let handlerBody = '';

    if (handler.play_sound) {
      handlerBody += `    // Play sound: ${handler.play_sound}\n`;
    }
    if (handler.animate) {
      handlerBody += `    // Animate: ${JSON.stringify(handler.animate)}\n`;
    }
    if (handler.set) {
      for (const [key, value] of Object.entries(handler.set)) {
        handlerBody += `    // Set ${key} = ${value}\n`;
      }
    }

    if (!handlerBody) {
      handlerBody = '    // Handler logic';
    }

    return `const ${eventName} = useCallback(() => {
${handlerBody}
  }, []);`;
  }

  /**
   * Generate a world component containing all child orbs
   */
  private generateWorldComponent(world: any, allNodes: ASTNode[]): string {
    const name = this.toPascalCase(world.name || 'World');

    // Find all orbs that belong to this world
    const childOrbs = allNodes.filter((n) => n.type === 'orb') as OrbNode[];

    const childComponents = childOrbs
      .map((orb) => `      <${this.toPascalCase(orb.name)} />`)
      .join('\n');

    return `
export function ${name}() {
  return (
    <group>
${childComponents}
    </group>
  );
}`;
  }

  /**
   * Format a vector value for code generation
   */
  private formatVector(value: any, defaultVal: number[]): string {
    if (!value) return `[${defaultVal.join(', ')}]`;
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    return `[${defaultVal.join(', ')}]`;
  }

  /**
   * Convert snake_case or kebab-case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^[a-z]/, (c) => c.toUpperCase());
  }
}
