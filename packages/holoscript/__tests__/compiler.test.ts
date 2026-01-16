import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/parser/lexer';
import { parse } from '../../src/parser/parser';
import { R3FCompiler } from '../../src/compiler/r3f-compiler';

describe('HoloScript Compiler', () => {
  it('should tokenize basic zone', () => {
    const source = `
      ZONE welcome {
        position: (0, 0, 0)
        ENTITY cube {
          model: "cube.glb"
          position: (0, 1, 0)
        }
      }
    `;

    const tokens = tokenize(source);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].type).toBe('ZONE');
  });

  it('should parse zone with entities', () => {
    const source = `
      ZONE plaza {
        ENTITY pillar {
          position: (0, 2, 0)
          model: "pillar.glb"
        }
      }
    `;

    const tokens = tokenize(source);
    const ast = parse(tokens);

    expect(ast).toHaveLength(1);
    expect(ast[0].type).toBe('Zone');
    expect(ast[0].name).toBe('plaza');
    expect(ast[0].entities).toHaveLength(1);
  });

  it('should compile zone to React component', () => {
    const source = `
      ZONE test {
        ENTITY box {
          position: (0, 0, 0)
          model: "box.glb"
        }
      }
    `;

    const tokens = tokenize(source);
    const ast = parse(tokens);
    const compiler = new R3FCompiler({ target: 'r3f', optimize: false, sourceMaps: false });
    const output = compiler.compile(ast);

    expect(output).toContain('export const Test');
    expect(output).toContain('React.forwardRef');
    expect(output).toContain('group');
  });

  it('should handle ON_CLICK handlers', () => {
    const source = `
      ZONE game {
        ENTITY button {
          position: (0, 1, 0)
          model: "button.glb"
          ON_CLICK {
            PLAY_SOUND("click.mp3")
          }
        }
      }
    `;

    const tokens = tokenize(source);
    const ast = parse(tokens);
    const compiler = new R3FCompiler({ target: 'r3f', optimize: false, sourceMaps: false });
    const output = compiler.compile(ast);

    expect(output).toContain('onClick');
    expect(output).toContain('playSound');
  });

  it('should compile multiple zones', () => {
    const source = `
      ZONE plaza {
        ENTITY obj1 {
          position: (0, 0, 0)
          model: "obj1.glb"
        }
      }
      ZONE casino {
        ENTITY obj2 {
          position: (10, 0, 0)
          model: "obj2.glb"
        }
      }
    `;

    const tokens = tokenize(source);
    const ast = parse(tokens);
    const compiler = new R3FCompiler({ target: 'r3f', optimize: false, sourceMaps: false });
    const output = compiler.compile(ast);

    expect(output).toContain('export const Plaza');
    expect(output).toContain('export const Casino');
    expect(output).toContain('AllZones');
  });
});
