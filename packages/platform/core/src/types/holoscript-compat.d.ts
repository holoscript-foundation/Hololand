import type { ASTNode, HoloScriptValue, SpatialPosition } from '@holoscript/core';

declare module '@holoscript/core' {
  interface ParseResult {
    readonly success: boolean;
    readonly ast: ASTNode[];
    readonly errors: Array<{ readonly line: number; readonly message: string }>;
  }

  interface ExecutionResult {
    readonly output?: HoloScriptValue;
    readonly spatialPosition?: SpatialPosition;
  }

  interface HoloScriptRuntime {
    executeNode(node: ASTNode): Promise<ExecutionResult>;
    on(event: string, handler: (data: unknown) => void): void;
    getContext(): { readonly variables: Map<string, HoloScriptValue> };
    callFunction(name: string, args?: HoloScriptValue[]): Promise<ExecutionResult>;
    setVariable(name: string, value: HoloScriptValue): void;
    getVariable(name: string): HoloScriptValue;
    reset(): void;
  }
}
