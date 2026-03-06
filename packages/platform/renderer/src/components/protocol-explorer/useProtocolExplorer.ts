/**
 * useProtocolExplorer Hook
 *
 * React hook that manages the Protocol Explorer state.
 * Captures, normalizes, and filters protocol messages from
 * the MCP Mesh Orchestrator normalization gateway.
 *
 * The hook does NOT subscribe directly to any gateway.
 * Instead, it provides imperative push methods that the
 * parent component or integration layer calls when new
 * messages arrive.
 *
 * @module protocol-explorer/useProtocolExplorer
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  ProtocolExplorerState,
  ProtocolExplorerActions,
  ProtocolExplorerDisplayMode,
  ProtocolExplorerPanel,
  ProtocolMessage,
  AgentCard,
  TranslationEvent,
  ProtocolStats,
  MessageFilter,
  ProtocolType,
} from './types';
import {
  createDefaultFilter,
  createEmptyStats,
  PE_FRAME_BUDGET,
} from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseProtocolExplorerConfig {
  /** Initial display mode (default: 'full') */
  initialDisplayMode?: ProtocolExplorerDisplayMode;
  /** Initially visible panels */
  initialPanels?: ProtocolExplorerPanel[];
  /** Maximum messages retained (default: PE_FRAME_BUDGET.MAX_MESSAGES) */
  maxMessages?: number;
  /** Maximum translation events retained */
  maxTranslations?: number;
}

const ALL_PANELS: ProtocolExplorerPanel[] = [
  'message-stream', 'agent-cards', 'translations', 'stats', 'detail',
];

const DEFAULT_CONFIG: Required<UseProtocolExplorerConfig> = {
  initialDisplayMode: 'full',
  initialPanels: ALL_PANELS,
  maxMessages: PE_FRAME_BUDGET.MAX_MESSAGES,
  maxTranslations: PE_FRAME_BUDGET.MAX_TRANSLATIONS,
};

// =============================================================================
// HOOK
// =============================================================================

export function useProtocolExplorer(
  config?: UseProtocolExplorerConfig,
): [ProtocolExplorerState, ProtocolExplorerActions] {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [messages, setMessages] = useState<ProtocolMessage[]>([]);
  const [agentCards, setAgentCards] = useState<AgentCard[]>([]);
  const [translations, setTranslations] = useState<TranslationEvent[]>([]);
  const [filter, setFilterState] = useState<MessageFilter>(createDefaultFilter());
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [displayMode, setDisplayModeState] = useState<ProtocolExplorerDisplayMode>(
    cfg.initialDisplayMode,
  );
  const [visiblePanels, setVisiblePanels] = useState<Set<ProtocolExplorerPanel>>(
    new Set(cfg.initialPanels),
  );
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);

  // Refs for stats computation
  const messageCountWindowRef = useRef<number[]>([]);
  const latencySumsRef = useRef<Record<ProtocolType, { total: number; count: number }>>({
    MCP: { total: 0, count: 0 },
    A2A: { total: 0, count: 0 },
    ACP: { total: 0, count: 0 },
    ANP: { total: 0, count: 0 },
  });
  const statsWindowStartRef = useRef(Date.now());

  // -------------------------------------------------------
  // COMPUTED STATS
  // -------------------------------------------------------

  const stats = useMemo((): ProtocolStats => {
    const perProtocol: Record<ProtocolType, number> = { MCP: 0, A2A: 0, ACP: 0, ANP: 0 };
    const perCategory: ProtocolStats['perCategory'] = {};
    let totalBytes = 0;

    for (const msg of messages) {
      perProtocol[msg.protocol]++;
      perCategory[msg.category] = (perCategory[msg.category] ?? 0) + 1;
      totalBytes += msg.sizeBytes;
    }

    const successfulTranslations = translations.filter((t) => t.status === 'success').length;
    const translationSuccessRate = translations.length > 0
      ? successfulTranslations / translations.length
      : 1.0;

    const avgLatency: Record<ProtocolType, number> = { MCP: 0, A2A: 0, ACP: 0, ANP: 0 };
    for (const proto of ['MCP', 'A2A', 'ACP', 'ANP'] as ProtocolType[]) {
      const ref = latencySumsRef.current[proto];
      avgLatency[proto] = ref.count > 0 ? ref.total / ref.count : 0;
    }

    // Messages per second: count timestamps in last 1 second
    const now = performance.now();
    const windowMs = messageCountWindowRef.current;
    while (windowMs.length > 0 && now - windowMs[0] > 1000) {
      windowMs.shift();
    }

    return {
      totalMessages: messages.length,
      perProtocol,
      perCategory,
      totalTranslations: translations.length,
      translationSuccessRate,
      avgLatency,
      messagesPerSecond: windowMs.length,
      totalBytes,
      windowStart: statsWindowStartRef.current,
    };
  }, [messages, translations]);

  // -------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------

  const pushMessage = useCallback(
    (message: ProtocolMessage) => {
      if (!isCapturing) return;

      setMessages((prev) => {
        const next = [message, ...prev];
        if (next.length > cfg.maxMessages) {
          return next.slice(0, cfg.maxMessages);
        }
        return next;
      });

      // Track for msgs/sec
      messageCountWindowRef.current.push(performance.now());

      // Track latency
      if (message.latencyMs >= 0) {
        const ref = latencySumsRef.current[message.protocol];
        ref.total += message.latencyMs;
        ref.count++;
      }

      setLastUpdateTimestamp(Date.now());
    },
    [isCapturing, cfg.maxMessages],
  );

  const updateAgentCard = useCallback(
    (card: AgentCard) => {
      setAgentCards((prev) => {
        const idx = prev.findIndex((c) => c.agentId === card.agentId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = card;
          return next;
        }
        return [...prev, card];
      });
      setLastUpdateTimestamp(Date.now());
    },
    [],
  );

  const pushTranslation = useCallback(
    (event: TranslationEvent) => {
      if (!isCapturing) return;

      setTranslations((prev) => {
        const next = [event, ...prev];
        if (next.length > cfg.maxTranslations) {
          return next.slice(0, cfg.maxTranslations);
        }
        return next;
      });
      setLastUpdateTimestamp(Date.now());
    },
    [isCapturing, cfg.maxTranslations],
  );

  const selectMessage = useCallback((messageId: string | null) => {
    setSelectedMessageId(messageId);
  }, []);

  const setFilter = useCallback((partial: Partial<MessageFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTranslations([]);
    messageCountWindowRef.current = [];
    latencySumsRef.current = {
      MCP: { total: 0, count: 0 },
      A2A: { total: 0, count: 0 },
      ACP: { total: 0, count: 0 },
      ANP: { total: 0, count: 0 },
    };
    statsWindowStartRef.current = Date.now();
    setSelectedMessageId(null);
  }, []);

  const toggleCapture = useCallback(() => {
    setIsCapturing((prev) => !prev);
  }, []);

  const setDisplayMode = useCallback((mode: ProtocolExplorerDisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const togglePanel = useCallback((panel: ProtocolExplorerPanel) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------
  // ASSEMBLED STATE
  // -------------------------------------------------------

  const state: ProtocolExplorerState = useMemo(
    () => ({
      messages,
      agentCards,
      translations,
      stats,
      filter,
      selectedMessageId,
      isCapturing,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
    }),
    [
      messages,
      agentCards,
      translations,
      stats,
      filter,
      selectedMessageId,
      isCapturing,
      displayMode,
      visiblePanels,
      lastUpdateTimestamp,
    ],
  );

  const actions: ProtocolExplorerActions = useMemo(
    () => ({
      pushMessage,
      updateAgentCard,
      pushTranslation,
      selectMessage,
      setFilter,
      clearMessages,
      toggleCapture,
      setDisplayMode,
      togglePanel,
    }),
    [
      pushMessage,
      updateAgentCard,
      pushTranslation,
      selectMessage,
      setFilter,
      clearMessages,
      toggleCapture,
      setDisplayMode,
      togglePanel,
    ],
  );

  return [state, actions];
}
