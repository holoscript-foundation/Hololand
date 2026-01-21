/**
 * Playground Zustand Store - Central state management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  PlaygroundState,
  PlaygroundError,
  EditorState,
  PreviewState,
  ChatMessage,
  InspectorData,
} from '../types/playground';

interface StoreState {
  // Editor state
  editor: EditorState;
  setCode: (code: string) => void;
  setSaved: (saved: boolean) => void;

  // Playground state
  playground: PlaygroundState;
  setErrors: (errors: PlaygroundError[]) => void;
  addError: (error: PlaygroundError) => void;
  clearErrors: () => void;
  setRunning: (running: boolean) => void;
  setSelectedObject: (id?: string) => void;

  // Preview state
  preview: PreviewState;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error?: PlaygroundError) => void;
  updateMetrics: (fps: number, renderTime: number, objectCount: number) => void;

  // Chat state
  chat: {
    messages: ChatMessage[];
    isLoading: boolean;
  };
  addMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  clearChat: () => void;

  // Inspector state
  inspector: InspectorData;
  setInspectorData: (data: InspectorData) => void;

  // UI state
  ui: {
    showChat: boolean;
    showErrors: boolean;
    showInspector: boolean;
    darkMode: boolean;
  };
  toggleChat: () => void;
  toggleErrors: () => void;
  toggleInspector: () => void;
  toggleDarkMode: () => void;
}

export const usePlaygroundStore = create<StoreState>()(
  immer((set) => ({
    // Editor state
    editor: {
      code: `world MyWorld {
  object cube {
    position: [0, 0, 0]
    rotation: [0, 0, 0]
    scale: [1, 1, 1]
    
    trait Material {
      color: 0x00ff00
      metalness: 0.5
      roughness: 0.5
    }
  }
}`,
      language: 'holoscript',
      isSaved: true,
      lastSaved: new Date(),
    },

    setCode: (code: string) =>
      set((state) => {
        state.editor.code = code;
        state.editor.isSaved = false;
      }),

    setSaved: (saved: boolean) =>
      set((state) => {
        state.editor.isSaved = saved;
        if (saved) state.editor.lastSaved = new Date();
      }),

    // Playground state
    playground: {
      code: '',
      errors: [],
      isRunning: false,
      selectedObject: undefined,
    },

    setErrors: (errors: PlaygroundError[]) =>
      set((state) => {
        state.playground.errors = errors;
      }),

    addError: (error: PlaygroundError) =>
      set((state) => {
        state.playground.errors.push(error);
      }),

    clearErrors: () =>
      set((state) => {
        state.playground.errors = [];
      }),

    setRunning: (running: boolean) =>
      set((state) => {
        state.playground.isRunning = running;
      }),

    setSelectedObject: (id?: string) =>
      set((state) => {
        state.playground.selectedObject = id;
      }),

    // Preview state
    preview: {
      isLoading: false,
      fps: 0,
      renderTime: 0,
      objectCount: 0,
    },

    setPreviewLoading: (loading: boolean) =>
      set((state) => {
        state.preview.isLoading = loading;
      }),

    setPreviewError: (error?: PlaygroundError) =>
      set((state) => {
        state.preview.error = error;
      }),

    updateMetrics: (fps: number, renderTime: number, objectCount: number) =>
      set((state) => {
        state.preview.fps = fps;
        state.preview.renderTime = renderTime;
        state.preview.objectCount = objectCount;
      }),

    // Chat state
    chat: {
      messages: [],
      isLoading: false,
    },

    addMessage: (message: ChatMessage) =>
      set((state) => {
        state.chat.messages.push(message);
      }),

    setChatLoading: (loading: boolean) =>
      set((state) => {
        state.chat.isLoading = loading;
      }),

    clearChat: () =>
      set((state) => {
        state.chat.messages = [];
      }),

    // Inspector state
    inspector: {
      properties: {},
      traits: [],
    },

    setInspectorData: (data: InspectorData) =>
      set((state) => {
        state.inspector = data;
      }),

    // UI state
    ui: {
      showChat: true,
      showErrors: true,
      showInspector: false,
      darkMode: true,
    },

    toggleChat: () =>
      set((state) => {
        state.ui.showChat = !state.ui.showChat;
      }),

    toggleErrors: () =>
      set((state) => {
        state.ui.showErrors = !state.ui.showErrors;
      }),

    toggleInspector: () =>
      set((state) => {
        state.ui.showInspector = !state.ui.showInspector;
      }),

    toggleDarkMode: () =>
      set((state) => {
        state.ui.darkMode = !state.ui.darkMode;
      }),
  }))
);
