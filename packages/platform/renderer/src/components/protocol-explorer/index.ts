/**
 * Protocol Explorer Component Library
 *
 * Developer tool for exploring MCP/A2A/ACP/ANP protocol messages
 * through a unified normalization gateway view. Includes message
 * stream, Agent Card browser, and translation visualization.
 *
 * @example
 * ```tsx
 * import {
 *   ProtocolExplorer,
 *   useProtocolExplorer,
 * } from '@hololand/renderer/components/protocol-explorer';
 *
 * function DevTools() {
 *   const [state, actions] = useProtocolExplorer({
 *     maxMessages: 500,
 *   });
 *
 *   // Connect to normalization gateway
 *   useEffect(() => {
 *     gateway.on('message', (msg) => actions.pushMessage(msg));
 *     gateway.on('translation', (evt) => actions.pushTranslation(evt));
 *     gateway.on('agent-card', (card) => actions.updateAgentCard(card));
 *   }, []);
 *
 *   return (
 *     <ProtocolExplorer
 *       externalState={state}
 *       externalActions={actions}
 *       mode="full"
 *     />
 *   );
 * }
 * ```
 *
 * @module protocol-explorer
 */

// Main component
export {
  ProtocolExplorer,
  type ProtocolExplorerProps,
} from './ProtocolExplorer';

// Sub-components
export {
  MessageStream,
  type MessageStreamProps,
} from './MessageStream';

export {
  AgentCardBrowser,
  type AgentCardBrowserProps,
} from './AgentCardBrowser';

export {
  TranslationVisualization,
  type TranslationVisualizationProps,
} from './TranslationVisualization';

// Hook
export {
  useProtocolExplorer,
  type UseProtocolExplorerConfig,
} from './useProtocolExplorer';

// Types
export type {
  ProtocolType,
  MessageDirection,
  MessageCategory,
  ProtocolMeta,
  ProtocolMessage,
  AgentCard,
  AgentCapabilityEntry,
  TranslationEvent,
  ProtocolExplorerDisplayMode,
  ProtocolExplorerPanel,
  ProtocolStats,
  MessageFilter,
  ProtocolExplorerState,
  ProtocolExplorerActions,
  ProtocolExplorerTheme,
} from './types';

export {
  PROTOCOL_CONFIG,
  DEFAULT_PE_THEME,
  PE_FRAME_BUDGET,
  getProtocolColor,
  getDirectionColor,
  formatBytes,
  formatLatency,
  createMessageId,
  createDefaultFilter,
  createEmptyStats,
} from './types';
