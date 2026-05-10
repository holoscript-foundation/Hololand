import type { LSystemConfig, Segment3 } from './types';

type TurtleState = {
  x: number;
  y: number;
  z: number;
  angle: number;
};

export const LSYSTEM_PRESETS = {
  tree: {
    axiom: 'F',
    rules: { F: 'FF+[+F-F-F]-[-F+F+F]' },
    iterations: 4,
    angle: 25,
    stepLength: 1,
  },
  bush: {
    axiom: 'F',
    rules: { F: 'F[+F]F[-F]F' },
    iterations: 3,
    angle: 20,
    stepLength: 0.8,
  },
  fern: {
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    iterations: 5,
    angle: 25,
    stepLength: 0.6,
  },
  vine: {
    axiom: 'F',
    rules: { F: 'F[+F]F[-F][F]' },
    iterations: 4,
    angle: 18,
    stepLength: 0.75,
  },
  spiral: {
    axiom: 'F+F+F+F',
    rules: { F: 'FF+F+F+F+FF' },
    iterations: 2,
    angle: 90,
    stepLength: 1,
  },
  dragon_curve: {
    axiom: 'FX',
    rules: { X: 'X+YF+', Y: '-FX-Y' },
    iterations: 8,
    angle: 90,
    stepLength: 0.5,
  },
  sierpinski: {
    axiom: 'F-G-G',
    rules: { F: 'F-G+F+G-F', G: 'GG' },
    iterations: 4,
    angle: 120,
    stepLength: 0.5,
  },
} satisfies Record<string, LSystemConfig>;

export class LSystemGenerator {
  private readonly config: Required<LSystemConfig>;

  constructor(config: LSystemConfig) {
    this.config = {
      iterations: 3,
      angle: 25,
      stepLength: 1,
      ...config,
    };
  }

  generate(): string {
    let output = this.config.axiom;

    for (let i = 0; i < this.config.iterations; i += 1) {
      output = [...output].map((symbol) => this.config.rules[symbol] ?? symbol).join('');
    }

    return output;
  }

  interpret(source = this.generate()): Segment3[] {
    const stack: TurtleState[] = [];
    const segments: Segment3[] = [];
    const turtle: TurtleState = { x: 0, y: 0, z: 0, angle: 90 };

    for (const symbol of source) {
      switch (symbol) {
        case 'F':
        case 'G': {
          const radians = (turtle.angle * Math.PI) / 180;
          const next = {
            x: turtle.x + Math.cos(radians) * this.config.stepLength,
            y: turtle.y + Math.sin(radians) * this.config.stepLength,
            z: turtle.z,
          };
          segments.push({ start: [turtle.x, turtle.y, turtle.z], end: [next.x, next.y, next.z] });
          turtle.x = next.x;
          turtle.y = next.y;
          turtle.z = next.z;
          break;
        }
        case '+':
          turtle.angle += this.config.angle;
          break;
        case '-':
          turtle.angle -= this.config.angle;
          break;
        case '[':
          stack.push({ ...turtle });
          break;
        case ']': {
          const previous = stack.pop();
          if (previous) {
            turtle.x = previous.x;
            turtle.y = previous.y;
            turtle.z = previous.z;
            turtle.angle = previous.angle;
          }
          break;
        }
        default:
          break;
      }
    }

    return segments;
  }
}

export function createLSystem(config: LSystemConfig): LSystemGenerator {
  return new LSystemGenerator(config);
}
