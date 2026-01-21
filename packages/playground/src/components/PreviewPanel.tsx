/**
 * Preview Panel Component - Live 3D Rendering
 */

import React, { useEffect, useRef } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import { PreviewService } from '@services/PreviewService';
import { HoloScriptService } from '@services/HoloScriptService';

const PreviewPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewServiceRef = useRef<PreviewService | null>(null);
  const { editor, updateMetrics, setPreviewLoading, setPreviewError, preview, playground, setSelectedObject } = usePlaygroundStore();

  // Initialize preview
  useEffect(() => {
    if (!canvasRef.current) return;

    const initPreview = async () => {
      try {
        setPreviewLoading(true);
        const service = new PreviewService();
        await service.initialize(canvasRef.current!);
        
        // Handle Visual -> Code updates
        service.onObjectChange = (id, updates) => {
            const currentCode = usePlaygroundStore.getState().editor.code;
            const newCode = HoloScriptService.patchHoloScript(currentCode, id, updates);
            usePlaygroundStore.getState().setCode(newCode);
        };

        previewServiceRef.current = service;
        setPreviewLoading(false);

        // Update metrics periodically
        const interval = setInterval(() => {
          const metrics = service.getMetrics();
          updateMetrics(metrics.fps, metrics.frameTime, 1);
        }, 100);

        return () => clearInterval(interval);
      } catch (error) {
        setPreviewError({
          id: 'preview-init',
          type: 'runtime',
          message: `Preview initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    };

    const cleanup = initPreview();
    return () => {
      cleanup.then((fn) => fn?.());
      previewServiceRef.current?.dispose();
    };
  }, [setPreviewLoading, setPreviewError, updateMetrics]);

  // Update scene on code change
  useEffect(() => {
    if (!previewServiceRef.current) return;

    const compilation = HoloScriptService.compile(editor.code);
    if (!compilation.success) {
      return;
    }

    // Clear previous objects
    previewServiceRef.current.clear();

    // Parse and create objects from code
    const lines = editor.code.split('\n');
    let objectCount = 0;

    // Simple parsing - find object definitions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('object ')) {
        const match = line.match(/object\s+(\w+)/);
        if (match) {
          const objectName = match[1];

          // Look for properties
          let properties: any = {
            color: 0x00ff00,
            metalness: 0.5,
            roughness: 0.5,
          };

          // Parse properties from next lines
          for (let j = i + 1; j < lines.length && j < i + 10; j++) {
            const propLine = lines[j].trim();

            if (propLine.includes('position:')) {
              const match = propLine.match(/\[([\d.\-, ]+)\]/);
              if (match) {
                const [x, y, z] = match[1].split(',').map((s) => parseFloat(s.trim()));
                properties.position = { x, y, z };
              }
            }

            if (propLine.includes('color:')) {
              const match = propLine.match(/0x([0-9a-f]+)/i);
              if (match) {
                properties.color = parseInt(match[1], 16);
              }
            }

            if (propLine === '}') break;
          }

          previewServiceRef.current.createObject(objectName, 'cube', properties);
          objectCount++;
        }
      }
    }

    updateMetrics(preview.fps, preview.renderTime, objectCount);
  }, [editor.code, updateMetrics, preview.fps, preview.renderTime]);

  // Sync selection from Store -> 3D Scene
  useEffect(() => {
    if (previewServiceRef.current) {
      previewServiceRef.current.selectObject(playground.selectedObject || null);
    }
  }, [playground.selectedObject]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current || !previewServiceRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const pickedId = previewServiceRef.current.pickObject(x, y);
    if (pickedId !== playground.selectedObject) {
      setSelectedObject(pickedId || undefined);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-200">Live Preview</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>FPS: <span className="text-green-400 font-mono">{preview.fps}</span></span>
            <span>Frame: <span className="text-blue-400 font-mono">{preview.renderTime.toFixed(2)}ms</span></span>
            <span>Objects: <span className="text-purple-400 font-mono">{preview.objectCount}</span></span>
          </div>
        </div>
        {preview.isLoading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-gray-200 rounded-full"></div>
            <span className="text-xs text-gray-400">Loading...</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-gray-900 to-black">
        {preview.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="bg-red-900 text-white p-4 rounded-lg max-w-sm">
              <h4 className="font-bold mb-2">Preview Error</h4>
              <p className="text-sm">{preview.error.message}</p>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className="w-full h-full cursor-crosshair touch-none"
          style={{ display: preview.error ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
