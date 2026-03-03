'use client';

/**
 * RemixEditor Component
 *
 * Attribution and diff viewer shown when a forked world/asset opens in Creator Studio.
 *
 * Features:
 *   - Parent attribution banner: "Remixed from [Original Title] by [Creator Name]"
 *     with link to original -- always visible, cannot be removed
 *   - Diff summary showing files added/modified/removed count
 *   - "View Changes" button opens side-by-side diff panel
 *   - Full attribution chain display
 *   - Revenue share info for each attribution node
 *
 * Wires to RemixService backend via remixApi.
 *
 * @module remix/RemixEditor
 */

import { useState, useEffect, useCallback } from 'react';
import {
  remixAPI,
  type RemixInfo,
  type AttributionNode,
  type RemixDiffSummary,
} from './remixApi';

// ============================================================================
// Props
// ============================================================================

export interface RemixEditorProps {
  /** The remix world ID currently open in Creator Studio */
  remixWorldId: string;
  /** Called when user clicks the link to original world */
  onNavigateToWorld: (worldId: string) => void;
  /** Called when user clicks a creator name */
  onNavigateToCreator?: (creatorId: string) => void;
  /** Custom className for outer container */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronIcon({ className, direction = 'down' }: { className?: string; direction?: 'up' | 'down' }) {
  return (
    <svg
      className={`${className ?? ''} transition-transform duration-200 ${direction === 'up' ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Diff stat badge with color coding */
function DiffStatBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1
        rounded-md border text-xs font-medium
        ${colorClasses[color]}
      `}
      aria-label={`${count} files ${label.toLowerCase()}`}
    >
      <span className="font-bold">{count}</span>
      <span className="opacity-75">{label}</span>
    </div>
  );
}

/** Attribution chain node display */
function AttributionNodeCard({
  node,
  isRoot,
  onNavigateToWorld,
  onNavigateToCreator,
}: {
  node: AttributionNode;
  isRoot: boolean;
  onNavigateToWorld: (worldId: string) => void;
  onNavigateToCreator?: (creatorId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {/* Generation indicator */}
      <div
        className={`
          flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
          text-[10px] font-bold
          ${isRoot
            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            : 'bg-white/5 text-zinc-500 border border-white/10'
          }
        `}
        aria-label={`Generation ${node.generation}`}
      >
        {node.generation}
      </div>

      {/* Node info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onNavigateToWorld(node.worldId)}
          className="text-sm font-medium text-zinc-300 hover:text-indigo-400 transition-colors truncate block text-left"
        >
          {node.title || node.worldId}
        </button>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <button
            onClick={() => onNavigateToCreator?.(node.creatorId)}
            className="hover:text-zinc-300 transition-colors"
          >
            {node.creatorName || node.creatorId}
          </button>
          {node.revenueSharePercent > 0 && (
            <span className="text-emerald-500/70">
              {node.revenueSharePercent}% revenue share
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Diff detail panel showing modifications */
function DiffPanel({
  diff,
  visible,
}: {
  diff: RemixDiffSummary;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="mt-3 rounded-lg bg-black/30 border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <span className="text-xs font-medium text-zinc-400">Changes from original</span>
      </div>

      {/* Modification list */}
      <div className="max-h-60 overflow-y-auto">
        {diff.modifications.length > 0 ? (
          <ul className="divide-y divide-white/[0.03]">
            {diff.modifications.map((mod, i) => (
              <li key={i} className="px-4 py-2 text-xs text-zinc-400 font-mono">
                {mod}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-zinc-600">
            No detailed modifications recorded
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function RemixEditor({
  remixWorldId,
  onNavigateToWorld,
  onNavigateToCreator,
  className = '',
}: RemixEditorProps) {
  // State
  const [remixInfo, setRemixInfo] = useState<RemixInfo | null>(null);
  const [chain, setChain] = useState<AttributionNode[]>([]);
  const [diff, setDiff] = useState<RemixDiffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showFullChain, setShowFullChain] = useState(false);

  // Fetch remix data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [info, chainData, diffData] = await Promise.all([
          remixAPI.getRemixInfo(remixWorldId),
          remixAPI.getAttributionChain(remixWorldId),
          remixAPI.getDiffSummary(remixWorldId),
        ]);

        if (cancelled) return;

        setRemixInfo(info);
        setChain(chainData);
        setDiff(diffData);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load remix data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [remixWorldId]);

  const toggleDiff = useCallback(() => setShowDiff((v) => !v), []);
  const toggleChain = useCallback(() => setShowFullChain((v) => !v), []);

  // Not a remix -- nothing to show
  if (!loading && !remixInfo) return null;

  // Loading state
  if (loading) {
    return (
      <div className={`rounded-xl bg-white/[0.02] border border-white/5 p-4 animate-pulse ${className}`}>
        <div className="h-4 w-48 bg-white/5 rounded mb-2" />
        <div className="h-3 w-64 bg-white/5 rounded" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`rounded-xl bg-red-500/5 border border-red-500/20 p-4 ${className}`}>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  // Get the immediate parent (last node in chain)
  const parentNode = chain.length > 0 ? chain[chain.length - 1] : null;
  const rootNode = chain.length > 0 ? chain[0] : null;

  return (
    <div className={`space-y-0 ${className}`}>
      {/* ================================================================
          Attribution Banner (always visible, cannot be removed)
          ================================================================ */}
      <div
        className="
          rounded-t-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10
          border border-indigo-500/20 px-4 py-3
        "
        role="banner"
        aria-label="Remix attribution"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Attribution text */}
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-4 h-4 text-indigo-400 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 16V10" />
              <path d="M10 10L5 5" />
              <path d="M10 10L15 5" />
              <circle cx={5} cy={4} r={1.5} fill="currentColor" stroke="none" />
              <circle cx={15} cy={4} r={1.5} fill="currentColor" stroke="none" />
              <circle cx={10} cy={17} r={1.5} fill="currentColor" stroke="none" />
            </svg>

            <p className="text-sm text-zinc-300 truncate">
              <span className="text-zinc-500">Remixed from</span>{' '}
              <button
                onClick={() => parentNode && onNavigateToWorld(parentNode.worldId)}
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {parentNode?.title || 'Original'}
              </button>{' '}
              <span className="text-zinc-500">by</span>{' '}
              <button
                onClick={() => parentNode && onNavigateToCreator?.(parentNode.creatorId)}
                className="font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {parentNode?.creatorName || parentNode?.creatorId || 'Unknown'}
              </button>
            </p>
          </div>

          {/* View original link */}
          <button
            onClick={() => parentNode && onNavigateToWorld(parentNode.worldId)}
            className="
              flex-shrink-0 inline-flex items-center gap-1.5
              px-3 py-1 rounded-md text-xs font-medium
              text-indigo-400 hover:text-indigo-300
              bg-indigo-500/10 hover:bg-indigo-500/20
              border border-indigo-500/20
              transition-all duration-200
            "
          >
            <LinkIcon className="w-3 h-3" />
            View Original
          </button>
        </div>

        {/* Generation depth indicator */}
        {remixInfo && remixInfo.generation > 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span>Generation {remixInfo.generation}</span>
            <span className="text-zinc-700">|</span>
            <span>Chain depth: {remixInfo.chainLength}</span>
            {rootNode && rootNode !== parentNode && (
              <>
                <span className="text-zinc-700">|</span>
                <span>
                  Original by{' '}
                  <button
                    onClick={() => onNavigateToCreator?.(rootNode.creatorId)}
                    className="text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {rootNode.creatorName || rootNode.creatorId}
                  </button>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ================================================================
          Diff Summary Bar
          ================================================================ */}
      {diff && (
        <div
          className="
            rounded-b-xl bg-white/[0.02] border border-t-0 border-white/5
            px-4 py-2.5
          "
        >
          <div className="flex items-center justify-between gap-4">
            {/* Diff stats */}
            <div className="flex items-center gap-2">
              <DiffStatBadge label="Added" count={diff.filesAdded} color="green" />
              <DiffStatBadge label="Modified" count={diff.filesModified} color="yellow" />
              <DiffStatBadge label="Removed" count={diff.filesRemoved} color="red" />
            </div>

            {/* View Changes button */}
            <button
              onClick={toggleDiff}
              className="
                inline-flex items-center gap-1.5
                px-3 py-1.5 rounded-md text-xs font-medium
                text-zinc-400 hover:text-zinc-200
                bg-white/5 hover:bg-white/10
                border border-white/10
                transition-all duration-200
              "
              aria-expanded={showDiff}
              aria-controls="remix-diff-panel"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3 10a1 1 0 011 1v2h4v-2a1 1 0 112 0v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2a1 1 0 011-1z" />
              </svg>
              {showDiff ? 'Hide Changes' : 'View Changes'}
              <ChevronIcon
                className="w-3.5 h-3.5"
                direction={showDiff ? 'up' : 'down'}
              />
            </button>
          </div>

          {/* Diff detail panel */}
          <div id="remix-diff-panel">
            <DiffPanel diff={diff} visible={showDiff} />
          </div>

          {/* Full attribution chain (expandable) */}
          {chain.length > 1 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <button
                onClick={toggleChain}
                className="
                  flex items-center gap-1.5 text-xs text-zinc-500
                  hover:text-zinc-300 transition-colors w-full text-left
                "
                aria-expanded={showFullChain}
                aria-controls="remix-chain-panel"
              >
                <ChevronIcon
                  className="w-3.5 h-3.5"
                  direction={showFullChain ? 'up' : 'down'}
                />
                Attribution chain ({chain.length} {chain.length === 1 ? 'creator' : 'creators'})
              </button>

              {showFullChain && (
                <div
                  id="remix-chain-panel"
                  className="mt-2 pl-2 border-l-2 border-indigo-500/20 space-y-0"
                >
                  {chain.map((node, i) => (
                    <AttributionNodeCard
                      key={node.worldId}
                      node={node}
                      isRoot={i === 0}
                      onNavigateToWorld={onNavigateToWorld}
                      onNavigateToCreator={onNavigateToCreator}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
