declare module 'react-native' {
  import type * as React from 'react';

  export type StyleObject = Record<string, unknown>;
  export type StyleProp<T = StyleObject> = T | T[] | null | false | undefined;

  export interface NativeTouch {
    pageX: number;
    pageY: number;
    identifier: number;
  }

  export interface GestureResponderEvent {
    nativeEvent: {
      touches: NativeTouch[];
    };
  }

  export interface PanResponderGestureState {
    dx: number;
    dy: number;
  }

  export const View: React.ComponentType<Record<string, unknown>>;
  export const Text: React.ComponentType<Record<string, unknown>>;
  export const TouchableOpacity: React.ComponentType<Record<string, unknown>>;
  export const ScrollView: React.ComponentType<Record<string, unknown>>;

  export const StyleSheet: {
    absoluteFillObject: StyleObject;
    create<T extends Record<string, StyleObject>>(styles: T): T;
  };

  export const Platform: {
    OS: string;
    select<T>(specifics: {
      ios?: T;
      android?: T;
      web?: T;
      default?: T;
    }): T | undefined;
  };

  export const Dimensions: {
    get(name: string): {
      width: number;
      height: number;
      scale: number;
      fontScale: number;
    };
  };

  export const Vibration: {
    vibrate(pattern: number | number[]): void;
  };

  export const PanResponder: {
    create(config: Record<string, unknown>): {
      panHandlers: Record<string, unknown>;
    };
  };

  export namespace Animated {
    class Value {
      constructor(value: number);
      interpolate(config: Record<string, unknown>): unknown;
      setValue(value: number): void;
    }

    export const View: React.ComponentType<Record<string, unknown>>;

    export function timing(
      value: unknown,
      config: Record<string, unknown>,
    ): { start(callback?: () => void): void };

    export function spring(
      value: unknown,
      config: Record<string, unknown>,
    ): { start(callback?: () => void): void };

    export function sequence(
      animations: Array<{ start(callback?: () => void): void }>,
    ): { start(callback?: () => void): void };

    export function loop(animation: {
      start(callback?: () => void): void;
    }): { start(callback?: () => void): void };
  }
}
