export type ReactNode = any;
export type SetStateAction<S> = S | ((previous: S) => S);
export type Dispatch<A> = (value: A) => void;
export type MouseEvent<T = Element> = globalThis.MouseEvent & {
  currentTarget: T;
};
export type KeyboardEvent<T = Element> = globalThis.KeyboardEvent & {
  currentTarget: T;
};

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: readonly unknown[]
): T;
export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
export function useRef<T>(initialValue: T): { current: T };
export function useRef<T>(initialValue: T | null): { current: T | null };
export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];

export const Fragment: any;
export const jsx: any;
export const jsxs: any;

declare const React: {
  useCallback: typeof useCallback;
  useEffect: typeof useEffect;
  useMemo: typeof useMemo;
  useRef: typeof useRef;
  useState: typeof useState;
};

export default React;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
}
