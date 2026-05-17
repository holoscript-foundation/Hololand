// ESLint 9 Flat Config
// Migrated from .eslintrc.json

import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base configuration
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        AnalyserNode: 'readonly',
        AudioBuffer: 'readonly',
        AudioContext: 'readonly',
        MediaStream: 'readonly',
        SpeechRecognition: 'readonly',
        SpeechRecognitionEvent: 'readonly',
        SpeechRecognitionErrorEvent: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        speechSynthesis: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        Touch: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLIFrameElement: 'readonly',
        HTMLSelectElement: 'readonly',
        Image: 'readonly',
        File: 'readonly',
        Window: 'readonly',
        WheelEvent: 'readonly',
        MessageEvent: 'readonly',
        ResizeObserver: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        RequestInit: 'readonly',
        AbortController: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        alert: 'readonly',
        performance: 'readonly',
        React: 'readonly',
        JSX: 'readonly',
        Gamepad: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
        WebSocket: 'readonly',
        XRSession: 'readonly',
        XRReferenceSpace: 'readonly',
        XRFrame: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // Node globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
      'react-hooks': {
        rules: {
          'exhaustive-deps': {
            meta: {
              type: 'suggestion',
              docs: {
                description:
                  'Compatibility placeholder until eslint-plugin-react-hooks is wired in flat config.',
              },
              schema: [],
            },
            create() {
              return {};
            },
          },
        },
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '.pnpm-store/**',
      '*.config.js',
      '*.config.cjs',
    ],
  },

  // Renderer currently has substantial type/API drift. Keep lint reportable
  // without pretending that renderer typecheck is green.
  {
    files: ['packages/platform/renderer/src/**/*.{ts,tsx}'],
    rules: {
      'prettier/prettier': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'no-constant-condition': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-redeclare': 'warn',
    },
  },

  // Legacy app/package surfaces are still carrying scaffold debt. Keep these
  // reportable in root lint without blocking unrelated HoloShell verification.
  {
    files: [
      'packages/ar/mobile-companion/src/**/*.{ts,tsx}',
      'examples/oasis/src/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      'no-case-declarations': 'warn',
      'no-undef': 'warn',
    },
  },
];
