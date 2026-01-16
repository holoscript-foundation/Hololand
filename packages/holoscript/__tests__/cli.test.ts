import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HoloScriptBuilder } from '../src/cli/build';
import { writeFileSync, unlinkSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('HoloScript CLI', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `holoscript-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      const files = [
        join(testDir, 'simple.hs'),
        join(testDir, 'simple.tsx'),
        join(testDir, 'complex.hs'),
        join(testDir, 'complex.tsx'),
        join(testDir, 'error.hs'),
      ];
      files.forEach((f) => {
        try {
          unlinkSync(f);
        } catch {}
      });
    } catch {}
  });

  describe('Build command', () => {
    it('should compile a simple HoloScript file', async () => {
      const input = join(testDir, 'simple.hs');
      const source = `
ZONE welcome
  ENTITY box
    POSITION 0 1 -5
    CREATE CUBE
    COLOR 0xff0000
  END
END
      `.trim();

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({
        input,
        verbose: false,
      });

      const result = await builder.build();

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/simple\.tsx$/);
      expect(result.size).toBeGreaterThan(0);

      const output = readFileSync(result.output, 'utf-8');
      expect(output).toContain('import');
      expect(output).toContain('React');
      expect(output).toContain('group');
    });

    it('should handle custom output path', async () => {
      const input = join(testDir, 'simple.hs');
      const output = join(testDir, 'custom-output.tsx');
      const source = 'ZONE test\n  ENTITY box\n    POSITION 0 0 0\n    CREATE CUBE\n  END\nEND';

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({
        input,
        output,
      });

      const result = await builder.build();

      expect(result.success).toBe(true);
      expect(result.output).toBe(output);
    });

    it('should reject non-.hs files', async () => {
      const input = join(testDir, 'test.txt');
      writeFileSync(input, 'not holoscript', 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('.hs extension');
    });

    it('should handle missing input file', async () => {
      const builder = new HoloScriptBuilder({
        input: join(testDir, 'nonexistent.hs'),
      });

      const result = await builder.build();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to read');
    });

    it('should reject empty files', async () => {
      const input = join(testDir, 'empty.hs');
      writeFileSync(input, '', 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('empty');
    });

    it('should compile multi-zone world', async () => {
      const input = join(testDir, 'complex.hs');
      const source = `
ZONE welcome
  ENTITY sign
    POSITION 0 2 -3
    CREATE CUBE
    COLOR 0xffffff
    ON_CLICK SHOW_MESSAGE "Welcome"
  END
END

ZONE shop
  ENTITY counter
    POSITION 0 1 0
    CREATE CUBE
    COLOR 0x0000ff
    ON_CLICK NAVIGATE shop
  END
END
      `.trim();

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(true);
      const output = readFileSync(result.output, 'utf-8');
      expect(output).toContain('welcome');
      expect(output).toContain('shop');
    });

    it('should report compilation errors', async () => {
      const input = join(testDir, 'error.hs');
      const source = `
ZONE test
  ENTITY box
    POSITION invalid values here
    CREATE CUBE
  END
END
      `.trim();

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should measure build duration', async () => {
      const input = join(testDir, 'perf.hs');
      const source = 'ZONE test\n  ENTITY box\n    POSITION 0 0 0\n    CREATE CUBE\n  END\nEND';

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThan(5000); // Should be fast
    });

    it('should include imports in output', async () => {
      const input = join(testDir, 'imports.hs');
      const source = 'ZONE test\n  ENTITY box\n    POSITION 0 0 0\n    CREATE CUBE\n  END\nEND';

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(true);
      const output = readFileSync(result.output, 'utf-8');

      // Should include React Three Fiber imports
      expect(output).toMatch(/import.*from.*'react'/);
      expect(output).toMatch(/import.*from.*'three'/);
    });

    it('should handle handler compilation', async () => {
      const input = join(testDir, 'handlers.hs');
      const source = `
ZONE test
  ENTITY button
    POSITION 0 0 0
    CREATE CUBE
    ON_CLICK PLAY_SOUND click
    ON_CLICK SHOW_MESSAGE "Clicked!"
  END
END
      `.trim();

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(true);
      const output = readFileSync(result.output, 'utf-8');

      // Should contain click handler
      expect(output).toContain('onClick');
    });
  });

  describe('Result formatting', () => {
    it('should format successful builds', () => {
      const result = {
        success: true,
        input: '/path/to/test.hs',
        output: '/path/to/test.tsx',
        duration: 123,
        size: 2048,
        errors: [],
        warnings: [],
      };

      const formatted = HoloScriptBuilder.formatResult(result);

      expect(formatted).toContain('✅');
      expect(formatted).toContain('successful');
      expect(formatted).toContain('/path/to/test.hs');
      expect(formatted).toContain('2048');
      expect(formatted).toContain('123ms');
    });

    it('should format failed builds', () => {
      const result = {
        success: false,
        input: '/path/to/test.hs',
        output: '',
        duration: 45,
        size: 0,
        errors: ['Syntax error on line 5'],
        warnings: [],
      };

      const formatted = HoloScriptBuilder.formatResult(result);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('failed');
      expect(formatted).toContain('Syntax error');
    });

    it('should include warnings in output', () => {
      const result = {
        success: true,
        input: '/path/to/test.hs',
        output: '/path/to/test.tsx',
        duration: 100,
        size: 1024,
        errors: [],
        warnings: ['Unused entity: old_box'],
      };

      const formatted = HoloScriptBuilder.formatResult(result);

      expect(formatted).toContain('Warnings');
      expect(formatted).toContain('Unused entity');
    });
  });

  describe('Performance benchmarks', () => {
    it('should compile quickly (<500ms for small file)', async () => {
      const input = join(testDir, 'bench.hs');
      const source = 'ZONE test\n  ENTITY box\n    POSITION 0 0 0\n    CREATE CUBE\n  END\nEND';

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(500);
    });

    it('should produce reasonable output size', async () => {
      const input = join(testDir, 'size.hs');
      const source = 'ZONE test\n  ENTITY box\n    POSITION 0 0 0\n    CREATE CUBE\n  END\nEND';

      writeFileSync(input, source, 'utf-8');

      const builder = new HoloScriptBuilder({ input });
      const result = await builder.build();

      expect(result.success).toBe(true);
      // Output should be reasonable (imports + component)
      expect(result.size).toBeGreaterThan(200);
      expect(result.size).toBeLessThan(50000); // Should be minifiable
    });
  });
});
