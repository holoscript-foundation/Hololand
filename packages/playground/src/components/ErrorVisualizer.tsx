/**
 * Error Visualizer Component - Shows syntax and runtime errors
 */

import React from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';

const ErrorVisualizer: React.FC = () => {
  const { playground, clearErrors } = usePlaygroundStore();
  const { errors } = playground;

  const errorCounts = {
    syntax: errors.filter((e) => e.type === 'syntax').length,
    runtime: errors.filter((e) => e.type === 'runtime').length,
    warning: errors.filter((e) => e.type === 'warning').length,
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'syntax':
        return 'bg-red-900 border-red-700 text-red-100';
      case 'runtime':
        return 'bg-orange-900 border-orange-700 text-orange-100';
      case 'warning':
        return 'bg-yellow-900 border-yellow-700 text-yellow-100';
      default:
        return 'bg-gray-800 border-gray-700 text-gray-100';
    }
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'syntax':
        return '⚠️';
      case 'runtime':
        return '❌';
      case 'warning':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-200">Error Report</h3>
          <div className="flex gap-3 text-xs">
            {errorCounts.syntax > 0 && (
              <span className="text-red-400">
                <span className="font-semibold">{errorCounts.syntax}</span> Syntax
              </span>
            )}
            {errorCounts.runtime > 0 && (
              <span className="text-orange-400">
                <span className="font-semibold">{errorCounts.runtime}</span> Runtime
              </span>
            )}
            {errorCounts.warning > 0 && (
              <span className="text-yellow-400">
                <span className="font-semibold">{errorCounts.warning}</span> Warning
              </span>
            )}
            {errors.length === 0 && (
              <span className="text-green-400">✓ No errors</span>
            )}
          </div>
        </div>
        {errors.length > 0 && (
          <button
            onClick={clearErrors}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Errors List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {errors.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm">No errors detected</p>
            <p className="text-xs mt-1">Your code looks good!</p>
          </div>
        ) : (
          errors.map((error, index) => (
            <div
              key={error.id}
              className={`p-3 rounded border ${getErrorColor(error.type)}`}
            >
              <div className="flex gap-3">
                <span className="text-lg flex-shrink-0">{getErrorIcon(error.type)}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{error.message}</p>
                      {error.line && (
                        <p className="text-xs opacity-75 mt-1">
                          Line {error.line}
                          {error.column && `, Column ${error.column}`}
                        </p>
                      )}
                    </div>
                    <span className="text-xs opacity-60 flex-shrink-0">{error.type}</span>
                  </div>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer opacity-60 hover:opacity-100">
                        Stack trace
                      </summary>
                      <pre className="text-xs mt-1 p-2 bg-black/30 rounded overflow-x-auto max-h-24">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Tips */}
      {errors.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-800/50 p-3">
          <p className="text-xs text-gray-400">
            💡 <span className="font-semibold">Tip:</span> Click on errors in the editor to jump to that line.
            Use Ctrl+Enter to compile your code.
          </p>
        </div>
      )}
    </div>
  );
};

export default ErrorVisualizer;
