/**
 * HoloScript Compiler Hook
 * 
 * Real-time compilation of HoloScript code to AST for rendering.
 */

import { useState, useCallback, useRef } from 'react';
import type { HoloAST, CompileError } from '../types';

// Dynamic import for @holoscript/core (browser-compatible)
let holoParser: any = null;

async function getParser() {
  if (!holoParser) {
    try {
      // Try to import @holoscript/core
      const core = await import('@holoscript/core');
      holoParser = core.parse || core.HoloParser?.parse || core.default?.parse;
    } catch (e) {
      console.warn('Failed to load @holoscript/core, using fallback parser');
      holoParser = fallbackParse;
    }
  }
  return holoParser;
}

/**
 * Fallback parser for when @holoscript/core isn't available
 * This is a simplified parser that handles basic .holo syntax
 */
function fallbackParse(code: string): HoloAST {
  const ast: HoloAST = {
    type: 'composition',
    objects: [],
    environment: {
      ambient_light: 0.4,
      skybox: 'default'
    },
    spatial_groups: []
  };
  
  // Very basic regex parsing for demo purposes
  // Real parser is in @holoscript/core
  
  // Find objects
  const objectRegex = /object\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;
  
  while ((match = objectRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2];
    
    const obj: any = { name };
    
    // Parse position
    const posMatch = body.match(/position:\s*\[([^\]]+)\]/);
    if (posMatch) {
      obj.position = posMatch[1].split(',').map(n => parseFloat(n.trim()));
    }
    
    // Parse color
    const colorMatch = body.match(/color:\s*["']([^"']+)["']/);
    if (colorMatch) {
      obj.color = colorMatch[1];
    }
    
    // Parse geometry/type
    const geoMatch = body.match(/(?:geometry|type):\s*["']?(\w+)["']?/);
    if (geoMatch) {
      obj.geometry = geoMatch[1];
    }
    
    // Parse traits
    const traitMatches = body.match(/@\w+/g);
    if (traitMatches) {
      obj.traits = traitMatches;
    }
    
    // Parse glow
    if (body.includes('glow: true') || body.includes('@glowing')) {
      obj.glow = true;
    }
    
    ast.objects.push(obj);
  }
  
  // Find orbs (classic .hs/.hsplus syntax)
  const orbRegex = /orb\s+(\w+)\s*\{([^}]+)\}/g;
  
  while ((match = orbRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2];
    
    const obj: any = { name, geometry: 'sphere' };
    
    // Parse position
    const posMatch = body.match(/position:\s*\{([^}]+)\}/);
    if (posMatch) {
      const posBody = posMatch[1];
      const x = parseFloat(posBody.match(/x:\s*([\d.-]+)/)?.[1] || '0');
      const y = parseFloat(posBody.match(/y:\s*([\d.-]+)/)?.[1] || '0');
      const z = parseFloat(posBody.match(/z:\s*([\d.-]+)/)?.[1] || '0');
      obj.position = [x, y, z];
    }
    
    // Parse color
    const colorMatch = body.match(/color:\s*["']([^"']+)["']/);
    if (colorMatch) {
      obj.color = colorMatch[1];
    }
    
    // Parse glow
    if (body.includes('glow: true')) {
      obj.glow = true;
    }
    
    ast.objects.push(obj);
  }
  
  // Parse environment
  const envMatch = code.match(/environment\s*\{([^}]+)\}/);
  if (envMatch) {
    const envBody = envMatch[1];
    
    const ambientMatch = envBody.match(/ambient_light:\s*([\d.]+)/);
    if (ambientMatch) {
      ast.environment.ambient_light = parseFloat(ambientMatch[1]);
    }
    
    const skyboxMatch = envBody.match(/skybox:\s*["']([^"']+)["']/);
    if (skyboxMatch) {
      ast.environment.skybox = skyboxMatch[1];
    }
  }
  
  return ast;
}

interface UseHoloScriptCompilerReturn {
  ast: HoloAST | null;
  errors: CompileError[];
  compile: (code: string) => Promise<void>;
  isCompiling: boolean;
}

export function useHoloScriptCompiler(): UseHoloScriptCompilerReturn {
  const [ast, setAst] = useState<HoloAST | null>(null);
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const compile = useCallback(async (code: string) => {
    // Cancel previous compilation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsCompiling(true);
    setErrors([]);
    
    try {
      const parse = await getParser();
      
      // Parse the code
      const result = parse(code);
      
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      // Handle parser result
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors.map((e: any) => ({
          line: e.line || 1,
          column: e.column || 1,
          message: e.message || String(e)
        })));
        // Still set partial AST if available
        if (result.ast) {
          setAst(result.ast);
        }
      } else if (result.ast) {
        setAst(result.ast);
      } else {
        // Result is the AST directly
        setAst(result);
      }
    } catch (error: any) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      // Try fallback parser
      try {
        const fallbackAst = fallbackParse(code);
        setAst(fallbackAst);
      } catch (fallbackError: any) {
        setErrors([{
          line: 1,
          column: 1,
          message: error.message || 'Unknown parse error'
        }]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsCompiling(false);
      }
    }
  }, []);
  
  return { ast, errors, compile, isCompiling };
}
