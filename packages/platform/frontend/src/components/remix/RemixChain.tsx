'use client';

/**
 * RemixChain Component
 *
 * Visual attribution tree showing remix lineage as an interactive tree/graph.
 *
 * Features:
 *   - Root node is the original work
 *   - Branches show each fork with creator name and date
 *   - Current remix highlighted with accent ring
 *   - Click any node to navigate to that world
 *   - SVG-based tree rendering with animated connection lines
 *   - Handles deep chains (10+ levels) with collapsible nodes
 *   - Metrics per node: remix count, total views, revenue generated
 *
 * Wires to RemixService backend via remixApi.
 *
 * @module remix/RemixChain
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { remixAPI, type RemixTree } from './remixApi';

// ============================================================================
// Props
// ============================================================================

export interface RemixChainProps {
  /** Root world ID to build the tree from */
  rootWorldId: string;
  /** Currently active/highlighted remix world ID */
  currentWorldId?: string;
  /** Called when user clicks a node to navigate */
  onNodeClick: (worldId: string) => void;
  /** Called when user clicks a creator name */
  onCreatorClick?: (creatorId: string) => void;
  /** Max depth to render before collapsing. Default: 5 */
  initialExpandDepth?: number;
  /** Custom className */
  className?: string;
}

// ============================================================================
// Layout Constants
// ============================================================================

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 24;
const CONNECTOR_CURVE = 16;

// ============================================================================
// Types
// ============================================================================

interface LayoutNode {
  tree: RemixTree;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode[];
  collapsed: boolean;
  depth: number;
}

// ============================================================================
// Layout Algorithm
// ============================================================================

/**
 * Recursively compute the layout of a tree.
 * Each node is placed vertically below its parent, with siblings spread horizontally.
 */
function layoutTree(
  tree: RemixTree,
  depth: number,
  initialExpandDepth: number,
  collapsedSet: Set<string>,
): LayoutNode {
  const isCollapsed = collapsedSet.has(tree.worldId) ||
    (depth >= initialExpandDepth && tree.children.length > 0 && !collapsedSet.has(`expanded:${tree.worldId}`));

  const childLayouts: LayoutNode[] = [];

  if (!isCollapsed) {
    for (const child of tree.children) {
      childLayouts.push(layoutTree(child, depth + 1, initialExpandDepth, collapsedSet));
    }
  }

  // Calculate subtree width
  let subtreeWidth: number;
  if (childLayouts.length === 0) {
    subtreeWidth = NODE_WIDTH;
  } else {
    subtreeWidth = childLayouts.reduce(
      (sum, c) => sum + c.width, 0
    ) + (childLayouts.length - 1) * HORIZONTAL_GAP;
    subtreeWidth = Math.max(subtreeWidth, NODE_WIDTH);
  }

  return {
    tree,
    x: 0,
    y: 0,
    width: subtreeWidth,
    height: NODE_HEIGHT,
    children: childLayouts,
    collapsed: isCollapsed && tree.children.length > 0,
    depth,
  };
}

/**
 * Assign absolute x/y positions to each node.
 */
function positionNodes(node: LayoutNode, x: number, y: number): void {
  node.x = x + (node.width - NODE_WIDTH) / 2;
  node.y = y;

  let childX = x;
  const childY = y + NODE_HEIGHT + VERTICAL_GAP;

  for (const child of node.children) {
    positionNodes(child, childX, childY);
    childX += child.width + HORIZONTAL_GAP;
  }
}

/**
 * Collect all nodes into a flat array for rendering.
 */
function flattenNodes(node: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenNodes(child));
  }
  return result;
}

// ============================================================================
// Format Helpers
// ============================================================================

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatRevenue(n: number): string {
  if (n >= 100_000) return `$${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Single tree node rendered as SVG foreignObject */
function TreeNode({
  node,
  isCurrent,
  isRoot,
  onNodeClick,
  onCreatorClick,
  onToggleCollapse,
}: {
  node: LayoutNode;
  isCurrent: boolean;
  isRoot: boolean;
  onNodeClick: (worldId: string) => void;
  onCreatorClick?: (creatorId: string) => void;
  onToggleCollapse: (worldId: string) => void;
}) {
  const { tree, x, y, collapsed } = node;

  return (
    <foreignObject
      x={x}
      y={y}
      width={NODE_WIDTH}
      height={NODE_HEIGHT}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className={`
          w-full h-full rounded-lg border cursor-pointer
          transition-all duration-200 overflow-hidden
          ${isCurrent
            ? 'bg-indigo-500/15 border-indigo-500/50 ring-2 ring-indigo-500/30 ring-offset-1 ring-offset-transparent'
            : isRoot
            ? 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
          }
        `}
        onClick={() => onNodeClick(tree.worldId)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNodeClick(tree.worldId);
          }
        }}
        aria-label={`${tree.title || tree.worldId}${isCurrent ? ' (current)' : ''}`}
      >
        {/* Title row */}
        <div className="px-3 pt-2 flex items-center gap-1.5">
          {isRoot && (
            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">
              Original
            </span>
          )}
          <span className="text-xs font-semibold text-zinc-200 truncate flex-1">
            {tree.title || tree.worldId}
          </span>
        </div>

        {/* Creator + date */}
        <div className="px-3 mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreatorClick?.(tree.creatorId);
            }}
            className="hover:text-zinc-300 transition-colors truncate"
          >
            {tree.creatorName || tree.creatorId || 'Unknown'}
          </button>
        </div>

        {/* Metrics row */}
        <div className="px-3 mt-1.5 flex items-center gap-3 text-[10px]">
          {tree.remixCount > 0 && (
            <span className="text-indigo-400" title={`${tree.remixCount} direct remixes`}>
              {formatCount(tree.remixCount)} remixes
            </span>
          )}
          {tree.totalViews > 0 && (
            <span className="text-zinc-500" title={`${tree.totalViews} views`}>
              {formatCount(tree.totalViews)} views
            </span>
          )}
          {tree.revenueGenerated > 0 && (
            <span className="text-emerald-500" title={`Revenue: ${formatRevenue(tree.revenueGenerated)}`}>
              {formatRevenue(tree.revenueGenerated)}
            </span>
          )}
        </div>

        {/* Collapse/expand indicator */}
        {collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(tree.worldId);
            }}
            className="
              absolute bottom-1 right-2 text-[9px] text-zinc-500
              hover:text-zinc-300 transition-colors
            "
            aria-label={`Expand ${tree.children.length} children`}
          >
            +{tree.children.length} more
          </button>
        )}
      </div>
    </foreignObject>
  );
}

/** SVG connector line between parent and child node */
function ConnectorLine({
  parentX,
  parentY,
  childX,
  childY,
  isCurrent,
}: {
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
  isCurrent: boolean;
}) {
  const startX = parentX + NODE_WIDTH / 2;
  const startY = parentY + NODE_HEIGHT;
  const endX = childX + NODE_WIDTH / 2;
  const endY = childY;
  const midY = (startY + endY) / 2;

  const path = `
    M ${startX} ${startY}
    C ${startX} ${midY + CONNECTOR_CURVE},
      ${endX} ${midY - CONNECTOR_CURVE},
      ${endX} ${endY}
  `;

  return (
    <g>
      {/* Glow layer for current path */}
      {isCurrent && (
        <path
          d={path}
          fill="none"
          stroke="rgba(99, 102, 241, 0.3)"
          strokeWidth={4}
          strokeLinecap="round"
        />
      )}
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={isCurrent ? 'rgba(99, 102, 241, 0.7)' : 'rgba(255, 255, 255, 0.08)'}
        strokeWidth={1.5}
        strokeLinecap="round"
        className="transition-colors duration-300"
      >
        {/* Animated dash for active paths */}
        {isCurrent && (
          <animate
            attributeName="stroke-dashoffset"
            from="20"
            to="0"
            dur="1s"
            repeatCount="indefinite"
          />
        )}
      </path>
    </g>
  );
}

// ============================================================================
// Component
// ============================================================================

export function RemixChain({
  rootWorldId,
  currentWorldId,
  onNodeClick,
  onCreatorClick,
  initialExpandDepth = 5,
  className = '',
}: RemixChainProps) {
  // State
  const [treeData, setTreeData] = useState<RemixTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());

  // Fetch tree data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const tree = await remixAPI.getRemixTree(rootWorldId);
        if (!cancelled) setTreeData(tree);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load remix tree');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [rootWorldId]);

  // Toggle collapse
  const handleToggleCollapse = useCallback((worldId: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(worldId)) {
        next.delete(worldId);
        next.add(`expanded:${worldId}`);
      } else if (next.has(`expanded:${worldId}`)) {
        next.delete(`expanded:${worldId}`);
        next.add(worldId);
      } else {
        // Was auto-collapsed by depth -- mark as expanded
        next.add(`expanded:${worldId}`);
      }
      return next;
    });
  }, []);

  // Compute layout
  const { nodes, connectors, viewBox } = useMemo(() => {
    if (!treeData) return { nodes: [], connectors: [], viewBox: '0 0 0 0' };

    const root = layoutTree(treeData, 0, initialExpandDepth, collapsedSet);
    positionNodes(root, 0, 0);

    const allNodes = flattenNodes(root);

    // Calculate viewBox
    let maxX = 0;
    let maxY = 0;
    for (const n of allNodes) {
      const right = n.x + NODE_WIDTH;
      const bottom = n.y + NODE_HEIGHT;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }

    // Build connector list
    const conns: Array<{
      parentX: number;
      parentY: number;
      childX: number;
      childY: number;
      isCurrent: boolean;
    }> = [];

    function buildConnectors(node: LayoutNode) {
      for (const child of node.children) {
        // Check if child is on the path to current
        const isOnCurrentPath =
          currentWorldId != null &&
          (child.tree.worldId === currentWorldId ||
            isAncestorOf(child, currentWorldId));

        conns.push({
          parentX: node.x,
          parentY: node.y,
          childX: child.x,
          childY: child.y,
          isCurrent: isOnCurrentPath,
        });
        buildConnectors(child);
      }
    }

    buildConnectors(root);

    const padding = 20;
    return {
      nodes: allNodes,
      connectors: conns,
      viewBox: `${-padding} ${-padding} ${maxX + padding * 2} ${maxY + padding * 2}`,
    };
  }, [treeData, collapsedSet, initialExpandDepth, currentWorldId]);

  // Loading
  if (loading) {
    return (
      <div className={`rounded-xl bg-white/[0.02] border border-white/5 p-8 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={3} strokeDasharray="31.4 31.4" strokeLinecap="round" opacity={0.3} />
            <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={3} strokeDasharray="31.4 31.4" strokeDashoffset="23.55" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-zinc-500">Loading remix tree...</span>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={`rounded-xl bg-red-500/5 border border-red-500/20 p-4 ${className}`}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  // Empty
  if (!treeData) {
    return (
      <div className={`rounded-xl bg-white/[0.02] border border-white/5 p-6 text-center ${className}`}>
        <p className="text-sm text-zinc-500">No remix tree data available</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
            <path d="M10 16V10" />
            <path d="M10 10L5 5" />
            <path d="M10 10L15 5" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">Remix Lineage</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span>{treeData.totalDescendants} total remixes</span>
          <span className="text-zinc-700">|</span>
          <span>{nodes.length} nodes visible</span>
        </div>
      </div>

      {/* SVG Tree */}
      <div className="overflow-auto p-4" style={{ maxHeight: '600px' }}>
        <svg
          viewBox={viewBox}
          className="w-full"
          style={{ minWidth: `${nodes.length > 3 ? nodes.length * 100 : 400}px` }}
          role="tree"
          aria-label="Remix attribution tree"
        >
          {/* Connectors (drawn first, behind nodes) */}
          {connectors.map((conn, i) => (
            <ConnectorLine key={i} {...conn} />
          ))}

          {/* Nodes */}
          {nodes.map((node) => (
            <TreeNode
              key={node.tree.worldId}
              node={node}
              isCurrent={node.tree.worldId === currentWorldId}
              isRoot={node.depth === 0}
              onNodeClick={onNodeClick}
              onCreatorClick={onCreatorClick}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-4 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
          Original
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-500/15 border border-indigo-500/50 ring-1 ring-indigo-500/30" />
          Current
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white/[0.03] border border-white/10" />
          Remix
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a layout node (or any descendant) has the given worldId */
function isAncestorOf(node: LayoutNode, worldId: string): boolean {
  for (const child of node.children) {
    if (child.tree.worldId === worldId || isAncestorOf(child, worldId)) {
      return true;
    }
  }
  return false;
}
