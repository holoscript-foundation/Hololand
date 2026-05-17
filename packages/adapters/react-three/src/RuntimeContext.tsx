/**
 * RuntimeContext
 *
 * Bridges HoloScriptPlusRuntime (imperative lifecycle engine) with
 * the React Three Fiber declarative rendering path.
 *
 * Provides:
 * - Per-frame runtime updates driven by useFrame
 * - Reactive state snapshot that triggers React re-renders
 * - Event pub/sub via runtime.on / runtime.emit
 * - Variable get/set for expression interpolation
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFrame } from '@react-three/fiber';
import {
  HoloScriptPlusParser,
  HoloScriptPlusRuntimeImpl,
  R3FCompiler,
  type HSPlusAST,
  type R3FNode,
  type RuntimeOptions,
  type Renderer,
} from '@holoscript/core';

type RuntimeBridge = HoloScriptPlusRuntimeImpl & {
  execute?: (ast: HSPlusAST, context?: Record<string, unknown>) => Promise<unknown>;
  getState?: () => Record<string, unknown>;
  setState?: (updates: Record<string, unknown>) => void;
  update?: (delta: number) => void;
  dispose?: () => void;
  emit?: (event: string, payload?: unknown) => void;
  on?: (event: string, handler: (payload: unknown) => void) => (() => void) | void;
};

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface HoloRuntimeContextValue {
  /** The underlying runtime instance (null until mounted) */
  runtime: HoloScriptPlusRuntimeImpl | null;
  /** Latest reactive state snapshot — triggers re-render on change */
  state: Record<string, unknown>;
  /** Compiled R3F node tree (re-compiled when AST or state changes) */
  tree: R3FNode | null;
  /** Read a runtime variable */
  getVariable: (name: string) => unknown;
  /** Write a runtime variable (triggers re-render) */
  setVariable: (name: string, value: unknown) => void;
  /** Emit a runtime event */
  emit: (event: string, payload?: unknown) => void;
  /** Subscribe to a runtime event — returns unsubscribe fn */
  on: (event: string, handler: (payload: unknown) => void) => () => void;
}

const defaultCtx: HoloRuntimeContextValue = {
  runtime: null,
  state: {},
  tree: null,
  getVariable: () => undefined,
  setVariable: () => {},
  emit: () => {},
  on: () => () => {},
};

export const HoloRuntimeContext = createContext<HoloRuntimeContextValue>(defaultCtx);

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

export interface HoloRuntimeProviderProps {
  /** Provide either a parsed AST … */
  ast?: HSPlusAST;
  /** … or raw HoloScript source (will be parsed automatically) */
  source?: string;
  /** Initial variables to inject into the runtime */
  initialVariables?: Record<string, unknown>;
  /** TypeScript companion modules */
  companions?: Record<string, Record<string, (...args: unknown[]) => unknown>>;
  /** Enable VR trait system */
  vrEnabled?: boolean;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Noop renderer — we don't need imperative DOM mutations; the R3F tree
// handles rendering declaratively. The runtime still walks the AST for
// lifecycle hooks, state, and events.
// ---------------------------------------------------------------------------

const noopRenderer: Renderer = {
  createElement: (_type: string, _props: Record<string, unknown>) => ({}),
  updateElement: () => {},
  appendChild: () => {},
  removeChild: () => {},
  destroy: () => {},
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const HoloRuntimeProvider: React.FC<HoloRuntimeProviderProps> = ({
  ast: astProp,
  source,
  initialVariables,
  companions = {},
  vrEnabled = true,
  children,
}) => {
  // --- Parse (if source string provided) --------------------------------
  const parsedAst = useMemo<HSPlusAST | null>(() => {
    if (astProp) return astProp;
    if (!source) return null;
    const parser = new HoloScriptPlusParser();
    const ast = parser.parse(source) as unknown as HSPlusAST;
    if (!ast) {
      console.error('[HoloRuntimeProvider] Parse produced no AST.');
      return null;
    }
    return ast;
  }, [astProp, source]);

  // --- Create runtime ---------------------------------------------------
  const runtimeRef = useRef<HoloScriptPlusRuntimeImpl | null>(null);
  const [stateSnapshot, setStateSnapshot] = useState<Record<string, unknown>>({});
  const [tick, setTick] = useState(0);

  // R3F compiler for producing the declarative tree
  const compiler = useMemo(() => new R3FCompiler(), []);

  useEffect(() => {
    if (!parsedAst) return;

    const opts: RuntimeOptions = {
      renderer: noopRenderer,
      vrEnabled,
      companions,
    };

    const rt = new HoloScriptPlusRuntimeImpl(opts) as RuntimeBridge;

    // Inject initial variables
    if (initialVariables) {
      rt.setState?.(initialVariables);
    }

    void rt.execute?.(parsedAst, initialVariables);
    runtimeRef.current = rt;
    setTick((t) => t + 1);

    return () => {
      rt.dispose?.();
      runtimeRef.current = null;
    };
  }, [parsedAst, vrEnabled, initialVariables]); // companions intentionally omitted to avoid remount

  // --- Per-frame update -------------------------------------------------
  useFrame((_frameState, delta) => {
    const rt = runtimeRef.current;
    if (!rt) return;

    // Drive the runtime update loop (trait updates, lifecycle ticks, etc.)
    (rt as RuntimeBridge).update?.(delta);

    // Pull the latest state and push it into React on low-frequency cadence
    // to avoid overwhelming the reconciler.  We read the context which
    // includes variable state managed by the runtime.
    const ctx = (rt as RuntimeBridge).getState?.();
    if (ctx) {
      setStateSnapshot((prev) => {
        // Cheap shallow equality — only re-render if something actually changed
        const next = ctx;
        if (prev === next) return prev;
        return { ...next };
      });
    }
  });

  // --- Compile R3F tree (reacts to AST + state changes) -----------------
  const tree = useMemo<R3FNode | null>(() => {
    if (!parsedAst) return null;
    return compiler.compile(parsedAst);
  }, [parsedAst, compiler]);

  // --- Context API ------------------------------------------------------
  const getVariable = useCallback(
    (name: string) => (runtimeRef.current as RuntimeBridge | null)?.getState?.()?.[name],
    [tick]
  );

  const setVariable = useCallback((name: string, value: unknown) => {
    (runtimeRef.current as RuntimeBridge | null)?.setState?.({ [name]: value });
    setTick((t) => t + 1);
  }, []);

  const emit = useCallback((event: string, payload?: unknown) => {
    (runtimeRef.current as any)?.emit?.(event, payload);
  }, []);

  const on = useCallback(
    (event: string, handler: (payload: unknown) => void) => {
      const unsub = (runtimeRef.current as any)?.on?.(event, handler);
      return typeof unsub === 'function' ? unsub : () => {};
    },
    [tick]
  );

  const value = useMemo<HoloRuntimeContextValue>(
    () => ({
      runtime: runtimeRef.current,
      state: stateSnapshot,
      tree,
      getVariable,
      setVariable,
      emit,
      on,
    }),
    [stateSnapshot, tree, getVariable, setVariable, emit, on, tick]
  );

  return <HoloRuntimeContext.Provider value={value}>{children}</HoloRuntimeContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the full runtime context */
export const useHoloRuntime = (): HoloRuntimeContextValue => {
  return useContext(HoloRuntimeContext);
};

/** Read a single runtime variable reactively */
export function useHoloVariable<T = unknown>(name: string): T | undefined {
  const { getVariable, state } = useHoloRuntime();
  // state is in deps so hook re-evaluates when state snapshot changes
  return useMemo(() => getVariable(name) as T | undefined, [getVariable, name, state]);
}

/** Subscribe to a runtime event */
export function useHoloEvent(event: string, handler: (payload: unknown) => void): void {
  const { on } = useHoloRuntime();
  useEffect(() => on(event, handler), [on, event, handler]);
}
