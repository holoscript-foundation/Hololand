/**
 * ShaderEditorPanel
 *
 * WGSL shader code editor with syntax highlighting, compile button,
 * error display, and template loading. Provides a development-oriented
 * editing experience for writing and testing WebGPU compute shaders.
 *
 * @module webgpu-compute/ShaderEditorPanel
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type {
  ShaderEditorPanelProps,
  ShaderCompilationError,
  ShaderCompilationStatus,
  WGSLTokenType,
  WebGPUComputeTheme,
} from './types';
import {
  DEFAULT_WEBGPU_COMPUTE_THEME,
  WGSL_TEMPLATES,
  WGSL_KEYWORDS,
  WGSL_TYPES,
  WGSL_BUILTINS,
  WGSL_ATTRIBUTES,
} from './types';
import { useShaderEditor } from './useWebGPUCompute';

// =============================================================================
// SYNTAX HIGHLIGHTING
// =============================================================================

/**
 * Token colors for WGSL syntax highlighting
 */
const TOKEN_COLORS: Record<WGSLTokenType, string> = {
  keyword: '#c586c0',
  type: '#4ec9b0',
  builtin: '#dcdcaa',
  function: '#dcdcaa',
  number: '#b5cea8',
  string: '#ce9178',
  comment: '#6a9955',
  operator: '#d4d4d4',
  attribute: '#569cd6',
  variable: '#9cdcfe',
  constant: '#4fc1ff',
};

/**
 * Tokenize a WGSL source line into colored spans
 */
function tokenizeLine(line: string): Array<{ text: string; type: WGSLTokenType | null }> {
  const tokens: Array<{ text: string; type: WGSLTokenType | null }> = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Comments
    const commentMatch = remaining.match(/^(\/\/.*)$/);
    if (commentMatch) {
      tokens.push({ text: commentMatch[1], type: 'comment' });
      remaining = remaining.slice(commentMatch[1].length);
      continue;
    }

    // Attributes (@something)
    const attrMatch = remaining.match(/^(@\w+)/);
    if (attrMatch) {
      tokens.push({ text: attrMatch[1], type: 'attribute' });
      remaining = remaining.slice(attrMatch[1].length);
      continue;
    }

    // Numbers
    const numMatch = remaining.match(/^(\d+\.?\d*[fhiu]?|\.\d+[fh]?|0x[0-9a-fA-F]+[iu]?)/);
    if (numMatch) {
      tokens.push({ text: numMatch[1], type: 'number' });
      remaining = remaining.slice(numMatch[1].length);
      continue;
    }

    // Identifiers (keywords, types, builtins, etc.)
    const identMatch = remaining.match(/^([a-zA-Z_]\w*)/);
    if (identMatch) {
      const word = identMatch[1];
      let type: WGSLTokenType | null = null;

      if (WGSL_KEYWORDS.has(word)) {
        type = 'keyword';
      } else if (WGSL_TYPES.has(word)) {
        type = 'type';
      } else if (WGSL_BUILTINS.has(word)) {
        type = 'builtin';
      } else if (WGSL_ATTRIBUTES.has(word)) {
        type = 'attribute';
      } else {
        type = 'variable';
      }

      tokens.push({ text: word, type });
      remaining = remaining.slice(word.length);
      continue;
    }

    // Operators and punctuation
    const opMatch = remaining.match(/^([+\-*/%&|^~<>=!]+|[{}()\[\],;:.])/);
    if (opMatch) {
      tokens.push({ text: opMatch[1], type: 'operator' });
      remaining = remaining.slice(opMatch[1].length);
      continue;
    }

    // Whitespace
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ text: wsMatch[1], type: null });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }

    // Anything else
    tokens.push({ text: remaining[0], type: null });
    remaining = remaining.slice(1);
  }

  return tokens;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface HighlightedLineProps {
  line: string;
  lineNumber: number;
  showLineNumbers: boolean;
  hasError: boolean;
  theme: WebGPUComputeTheme;
  fontSize: number;
}

const HighlightedLine: React.FC<HighlightedLineProps> = ({
  line,
  lineNumber,
  showLineNumbers,
  hasError,
  theme,
  fontSize,
}) => {
  const tokens = useMemo(() => tokenizeLine(line), [line]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: fontSize + 6,
        background: hasError ? theme.error + '15' : 'transparent',
        borderLeft: hasError ? `2px solid ${theme.error}` : '2px solid transparent',
      }}
    >
      {showLineNumbers && (
        <span
          style={{
            width: 40,
            minWidth: 40,
            textAlign: 'right',
            paddingRight: 8,
            color: theme.textSecondary,
            fontSize: fontSize - 1,
            fontFamily: theme.monoFontFamily,
            userSelect: 'none',
            lineHeight: `${fontSize + 6}px`,
          }}
        >
          {lineNumber}
        </span>
      )}
      <span
        style={{
          flex: 1,
          fontFamily: theme.monoFontFamily,
          fontSize,
          lineHeight: `${fontSize + 6}px`,
          whiteSpace: 'pre',
        }}
      >
        {tokens.map((token, i) => (
          <span
            key={i}
            style={{
              color: token.type ? TOKEN_COLORS[token.type] : theme.text,
            }}
          >
            {token.text}
          </span>
        ))}
      </span>
    </div>
  );
};

interface CompilationStatusProps {
  status: ShaderCompilationStatus;
  errors: ShaderCompilationError[];
  compilationTimeMs: number;
  dirty: boolean;
  theme: WebGPUComputeTheme;
}

const CompilationStatus: React.FC<CompilationStatusProps> = ({
  status,
  errors,
  compilationTimeMs,
  dirty,
  theme,
}) => {
  const statusConfig: Record<ShaderCompilationStatus, { color: string; label: string }> = {
    idle: { color: theme.textSecondary, label: 'IDLE' },
    compiling: { color: theme.warning, label: 'COMPILING...' },
    success: { color: theme.success, label: 'COMPILED' },
    error: { color: theme.error, label: 'ERROR' },
  };

  const config = statusConfig[status];
  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        background: theme.panelBg,
        borderTop: `1px solid ${theme.border}`,
        fontSize: theme.fontSize - 1,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            color: config.color,
            fontWeight: 600,
            fontFamily: theme.monoFontFamily,
          }}
        >
          {config.label}
        </span>
        {dirty && <span style={{ color: theme.warning }}>(unsaved changes)</span>}
        {errorCount > 0 && (
          <span style={{ color: theme.error }}>
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        )}
        {warningCount > 0 && (
          <span style={{ color: theme.warning }}>
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {compilationTimeMs > 0 && (
        <span style={{ color: theme.textSecondary }}>{compilationTimeMs.toFixed(1)}ms</span>
      )}
    </div>
  );
};

interface ErrorListProps {
  errors: ShaderCompilationError[];
  theme: WebGPUComputeTheme;
}

const ErrorList: React.FC<ErrorListProps> = ({ errors, theme }) => {
  if (errors.length === 0) return null;

  return (
    <div
      style={{
        maxHeight: 120,
        overflowY: 'auto',
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      {errors.map((error, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 6,
            padding: '4px 8px',
            fontSize: theme.fontSize - 1,
            background:
              error.severity === 'error'
                ? theme.error + '10'
                : error.severity === 'warning'
                  ? theme.warning + '10'
                  : 'transparent',
            borderBottom: `1px solid ${theme.border}20`,
          }}
        >
          <span
            style={{
              color:
                error.severity === 'error'
                  ? theme.error
                  : error.severity === 'warning'
                    ? theme.warning
                    : theme.info,
              fontWeight: 600,
              fontFamily: theme.monoFontFamily,
              minWidth: 50,
            }}
          >
            {error.severity.toUpperCase()}
          </span>
          {error.lineNumber !== null && (
            <span
              style={{ color: theme.textSecondary, fontFamily: theme.monoFontFamily, minWidth: 40 }}
            >
              L{error.lineNumber}
              {error.columnNumber !== null ? `:${error.columnNumber}` : ''}
            </span>
          )}
          <span style={{ color: theme.text, flex: 1 }}>{error.message}</span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ShaderEditorPanel
 *
 * WGSL code editor with syntax highlighting, compile/dispatch controls,
 * error display, and template loading. Designed for interactive shader
 * development and debugging of WebGPU compute pipelines.
 *
 * @example
 * ```tsx
 * <ShaderEditorPanel
 *   pipelineName="particle-update"
 *   onCompile={(source) => {
 *     try {
 *       gpuContext.createComputePipeline('particle-update', source);
 *       return []; // No errors
 *     } catch (e) {
 *       return [{ message: e.message, lineNumber: null, columnNumber: null, severity: 'error' }];
 *     }
 *   }}
 *   onCompileAndDispatch={(source) => {
 *     gpuContext.createComputePipeline('particle-update', source);
 *     gpuContext.dispatch('particle-update', [64, 1, 1]);
 *   }}
 *   visible={true}
 * />
 * ```
 */
export const ShaderEditorPanel: React.FC<ShaderEditorPanelProps> = ({
  initialSource,
  pipelineName,
  onCompile,
  onCompileAndDispatch,
  onSourceChange,
  className,
  visible = true,
  readOnly = false,
}) => {
  const theme = DEFAULT_WEBGPU_COMPUTE_THEME;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { state, actions } = useShaderEditor({
    initialSource,
    pipelineName,
    onCompile,
    onSourceChange,
  });

  // Lines with errors for highlighting
  const errorLines = useMemo(() => {
    const lines = new Set<number>();
    state.errors.forEach((e) => {
      if (e.lineNumber !== null) lines.add(e.lineNumber);
    });
    return lines;
  }, [state.errors]);

  const sourceLines = state.source.split('\n');

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!readOnly) {
        actions.setSource(e.target.value);
      }
    },
    [readOnly, actions]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter to compile
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        actions.compile();
      }
      // Ctrl+Shift+Enter to compile and dispatch
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        actions.compileAndDispatch();
        onCompileAndDispatch?.(state.source);
      }
      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newValue = state.source.substring(0, start) + '  ' + state.source.substring(end);
          actions.setSource(newValue);
          // Restore cursor position after React re-renders
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          });
        }
      }
    },
    [actions, onCompileAndDispatch, state.source]
  );

  if (!visible) return null;

  return (
    <div
      className={className}
      role="region"
      aria-label="WGSL Shader Editor"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        fontFamily: theme.fontFamily,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: theme.panelBg,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3
            style={{
              margin: 0,
              fontSize: theme.fontSize + 1,
              fontWeight: 700,
              color: theme.accent,
              fontFamily: theme.monoFontFamily,
            }}
          >
            WGSL Editor
          </h3>
          {pipelineName && (
            <span
              style={{
                padding: '2px 6px',
                background: theme.compute + '20',
                color: theme.compute,
                borderRadius: 3,
                fontSize: theme.fontSize - 1,
                fontFamily: theme.monoFontFamily,
              }}
            >
              {pipelineName}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {/* Template selector */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                actions.loadTemplate(e.target.value);
                e.target.value = '';
              }
            }}
            aria-label="Load shader template"
            style={{
              padding: '4px 6px',
              background: theme.inputBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 3,
              color: theme.textSecondary,
              fontSize: theme.fontSize - 1,
              fontFamily: theme.monoFontFamily,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Templates</option>
            {Object.keys(WGSL_TEMPLATES).map((name) => (
              <option key={name} value={name}>
                {name.replace(/-/g, ' ')}
              </option>
            ))}
          </select>

          {/* Format button */}
          <button
            onClick={actions.formatSource}
            aria-label="Format shader source"
            style={{
              padding: '4px 8px',
              background: theme.inputBg,
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: theme.fontSize - 1,
              fontFamily: theme.monoFontFamily,
            }}
          >
            Format
          </button>

          {/* Toggle line numbers */}
          <button
            onClick={actions.toggleLineNumbers}
            aria-label={state.showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            aria-pressed={state.showLineNumbers}
            style={{
              padding: '4px 8px',
              background: state.showLineNumbers ? theme.accent + '20' : theme.inputBg,
              color: state.showLineNumbers ? theme.accent : theme.textSecondary,
              border: `1px solid ${state.showLineNumbers ? theme.accent + '40' : theme.border}`,
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: theme.fontSize - 1,
              fontFamily: theme.monoFontFamily,
            }}
          >
            #
          </button>

          {/* Compile button */}
          <button
            onClick={actions.compile}
            disabled={state.compilationStatus === 'compiling'}
            aria-label="Compile shader (Ctrl+Enter)"
            style={{
              padding: '4px 12px',
              background:
                state.compilationStatus === 'compiling' ? theme.textSecondary : theme.success,
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: state.compilationStatus === 'compiling' ? 'not-allowed' : 'pointer',
              fontSize: theme.fontSize,
              fontFamily: theme.monoFontFamily,
              fontWeight: 600,
            }}
          >
            Compile
          </button>

          {/* Compile & Dispatch button */}
          <button
            onClick={() => {
              actions.compileAndDispatch();
              onCompileAndDispatch?.(state.source);
            }}
            disabled={state.compilationStatus === 'compiling'}
            aria-label="Compile and dispatch shader (Ctrl+Shift+Enter)"
            style={{
              padding: '4px 12px',
              background:
                state.compilationStatus === 'compiling' ? theme.textSecondary : theme.compute,
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: state.compilationStatus === 'compiling' ? 'not-allowed' : 'pointer',
              fontSize: theme.fontSize,
              fontFamily: theme.monoFontFamily,
              fontWeight: 600,
            }}
          >
            Run
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 300,
          overflow: 'auto',
        }}
      >
        {/* Highlighted code overlay (for display) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px 0',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {sourceLines.map((line, i) => (
            <HighlightedLine
              key={i}
              line={line}
              lineNumber={i + 1}
              showLineNumbers={state.showLineNumbers}
              hasError={errorLines.has(i + 1)}
              theme={theme}
              fontSize={state.fontSize}
            />
          ))}
        </div>

        {/* Actual textarea (for input) */}
        <textarea
          ref={textareaRef}
          value={state.source}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          aria-label="WGSL shader source code"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: 300,
            padding: `8px 0 8px ${state.showLineNumbers ? 48 : 0}px`,
            background: 'transparent',
            color: 'transparent',
            caretColor: theme.text,
            border: 'none',
            outline: 'none',
            fontFamily: theme.monoFontFamily,
            fontSize: state.fontSize,
            lineHeight: `${state.fontSize + 6}px`,
            resize: 'vertical',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
            tabSize: 2,
            zIndex: 2,
          }}
        />
      </div>

      {/* Compilation status bar */}
      <CompilationStatus
        status={state.compilationStatus}
        errors={state.errors}
        compilationTimeMs={state.compilationTimeMs}
        dirty={state.dirty}
        theme={theme}
      />

      {/* Error list */}
      <ErrorList errors={state.errors} theme={theme} />

      {/* Footer info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 8px',
          fontSize: theme.fontSize - 2,
          color: theme.textSecondary,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <span>
          {state.lineCount} line{state.lineCount !== 1 ? 's' : ''}
          {' | '}
          Ln {state.cursorPosition.line}, Col {state.cursorPosition.column}
        </span>
        <span>Ctrl+Enter: Compile | Ctrl+Shift+Enter: Run | Tab: Indent</span>
      </div>
    </div>
  );
};
