/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRITTNEY_API: string;
  readonly VITE_BRITTNEY_API_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_CLAUDE_API_KEY: string;
  readonly VITE_OLLAMA_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Chrome-specific Performance.memory API
interface PerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

interface Performance {
  readonly memory?: PerformanceMemory;
}
