/**
 * Protocol Adapters for the Unified Communication Gateway
 *
 * Each adapter translates between its native protocol format and the
 * Canonical Intermediate Representation (CIR). Three adapter families:
 *
 * 1. AgentProtocolAdapter - MCP/A2A agent-to-agent messages
 * 2. PhotonAdapter / MirrorAdapter - VR multiplayer state sync
 * 3. CRDTAdapter - World state CRDT operations
 *
 * @module gateway/ProtocolAdapters
 */

import {
  type CanonicalMessage,
  type ProtocolAdapter,
  type ProtocolType,
  type AdapterHealth,
  type MessageChannel,
  type MultiplayerStateUpdate,
  MessagePriority,
} from './types';

// =============================================================================
// Utility: UUID Generation
// =============================================================================

function generateId(): string {
  // Crypto-quality UUID without external deps
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

// =============================================================================
// Base Adapter
// =============================================================================

abstract class BaseAdapter<TNative> implements ProtocolAdapter<TNative> {
  abstract readonly protocol: ProtocolType;
  abstract readonly name: string;

  protected _connected = false;
  protected _messagesIn = 0;
  protected _messagesOut = 0;
  protected _errors = 0;
  protected _lastHeartbeat = 0;
  protected _latencyMs = 0;
  protected _errorTimestamps: number[] = [];

  get connected(): boolean {
    return this._connected;
  }

  abstract normalize(native: TNative): CanonicalMessage;
  abstract denormalize(canonical: CanonicalMessage): TNative;

  async start(): Promise<void> {
    this._connected = true;
    this._lastHeartbeat = Date.now();
  }

  async stop(): Promise<void> {
    this._connected = false;
  }

  healthCheck(): AdapterHealth {
    // Prune error timestamps older than 5 minutes
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    this._errorTimestamps = this._errorTimestamps.filter(
      (t) => t > fiveMinAgo,
    );

    return {
      protocol: this.protocol,
      connected: this._connected,
      latencyMs: this._latencyMs,
      messagesIn: this._messagesIn,
      messagesOut: this._messagesOut,
      errorsLast5Min: this._errorTimestamps.length,
      lastHeartbeat: this._lastHeartbeat,
    };
  }

  protected recordError(): void {
    this._errors++;
    this._errorTimestamps.push(Date.now());
  }

  protected recordIn(): void {
    this._messagesIn++;
    this._lastHeartbeat = Date.now();
  }

  protected recordOut(): void {
    this._messagesOut++;
  }
}

// =============================================================================
// MCP Agent Protocol Adapter
// =============================================================================

/**
 * Native MCP message format (Model Context Protocol).
 * Agent tool calls, responses, and notifications.
 */
export interface MCPNativeMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id?: string | number;
}

export class MCPAdapter extends BaseAdapter<MCPNativeMessage> {
  readonly protocol: ProtocolType = 'mcp';
  readonly name = 'MCP Agent Protocol Adapter';

  normalize(native: MCPNativeMessage): CanonicalMessage {
    this.recordIn();

    const isRequest = native.method !== undefined;
    const isResponse = native.result !== undefined || native.error !== undefined;

    let channel: MessageChannel;
    if (isRequest) {
      channel = 'agent.request';
    } else if (isResponse) {
      channel = 'agent.response';
    } else {
      channel = 'agent.broadcast';
    }

    return {
      id: generateId(),
      sourceProtocol: 'mcp',
      channel,
      payload: {
        method: native.method,
        params: native.params,
        result: native.result,
        error: native.error,
      },
      originTimestamp: nowISO(),
      gatewayTimestamp: Date.now(),
      vectorClock: {},
      senderId: String(native.id ?? 'mcp-unknown'),
      correlationId: native.id !== undefined ? String(native.id) : undefined,
      priority: MessagePriority.NORMAL,
      ttlMs: 30000,
    };
  }

  denormalize(canonical: CanonicalMessage): MCPNativeMessage {
    this.recordOut();
    const payload = canonical.payload as Record<string, unknown>;

    if (canonical.channel === 'agent.request') {
      return {
        jsonrpc: '2.0',
        method: payload.method as string,
        params: payload.params as Record<string, unknown>,
        id: canonical.correlationId ?? canonical.id,
      };
    }

    if (payload.error) {
      return {
        jsonrpc: '2.0',
        error: payload.error as { code: number; message: string },
        id: canonical.correlationId ?? canonical.id,
      };
    }

    return {
      jsonrpc: '2.0',
      result: payload.result,
      id: canonical.correlationId ?? canonical.id,
    };
  }
}

// =============================================================================
// A2A (Agent-to-Agent) Protocol Adapter
// =============================================================================

/**
 * A2A native message format for direct agent-to-agent communication.
 */
export interface A2ANativeMessage {
  type: 'task' | 'result' | 'status' | 'error';
  taskId: string;
  from: string;
  to: string;
  payload: unknown;
  skills?: string[];
  timestamp: number;
}

export class A2AAdapter extends BaseAdapter<A2ANativeMessage> {
  readonly protocol: ProtocolType = 'a2a';
  readonly name = 'A2A Agent-to-Agent Protocol Adapter';

  normalize(native: A2ANativeMessage): CanonicalMessage {
    this.recordIn();

    const channelMap: Record<A2ANativeMessage['type'], MessageChannel> = {
      task: 'agent.request',
      result: 'agent.response',
      status: 'agent.broadcast',
      error: 'agent.response',
    };

    return {
      id: generateId(),
      sourceProtocol: 'a2a',
      channel: channelMap[native.type] ?? 'agent.broadcast',
      payload: {
        a2aType: native.type,
        from: native.from,
        to: native.to,
        skills: native.skills,
        data: native.payload,
      },
      originTimestamp: new Date(native.timestamp).toISOString(),
      gatewayTimestamp: Date.now(),
      vectorClock: {},
      senderId: native.from,
      correlationId: native.taskId,
      priority:
        native.type === 'error'
          ? MessagePriority.HIGH
          : MessagePriority.NORMAL,
      ttlMs: 60000,
    };
  }

  denormalize(canonical: CanonicalMessage): A2ANativeMessage {
    this.recordOut();
    const payload = canonical.payload as Record<string, unknown>;

    const typeMap: Record<string, A2ANativeMessage['type']> = {
      'agent.request': 'task',
      'agent.response': 'result',
      'agent.broadcast': 'status',
    };

    return {
      type: (payload.a2aType as A2ANativeMessage['type']) ??
        typeMap[canonical.channel] ?? 'status',
      taskId: canonical.correlationId ?? canonical.id,
      from: canonical.senderId,
      to: (payload.to as string) ?? '',
      payload: payload.data,
      skills: payload.skills as string[],
      timestamp: canonical.gatewayTimestamp,
    };
  }
}

// =============================================================================
// Photon Fusion Adapter (Production VR Multiplayer)
// =============================================================================

/**
 * Photon Fusion native state update.
 * Used for production VR multiplayer with server-authoritative networking.
 */
export interface PhotonNativeMessage {
  opCode: number;
  senderId: number;
  targetActors?: number[];
  data: Record<string, unknown>;
  channelId: number;
  reliable: boolean;
  timestamp: number;
}

export class PhotonAdapter extends BaseAdapter<PhotonNativeMessage> {
  readonly protocol: ProtocolType = 'photon';
  readonly name = 'Photon Fusion VR Multiplayer Adapter';

  /** Photon operation codes mapped to channels */
  private opCodeChannels: Record<number, MessageChannel> = {
    200: 'multiplayer.state',  // State sync
    201: 'multiplayer.event',  // Game events
    202: 'multiplayer.voice',  // Voice data
    253: 'system.health',      // Heartbeat
  };

  normalize(native: PhotonNativeMessage): CanonicalMessage {
    this.recordIn();

    const channel = this.opCodeChannels[native.opCode] ?? 'multiplayer.event';

    // Extract position/rotation if this is a state update
    let payload: unknown = native.data;
    if (native.opCode === 200 && native.data) {
      payload = {
        entityId: native.data.entityId ?? `photon-${native.senderId}`,
        position: native.data.position,
        rotation: native.data.rotation,
        velocity: native.data.velocity,
        sequence: native.data.sequence ?? 0,
        transport: 'photon' as const,
        roomId: native.data.roomId ?? 'default',
        rawData: native.data,
      } satisfies MultiplayerStateUpdate & { rawData: unknown };
    }

    return {
      id: generateId(),
      sourceProtocol: 'photon',
      channel,
      payload,
      originTimestamp: new Date(native.timestamp).toISOString(),
      gatewayTimestamp: Date.now(),
      vectorClock: {},
      senderId: String(native.senderId),
      priority: native.reliable
        ? MessagePriority.HIGH
        : MessagePriority.NORMAL,
      ttlMs: native.reliable ? 10000 : 2000,
    };
  }

  denormalize(canonical: CanonicalMessage): PhotonNativeMessage {
    this.recordOut();
    const payload = canonical.payload as Record<string, unknown>;

    const channelOpCodes: Record<string, number> = {
      'multiplayer.state': 200,
      'multiplayer.event': 201,
      'multiplayer.voice': 202,
      'system.health': 253,
    };

    return {
      opCode: channelOpCodes[canonical.channel] ?? 201,
      senderId: parseInt(canonical.senderId, 10) || 0,
      data: payload.rawData
        ? (payload.rawData as Record<string, unknown>)
        : (payload as Record<string, unknown>),
      channelId: 0,
      reliable: canonical.priority <= MessagePriority.HIGH,
      timestamp: canonical.gatewayTimestamp,
    };
  }
}

// =============================================================================
// Mirror Adapter (Dev/Test VR Multiplayer)
// =============================================================================

/**
 * Mirror Networking native message.
 * Used for development and testing with client-authoritative networking.
 */
export interface MirrorNativeMessage {
  msgType: number;
  connectionId: number;
  channelId: number;
  payload: ArrayBuffer | Record<string, unknown>;
  timestamp: number;
}

export class MirrorAdapter extends BaseAdapter<MirrorNativeMessage> {
  readonly protocol: ProtocolType = 'mirror';
  readonly name = 'Mirror Dev/Test Multiplayer Adapter';

  /** Mirror message type codes */
  private static readonly MSG_STATE = 1;
  private static readonly MSG_EVENT = 2;
  private static readonly MSG_RPC = 3;
  private static readonly MSG_SPAWN = 4;
  private static readonly MSG_DESPAWN = 5;

  normalize(native: MirrorNativeMessage): CanonicalMessage {
    this.recordIn();

    const isState = native.msgType === MirrorAdapter.MSG_STATE;
    const channel: MessageChannel = isState
      ? 'multiplayer.state'
      : 'multiplayer.event';

    // Decode payload
    let decodedPayload: unknown;
    if (native.payload instanceof ArrayBuffer) {
      // Binary payload: decode as entity state
      decodedPayload = this.decodeBinaryState(native.payload, native.connectionId);
    } else {
      decodedPayload = native.payload;
    }

    if (isState && typeof decodedPayload === 'object' && decodedPayload !== null) {
      const data = decodedPayload as Record<string, unknown>;
      decodedPayload = {
        entityId: data.entityId ?? `mirror-${native.connectionId}`,
        position: data.position,
        rotation: data.rotation,
        velocity: data.velocity,
        sequence: data.sequence ?? 0,
        transport: 'mirror' as const,
        roomId: data.roomId ?? 'dev-room',
        rawData: data,
      } satisfies MultiplayerStateUpdate & { rawData: unknown };
    }

    return {
      id: generateId(),
      sourceProtocol: 'mirror',
      channel,
      payload: decodedPayload,
      originTimestamp: new Date(native.timestamp).toISOString(),
      gatewayTimestamp: Date.now(),
      vectorClock: {},
      senderId: String(native.connectionId),
      priority: MessagePriority.NORMAL,
      ttlMs: 5000,
    };
  }

  denormalize(canonical: CanonicalMessage): MirrorNativeMessage {
    this.recordOut();
    const payload = canonical.payload as Record<string, unknown>;

    return {
      msgType:
        canonical.channel === 'multiplayer.state'
          ? MirrorAdapter.MSG_STATE
          : MirrorAdapter.MSG_EVENT,
      connectionId: parseInt(canonical.senderId, 10) || 0,
      channelId: 0,
      payload: payload.rawData
        ? (payload.rawData as Record<string, unknown>)
        : (payload as Record<string, unknown>),
      timestamp: canonical.gatewayTimestamp,
    };
  }

  /**
   * Decode Mirror's compact binary state format.
   * Layout: [entityId:u32][x:f32][y:f32][z:f32][rx:f32][ry:f32][rz:f32][seq:u32]
   */
  private decodeBinaryState(
    buffer: ArrayBuffer,
    connectionId: number,
  ): Record<string, unknown> {
    if (buffer.byteLength < 32) {
      return { entityId: `mirror-${connectionId}`, sequence: 0 };
    }

    const view = new DataView(buffer);
    return {
      entityId: `mirror-${view.getUint32(0, true)}`,
      position: {
        x: view.getFloat32(4, true),
        y: view.getFloat32(8, true),
        z: view.getFloat32(12, true),
      },
      rotation: {
        x: view.getFloat32(16, true),
        y: view.getFloat32(20, true),
        z: view.getFloat32(24, true),
      },
      sequence: view.getUint32(28, true),
    };
  }
}

// =============================================================================
// CRDT World State Adapter
// =============================================================================

/**
 * Native CRDT operation message for world state synchronization.
 */
export interface CRDTNativeMessage {
  op: 'set' | 'delete' | 'increment' | 'merge';
  entityId: string;
  nodeId: string;
  path: string;
  value: unknown;
  clock: Record<string, number>;
  seq: number;
  ts: number;
}

export class CRDTStateAdapter extends BaseAdapter<CRDTNativeMessage> {
  readonly protocol: ProtocolType = 'crdt';
  readonly name = 'CRDT World State Adapter';

  normalize(native: CRDTNativeMessage): CanonicalMessage {
    this.recordIn();

    return {
      id: generateId(),
      sourceProtocol: 'crdt',
      channel: 'world.crdt',
      payload: {
        entityId: native.entityId,
        nodeId: native.nodeId,
        type: native.op,
        path: native.path,
        value: native.value,
        vectorClock: native.clock,
        timestamp: native.ts,
        sequence: native.seq,
      },
      originTimestamp: new Date(native.ts).toISOString(),
      gatewayTimestamp: Date.now(),
      vectorClock: native.clock,
      senderId: native.nodeId,
      priority:
        native.op === 'delete'
          ? MessagePriority.HIGH
          : MessagePriority.NORMAL,
      ttlMs: 30000,
    };
  }

  denormalize(canonical: CanonicalMessage): CRDTNativeMessage {
    this.recordOut();
    const payload = canonical.payload as Record<string, unknown>;

    return {
      op: (payload.type as CRDTNativeMessage['op']) ?? 'set',
      entityId: (payload.entityId as string) ?? '',
      nodeId: canonical.senderId,
      path: (payload.path as string) ?? '',
      value: payload.value,
      clock: canonical.vectorClock,
      seq: (payload.sequence as number) ?? 0,
      ts: canonical.gatewayTimestamp,
    };
  }
}

// =============================================================================
// Adapter Factory
// =============================================================================

export function createAdapter(protocol: ProtocolType): ProtocolAdapter {
  switch (protocol) {
    case 'mcp':
      return new MCPAdapter();
    case 'a2a':
      return new A2AAdapter();
    case 'photon':
      return new PhotonAdapter();
    case 'mirror':
      return new MirrorAdapter();
    case 'crdt':
      return new CRDTStateAdapter();
    default:
      throw new Error(`No adapter registered for protocol: ${protocol}`);
  }
}
