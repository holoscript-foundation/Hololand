import React, { useMemo } from 'react';
import { R3FCompiler } from '@holoscript/core';
import { HoloScriptR3FRenderer } from './HoloScriptR3FRenderer';

export interface HoloCompositionRendererProps {
  composition: any;
  debug?: boolean;
  physics?: boolean;
  companions?: Record<string, any>;
}

/**
 * HoloCompositionRenderer
 *
 * Specialized renderer for .holo composition files.
 * Uses the updated R3FCompiler to bridge spatial groups, environments, and objects.
 */
export const HoloCompositionRenderer: React.FC<HoloCompositionRendererProps> = ({
  composition,
  debug,
  physics = true,
  companions = {},
}) => {
  const compiler = useMemo(() => new R3FCompiler(), []);

  // Notice: R3FCompiler returns an R3FNode tree.
  // We need to update HoloScriptR3FRenderer to accept either an AST OR a pre-compiled tree.
  const r3fTree = useMemo(() => compiler.compileComposition(composition), [composition, compiler]);

  return (
    <HoloScriptR3FRenderer
      ast={null as any}
      precompiledTree={r3fTree}
      debug={debug}
      physics={physics}
      companions={companions}
    />
  );
};
