/**
 * Main App Component - HoloScript Playground Enhanced Edition
 * Includes: Monaco Editor, Preview, AI Chat, Performance Profiler, Property Inspector
 */

import React, { useState } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import MonacoEditor from '@components/MonacoEditor';
import PreviewPanel from '@components/PreviewPanel';
import BrittneyChat from '@components/BrittneyChat';
import BrittneyGameAssistant from '@components/BrittneyGameAssistant';
import ErrorVisualizer from '@components/ErrorVisualizer';
import PerformanceProfiler from '@components/PerformanceProfiler';
import PropertyInspector from '@components/PropertyInspector';
import AssetBrowser from '@components/AssetBrowser';
import BattleArenaDemo from '@components/BattleArenaDemo';
import TopBar from '@components/TopBar';

type PanelLayout = 'default' | 'compact' | 'fullscreen' | 'debug';
type RightPanelTab = 'chat' | 'profiler' | 'inspector' | 'battle' | 'game-gen' | 'library';

function App() {
  const { ui, darkMode, toggleDarkMode } = usePlaygroundStore();
  const [layout, setLayout] = useState<PanelLayout>('default');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('chat');

  // Render the appropriate layout based on selection
  const renderLayout = () => {
    switch (layout) {
      case 'compact':
        return renderCompactLayout();
      case 'fullscreen':
        return renderFullscreenLayout();
      case 'debug':
        return renderDebugLayout();
      default:
        return renderDefaultLayout();
    }
  };

  // Default layout (split panels)
  const renderDefaultLayout = () => (
    <div className="flex-1 flex gap-2 p-2 bg-gray-900 overflow-hidden">
      {/* Left Side - Editor & Preview */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Top Left - Editor (60%) */}
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <MonacoEditor />
        </div>
        {/* Bottom Left - Preview (40%) */}
        <div className="h-2/5 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <PreviewPanel />
        </div>
      </div>

      {/* Right Side - Tools & Chat */}
      <div className="w-96 flex flex-col gap-2 min-w-0">
        {/* Top Right - Asset Browser (60%) */}
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <AssetBrowser />
        </div>

        {/* Bottom Right - Tabbed Interface (40%) */}
        <div className="flex flex-col gap-2 h-2/5 min-h-0">
          {/* Tab Headers */}
          <div className="flex gap-1 px-3 py-2 bg-gray-800 border-b border-gray-700 rounded-t-lg overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setRightPanelTab('chat')}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap ${
                rightPanelTab === 'chat'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setRightPanelTab('library')}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap ${
                rightPanelTab === 'library'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📚 Library
            </button>
            <button
              onClick={() => setRightPanelTab('battle')}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap ${
                rightPanelTab === 'battle'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ⚔️ Battle
            </button>
            <button
              onClick={() => setRightPanelTab('game-gen')}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap ${
                rightPanelTab === 'game-gen'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🤖 Game Gen
            </button>
            <button
              onClick={() => setRightPanelTab('profiler')}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap ${
                rightPanelTab === 'profiler'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📊 Profiler
            </button>
            <button
              onClick={() => setRightPanelTab('inspector')}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap ${
                rightPanelTab === 'inspector'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📋 Inspector
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden rounded-b-lg border border-gray-700 border-t-0 shadow-lg">
            {rightPanelTab === 'chat' && <BrittneyChat />}
            {rightPanelTab === 'battle' && <BattleArenaDemo />}
            {rightPanelTab === 'game-gen' && <BrittneyGameAssistant />}
            {rightPanelTab === 'profiler' && <PerformanceProfiler />}
            {rightPanelTab === 'inspector' && <PropertyInspector />}
          </div>
        </div>

        {/* Error Visualizer (always at bottom) */}
        {ui.showErrors && (
          <div className="h-1/5 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
            <ErrorVisualizer />
          </div>
        )}
      </div>
    </div>
  );

  // Compact layout (editor only, panels on side)
  const renderCompactLayout = () => (
    <div className="flex-1 flex gap-2 p-2 bg-gray-900 overflow-hidden">
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
        <MonacoEditor />
      </div>
      <div className="w-80 flex flex-col gap-2 min-w-0">
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <BrittneyChat />
        </div>
      </div>
    </div>
  );

  // Fullscreen layout (single panel)
  const renderFullscreenLayout = () => (
    <div className="flex-1 flex gap-2 p-2 bg-gray-900 overflow-hidden">
      {rightPanelTab === 'chat' ? (
        <BrittneyChat />
      ) : rightPanelTab === 'profiler' ? (
        <PerformanceProfiler />
      ) : (
        <PropertyInspector />
      )}
    </div>
  );

  // Debug layout (all panels visible)
  const renderDebugLayout = () => (
    <div className="flex-1 flex flex-col gap-2 p-2 bg-gray-900 overflow-hidden">
      <div className="flex gap-2 flex-1 min-h-0">
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <MonacoEditor />
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <PreviewPanel />
        </div>
      </div>
      <div className="flex gap-2 h-1/3 min-h-0">
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <BrittneyChat />
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <PerformanceProfiler />
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <PropertyInspector />
        </div>
      </div>
      {ui.showErrors && (
        <div className="h-1/5 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
          <ErrorVisualizer />
        </div>
      )}
    </div>
  );

  return (
    <div className={`h-screen w-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      {/* Top Bar with Layout Controls */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between px-4 py-2">
          <TopBar onToggleDarkMode={toggleDarkMode} />
          <div className="flex gap-1">
            <button
              onClick={() => setLayout('default')}
              className={`px-2 py-1 text-xs rounded transition ${
                layout === 'default' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="Default layout"
            >
              📐 Default
            </button>
            <button
              onClick={() => setLayout('compact')}
              className={`px-2 py-1 text-xs rounded transition ${
                layout === 'compact' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="Compact layout"
            >
              📦 Compact
            </button>
            <button
              onClick={() => setLayout('fullscreen')}
              className={`px-2 py-1 text-xs rounded transition ${
                layout === 'fullscreen' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="Fullscreen layout"
            >
              ⛶ Full
            </button>
            <button
              onClick={() => setLayout('debug')}
              className={`px-2 py-1 text-xs rounded transition ${
                layout === 'debug' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="Debug layout"
            >
              🐛 Debug
            </button>
          </div>
        </div>
      </div>

      {/* Layout Content */}
      {renderLayout()}
    </div>
  );
}

export default App;
