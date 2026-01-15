/**
 * Hololand Example 10 - Collaborative Building
 *
 * Demonstrates real-time collaborative world building using:
 * - @hololand/network for multiplayer synchronization
 * - @hololand/world for scene management
 * - @hololand/social for presence and chat
 *
 * Features:
 * - Create and manipulate 3D primitives
 * - Real-time object synchronization
 * - Remote cursor visualization
 * - Object ownership and locking
 * - Collaborative editing history
 * - Built-in chat system
 */

import {
  NetworkClient,
  RoomManager,
  StateSync,
  TextChat,
  type NetworkMessage,
  type SyncState,
  type ChatMessage,
} from '@hololand/network';

import {
  Scene,
  SceneObject,
  Transform,
  type Vector3,
} from '@hololand/world';

import {
  PresenceManager,
  NotificationSystem,
  createNotificationSystem,
} from '@hololand/social';

// ============================================================================
// Types
// ============================================================================

interface BuildObject {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder' | 'plane';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: string;
  ownerId: string;
  ownerName: string;
  locked: boolean;
  createdAt: number;
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: Vector3 | null;
  currentAction: string | null;
  lastSeen: number;
}

interface HistoryEntry {
  id: string;
  action: string;
  objectName: string;
  userId: string;
  userName: string;
  timestamp: number;
}

type Tool = 'select' | 'move' | 'rotate' | 'scale';

// ============================================================================
// State
// ============================================================================

const state = {
  userId: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  userName: `Builder${Math.floor(Math.random() * 1000)}`,
  userColor: getRandomColor(),
  connected: false,
  roomId: null as string | null,

  // Tools
  currentTool: 'select' as Tool,
  selectedObjectId: null as string | null,

  // Scene data
  objects: new Map<string, BuildObject>(),
  collaborators: new Map<string, Collaborator>(),
  history: [] as HistoryEntry[],

  // Canvas
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  mousePos: { x: 0, y: 0 },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
};

// ============================================================================
// Network Setup
// ============================================================================

const networkClient = new NetworkClient({
  serverUrl: 'wss://hololand-demo.example.com',
  reconnect: true,
  heartbeatInterval: 5000,
});

const roomManager = new RoomManager(networkClient);
const stateSync = new StateSync();
const textChat = new TextChat(state.userId, state.userName);

// ============================================================================
// Notifications
// ============================================================================

const notifications = createNotificationSystem(state.userId);

// ============================================================================
// UI Elements
// ============================================================================

const elements = {
  statusDot: document.getElementById('status-dot')!,
  statusText: document.getElementById('status-text')!,
  playerCount: document.getElementById('player-count')!,
  collaboratorList: document.getElementById('collaborator-list')!,
  sceneTree: document.getElementById('scene-tree')!,
  historyList: document.getElementById('history-list')!,
  chatMessages: document.getElementById('chat-messages')!,
  chatInput: document.getElementById('chat-input') as HTMLInputElement,
  sendBtn: document.getElementById('send-btn')!,
  propertiesContent: document.getElementById('properties-content')!,
  remoteCursors: document.getElementById('remote-cursors')!,
};

// ============================================================================
// Network Event Handlers
// ============================================================================

networkClient.on('connected', () => {
  state.connected = true;
  updateConnectionStatus('connected');
  joinOrCreateRoom();
});

networkClient.on('disconnected', () => {
  state.connected = false;
  updateConnectionStatus('disconnected');
});

networkClient.on('reconnecting', () => {
  updateConnectionStatus('connecting');
});

networkClient.on('message', (data: { message: NetworkMessage }) => {
  handleNetworkMessage(data.message);
});

function handleNetworkMessage(message: NetworkMessage): void {
  switch (message.type) {
    case 'room_state':
      handleRoomState(message.payload);
      break;
    case 'player_joined':
      handlePlayerJoined(message.payload);
      break;
    case 'player_left':
      handlePlayerLeft(message.payload);
      break;
    case 'object_created':
      handleObjectCreated(message.payload);
      break;
    case 'object_updated':
      handleObjectUpdated(message.payload);
      break;
    case 'object_deleted':
      handleObjectDeleted(message.payload);
      break;
    case 'cursor_update':
      handleCursorUpdate(message.payload);
      break;
    case 'chat_message':
      handleChatMessage(message.payload);
      break;
    case 'action_performed':
      handleActionPerformed(message.payload);
      break;
  }
}

// ============================================================================
// Room Management
// ============================================================================

async function joinOrCreateRoom(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || 'default-build-room';

  try {
    // Send join request
    networkClient.send({
      type: 'join_room',
      payload: {
        roomId,
        userId: state.userId,
        userName: state.userName,
        userColor: state.userColor,
      },
      timestamp: Date.now(),
    });

    state.roomId = roomId;
    addSystemMessage(`Joining room: ${roomId}`);
  } catch (error) {
    console.error('Failed to join room:', error);
    addSystemMessage('Failed to connect to room');
  }
}

function handleRoomState(payload: {
  objects: BuildObject[];
  collaborators: Collaborator[];
  history: HistoryEntry[];
}): void {
  // Load existing objects
  state.objects.clear();
  payload.objects.forEach((obj) => {
    state.objects.set(obj.id, obj);
  });

  // Load collaborators
  state.collaborators.clear();
  payload.collaborators.forEach((collab) => {
    if (collab.id !== state.userId) {
      state.collaborators.set(collab.id, collab);
    }
  });

  // Load recent history
  state.history = payload.history.slice(-50);

  // Update UI
  renderSceneTree();
  renderCollaborators();
  renderHistory();
  renderCanvas();

  addSystemMessage('Room state synchronized');
}

function handlePlayerJoined(payload: Collaborator): void {
  if (payload.id === state.userId) return;

  state.collaborators.set(payload.id, payload);
  renderCollaborators();

  addSystemMessage(`${payload.name} joined the room`);
  notifications.push({
    type: 'system',
    title: 'Builder Joined',
    message: `${payload.name} is now building with you`,
    priority: 'low',
  });
}

function handlePlayerLeft(payload: { userId: string; userName: string }): void {
  state.collaborators.delete(payload.userId);
  renderCollaborators();
  removeRemoteCursor(payload.userId);

  addSystemMessage(`${payload.userName} left the room`);
}

// ============================================================================
// Object Management
// ============================================================================

function createObject(type: BuildObject['type']): void {
  const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const obj: BuildObject = {
    id,
    type,
    position: { x: state.mousePos.x, y: state.mousePos.y, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: getRandomColor(),
    ownerId: state.userId,
    ownerName: state.userName,
    locked: false,
    createdAt: Date.now(),
  };

  state.objects.set(id, obj);
  state.selectedObjectId = id;

  // Broadcast to network
  networkClient.send({
    type: 'object_created',
    payload: obj,
    timestamp: Date.now(),
  });

  // Add to history
  addHistoryEntry('Created', type, state.userId, state.userName);

  renderSceneTree();
  renderCanvas();
  renderProperties();
}

function handleObjectCreated(obj: BuildObject): void {
  state.objects.set(obj.id, obj);
  renderSceneTree();
  renderCanvas();
}

function updateObject(id: string, updates: Partial<BuildObject>): void {
  const obj = state.objects.get(id);
  if (!obj) return;

  // Check ownership/lock
  if (obj.locked && obj.ownerId !== state.userId) {
    notifications.push({
      type: 'system',
      title: 'Object Locked',
      message: `This object is locked by ${obj.ownerName}`,
      priority: 'normal',
    });
    return;
  }

  Object.assign(obj, updates);

  // Broadcast to network
  networkClient.send({
    type: 'object_updated',
    payload: { id, updates },
    timestamp: Date.now(),
  });

  renderSceneTree();
  renderCanvas();
  renderProperties();
}

function handleObjectUpdated(payload: { id: string; updates: Partial<BuildObject> }): void {
  const obj = state.objects.get(payload.id);
  if (obj) {
    Object.assign(obj, payload.updates);
    renderSceneTree();
    renderCanvas();

    if (state.selectedObjectId === payload.id) {
      renderProperties();
    }
  }
}

function deleteObject(id: string): void {
  const obj = state.objects.get(id);
  if (!obj) return;

  if (obj.locked && obj.ownerId !== state.userId) {
    notifications.push({
      type: 'system',
      title: 'Cannot Delete',
      message: 'This object is locked',
      priority: 'normal',
    });
    return;
  }

  state.objects.delete(id);

  if (state.selectedObjectId === id) {
    state.selectedObjectId = null;
  }

  // Broadcast to network
  networkClient.send({
    type: 'object_deleted',
    payload: { id },
    timestamp: Date.now(),
  });

  addHistoryEntry('Deleted', obj.type, state.userId, state.userName);

  renderSceneTree();
  renderCanvas();
  renderProperties();
}

function handleObjectDeleted(payload: { id: string }): void {
  state.objects.delete(payload.id);

  if (state.selectedObjectId === payload.id) {
    state.selectedObjectId = null;
  }

  renderSceneTree();
  renderCanvas();
  renderProperties();
}

function duplicateObject(id: string): void {
  const obj = state.objects.get(id);
  if (!obj) return;

  const newObj: BuildObject = {
    ...obj,
    id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    position: {
      x: obj.position.x + 30,
      y: obj.position.y + 30,
      z: obj.position.z,
    },
    ownerId: state.userId,
    ownerName: state.userName,
    locked: false,
    createdAt: Date.now(),
  };

  state.objects.set(newObj.id, newObj);
  state.selectedObjectId = newObj.id;

  networkClient.send({
    type: 'object_created',
    payload: newObj,
    timestamp: Date.now(),
  });

  addHistoryEntry('Duplicated', obj.type, state.userId, state.userName);

  renderSceneTree();
  renderCanvas();
  renderProperties();
}

function toggleLock(id: string): void {
  const obj = state.objects.get(id);
  if (!obj) return;

  if (obj.ownerId !== state.userId) {
    notifications.push({
      type: 'system',
      title: 'Cannot Lock',
      message: 'Only the owner can lock/unlock this object',
      priority: 'normal',
    });
    return;
  }

  obj.locked = !obj.locked;

  networkClient.send({
    type: 'object_updated',
    payload: { id, updates: { locked: obj.locked } },
    timestamp: Date.now(),
  });

  addHistoryEntry(obj.locked ? 'Locked' : 'Unlocked', obj.type, state.userId, state.userName);

  renderSceneTree();
  renderCanvas();
}

// ============================================================================
// Cursor Synchronization
// ============================================================================

function sendCursorUpdate(): void {
  if (!state.connected) return;

  networkClient.send({
    type: 'cursor_update',
    payload: {
      userId: state.userId,
      position: { x: state.mousePos.x, y: state.mousePos.y, z: 0 },
      action: state.isDragging ? state.currentTool : null,
    },
    timestamp: Date.now(),
  });
}

function handleCursorUpdate(payload: {
  userId: string;
  position: Vector3;
  action: string | null;
}): void {
  const collab = state.collaborators.get(payload.userId);
  if (collab) {
    collab.cursor = payload.position;
    collab.currentAction = payload.action;
    collab.lastSeen = Date.now();
    renderRemoteCursor(payload.userId, collab);
    renderCollaborators();
  }
}

function renderRemoteCursor(userId: string, collab: Collaborator): void {
  let cursorEl = document.getElementById(`cursor-${userId}`);

  if (!collab.cursor) {
    if (cursorEl) cursorEl.remove();
    return;
  }

  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.id = `cursor-${userId}`;
    cursorEl.className = 'remote-cursor';
    cursorEl.innerHTML = `
      <svg class="cursor-icon" viewBox="0 0 24 24" fill="${collab.color}">
        <path d="M3 3l18 9-9 3-3 9-6-21z"/>
      </svg>
      <span class="cursor-label" style="background: ${collab.color}">${collab.name}</span>
    `;
    elements.remoteCursors.appendChild(cursorEl);
  }

  cursorEl.style.left = `${collab.cursor.x}px`;
  cursorEl.style.top = `${collab.cursor.y}px`;
}

function removeRemoteCursor(userId: string): void {
  const cursorEl = document.getElementById(`cursor-${userId}`);
  if (cursorEl) cursorEl.remove();
}

// ============================================================================
// Chat System
// ============================================================================

textChat.on('messageReceived', (data) => {
  handleChatMessage(data.message);
});

function sendChatMessage(): void {
  const text = elements.chatInput.value.trim();
  if (!text) return;

  const message: ChatMessage = {
    id: `msg_${Date.now()}`,
    senderId: state.userId,
    senderName: state.userName,
    channel: 'room',
    content: text,
    timestamp: Date.now(),
  };

  // Send to network
  networkClient.send({
    type: 'chat_message',
    payload: message,
    timestamp: Date.now(),
  });

  // Display locally
  addChatMessage(message);
  elements.chatInput.value = '';
}

function handleChatMessage(message: ChatMessage): void {
  addChatMessage(message);
}

function addChatMessage(message: ChatMessage): void {
  const collab = state.collaborators.get(message.senderId);
  const color = message.senderId === state.userId ? state.userColor : (collab?.color || '#888');

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.innerHTML = `
    <div class="avatar" style="background: ${color}">${message.senderName[0].toUpperCase()}</div>
    <div class="content">
      <div class="sender" style="color: ${color}">${message.senderName}</div>
      <div class="text">${escapeHtml(message.content)}</div>
    </div>
  `;

  elements.chatMessages.appendChild(msgEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addSystemMessage(text: string): void {
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message system';
  msgEl.textContent = text;

  elements.chatMessages.appendChild(msgEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ============================================================================
// History
// ============================================================================

function addHistoryEntry(action: string, objectName: string, userId: string, userName: string): void {
  const entry: HistoryEntry = {
    id: `hist_${Date.now()}`,
    action,
    objectName,
    userId,
    userName,
    timestamp: Date.now(),
  };

  state.history.unshift(entry);
  if (state.history.length > 50) {
    state.history.pop();
  }

  // Broadcast to network
  networkClient.send({
    type: 'action_performed',
    payload: entry,
    timestamp: Date.now(),
  });

  renderHistory();
}

function handleActionPerformed(entry: HistoryEntry): void {
  if (entry.userId === state.userId) return;

  state.history.unshift(entry);
  if (state.history.length > 50) {
    state.history.pop();
  }

  renderHistory();
}

// ============================================================================
// Rendering
// ============================================================================

function renderCanvas(): void {
  if (!state.ctx || !state.canvas) return;

  const ctx = state.ctx;
  const canvas = state.canvas;

  // Clear
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw objects
  state.objects.forEach((obj) => {
    drawObject(ctx, obj);
  });
}

function drawObject(ctx: CanvasRenderingContext2D, obj: BuildObject): void {
  const isSelected = obj.id === state.selectedObjectId;
  const size = 50 * obj.scale.x;

  ctx.save();
  ctx.translate(obj.position.x, obj.position.y);
  ctx.rotate((obj.rotation.z * Math.PI) / 180);

  // Draw shape
  ctx.fillStyle = obj.color;
  ctx.strokeStyle = isSelected ? '#667eea' : (obj.locked ? '#ff6b6b' : 'rgba(255,255,255,0.2)');
  ctx.lineWidth = isSelected ? 3 : 1;

  switch (obj.type) {
    case 'cube':
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      break;

    case 'sphere':
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 'cylinder':
      ctx.beginPath();
      ctx.ellipse(0, 0, size / 2, size / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 'plane':
      ctx.fillRect(-size, -size / 8, size * 2, size / 4);
      ctx.strokeRect(-size, -size / 8, size * 2, size / 4);
      break;
  }

  // Draw lock icon
  if (obj.locked) {
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', 0, -size / 2 - 10);
  }

  ctx.restore();
}

function renderCollaborators(): void {
  elements.collaboratorList.innerHTML = '';

  // Add self first
  const selfEl = createCollaboratorElement({
    id: state.userId,
    name: `${state.userName} (You)`,
    color: state.userColor,
    cursor: null,
    currentAction: state.isDragging ? state.currentTool : null,
    lastSeen: Date.now(),
  });
  elements.collaboratorList.appendChild(selfEl);

  // Add others
  state.collaborators.forEach((collab) => {
    const el = createCollaboratorElement(collab);
    elements.collaboratorList.appendChild(el);
  });

  // Update player count
  elements.playerCount.textContent = `(${state.collaborators.size + 1} builders)`;
}

function createCollaboratorElement(collab: Collaborator): HTMLElement {
  const el = document.createElement('div');
  el.className = 'collaborator';
  el.innerHTML = `
    <div class="collaborator-avatar" style="background: ${collab.color}">
      ${collab.name[0].toUpperCase()}
    </div>
    <div class="collaborator-info">
      <div class="collaborator-name">${collab.name}</div>
      <div class="collaborator-action">${collab.currentAction || 'Idle'}</div>
    </div>
    <div class="cursor-indicator" style="background: ${collab.color}"></div>
  `;
  return el;
}

function renderSceneTree(): void {
  elements.sceneTree.innerHTML = '';

  const typeIcons: Record<string, string> = {
    cube: '🧊',
    sphere: '🔵',
    cylinder: '🛢️',
    plane: '▫️',
  };

  state.objects.forEach((obj) => {
    const el = document.createElement('div');
    el.className = `scene-object${obj.id === state.selectedObjectId ? ' selected' : ''}${obj.locked ? ' locked' : ''}`;
    el.innerHTML = `
      <span class="type-icon">${typeIcons[obj.type]}</span>
      <span class="name">${obj.type} ${obj.id.slice(-4)}</span>
      <span class="owner">${obj.ownerName.slice(0, 8)}</span>
    `;

    el.addEventListener('click', () => {
      state.selectedObjectId = obj.id;
      renderSceneTree();
      renderCanvas();
      renderProperties();
    });

    elements.sceneTree.appendChild(el);
  });
}

function renderHistory(): void {
  elements.historyList.innerHTML = '';

  state.history.slice(0, 20).forEach((entry) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <span class="action">${entry.action}</span>
      <span>${entry.objectName}</span>
      <span class="user">by ${entry.userName}</span>
      <span class="time">${formatTime(entry.timestamp)}</span>
    `;
    elements.historyList.appendChild(el);
  });
}

function renderProperties(): void {
  if (!state.selectedObjectId) {
    elements.propertiesContent.innerHTML = '<p style="color: #666; font-size: 0.85rem;">Select an object to edit its properties</p>';
    return;
  }

  const obj = state.objects.get(state.selectedObjectId);
  if (!obj) return;

  elements.propertiesContent.innerHTML = `
    <div class="property-group">
      <label>Position</label>
      <div class="property-row">
        <input type="number" class="property-input" id="prop-pos-x" value="${obj.position.x.toFixed(0)}" />
        <input type="number" class="property-input" id="prop-pos-y" value="${obj.position.y.toFixed(0)}" />
      </div>
    </div>

    <div class="property-group">
      <label>Rotation</label>
      <div class="property-row">
        <input type="number" class="property-input" id="prop-rot-z" value="${obj.rotation.z.toFixed(0)}" />
      </div>
    </div>

    <div class="property-group">
      <label>Scale</label>
      <div class="property-row">
        <input type="number" class="property-input" id="prop-scale" value="${obj.scale.x.toFixed(1)}" step="0.1" min="0.1" max="5" />
      </div>
    </div>

    <div class="property-group">
      <label>Color</label>
      <div class="property-row">
        <input type="color" class="color-picker" id="prop-color" value="${obj.color}" />
      </div>
    </div>

    <div class="property-group">
      <label>Owner</label>
      <div style="font-size: 0.85rem; color: #888; padding: 8px 0;">
        ${obj.ownerName}${obj.ownerId === state.userId ? ' (You)' : ''}
      </div>
    </div>
  `;

  // Add event listeners for property changes
  document.getElementById('prop-pos-x')?.addEventListener('change', (e) => {
    updateObject(obj.id, { position: { ...obj.position, x: parseFloat((e.target as HTMLInputElement).value) } });
  });

  document.getElementById('prop-pos-y')?.addEventListener('change', (e) => {
    updateObject(obj.id, { position: { ...obj.position, y: parseFloat((e.target as HTMLInputElement).value) } });
  });

  document.getElementById('prop-rot-z')?.addEventListener('change', (e) => {
    updateObject(obj.id, { rotation: { ...obj.rotation, z: parseFloat((e.target as HTMLInputElement).value) } });
  });

  document.getElementById('prop-scale')?.addEventListener('change', (e) => {
    const scale = parseFloat((e.target as HTMLInputElement).value);
    updateObject(obj.id, { scale: { x: scale, y: scale, z: scale } });
  });

  document.getElementById('prop-color')?.addEventListener('change', (e) => {
    updateObject(obj.id, { color: (e.target as HTMLInputElement).value });
  });
}

function updateConnectionStatus(status: 'connected' | 'connecting' | 'disconnected'): void {
  elements.statusDot.className = `status-dot ${status}`;
  elements.statusText.textContent = status === 'connected' ? 'Connected' :
                                     status === 'connecting' ? 'Connecting...' : 'Disconnected';
}

// ============================================================================
// Canvas Interaction
// ============================================================================

function initCanvas(): void {
  state.canvas = document.getElementById('build-canvas') as HTMLCanvasElement;
  state.ctx = state.canvas.getContext('2d');

  // Resize to container
  const resizeCanvas = () => {
    const container = state.canvas!.parentElement!;
    state.canvas!.width = container.clientWidth;
    state.canvas!.height = container.clientHeight;
    renderCanvas();
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse events
  state.canvas.addEventListener('mousemove', (e) => {
    const rect = state.canvas!.getBoundingClientRect();
    state.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (state.isDragging && state.selectedObjectId) {
      const obj = state.objects.get(state.selectedObjectId);
      if (obj) {
        handleDrag(obj);
      }
    }

    // Send cursor update (throttled)
    throttledCursorUpdate();
  });

  state.canvas.addEventListener('mousedown', (e) => {
    const rect = state.canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on an object
    const clickedObj = findObjectAt(x, y);

    if (clickedObj) {
      state.selectedObjectId = clickedObj.id;
      state.isDragging = true;
      state.dragStart = { x, y };
    } else {
      state.selectedObjectId = null;
    }

    renderSceneTree();
    renderCanvas();
    renderProperties();
  });

  state.canvas.addEventListener('mouseup', () => {
    if (state.isDragging && state.selectedObjectId) {
      const obj = state.objects.get(state.selectedObjectId);
      if (obj) {
        addHistoryEntry('Moved', obj.type, state.userId, state.userName);
      }
    }
    state.isDragging = false;
  });

  state.canvas.addEventListener('mouseleave', () => {
    state.isDragging = false;
  });
}

function findObjectAt(x: number, y: number): BuildObject | null {
  // Check objects in reverse order (top to bottom)
  const objects = Array.from(state.objects.values()).reverse();

  for (const obj of objects) {
    const size = 50 * obj.scale.x;
    const dx = x - obj.position.x;
    const dy = y - obj.position.y;

    if (obj.type === 'sphere') {
      if (Math.sqrt(dx * dx + dy * dy) < size / 2) {
        return obj;
      }
    } else {
      if (Math.abs(dx) < size / 2 && Math.abs(dy) < size / 2) {
        return obj;
      }
    }
  }

  return null;
}

function handleDrag(obj: BuildObject): void {
  if (obj.locked && obj.ownerId !== state.userId) return;

  switch (state.currentTool) {
    case 'select':
    case 'move':
      updateObject(obj.id, {
        position: { x: state.mousePos.x, y: state.mousePos.y, z: 0 },
      });
      break;

    case 'rotate':
      const angle = Math.atan2(
        state.mousePos.y - obj.position.y,
        state.mousePos.x - obj.position.x
      );
      updateObject(obj.id, {
        rotation: { ...obj.rotation, z: (angle * 180) / Math.PI },
      });
      break;

    case 'scale':
      const dist = Math.sqrt(
        Math.pow(state.mousePos.x - obj.position.x, 2) +
        Math.pow(state.mousePos.y - obj.position.y, 2)
      );
      const scale = Math.max(0.1, Math.min(5, dist / 50));
      updateObject(obj.id, {
        scale: { x: scale, y: scale, z: scale },
      });
      break;
  }
}

// Throttled cursor update
let cursorUpdateTimeout: number | null = null;
function throttledCursorUpdate(): void {
  if (cursorUpdateTimeout) return;

  cursorUpdateTimeout = window.setTimeout(() => {
    sendCursorUpdate();
    cursorUpdateTimeout = null;
  }, 50);
}

// ============================================================================
// Tool Selection
// ============================================================================

function initTools(): void {
  // Tool buttons
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool') as Tool;
      state.currentTool = tool;

      document.querySelectorAll('[data-tool]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Create buttons
  document.querySelectorAll('[data-create]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-create') as BuildObject['type'];
      createObject(type);
    });
  });

  // Action buttons
  document.getElementById('btn-duplicate')?.addEventListener('click', () => {
    if (state.selectedObjectId) {
      duplicateObject(state.selectedObjectId);
    }
  });

  document.getElementById('btn-delete')?.addEventListener('click', () => {
    if (state.selectedObjectId) {
      deleteObject(state.selectedObjectId);
    }
  });

  document.getElementById('btn-lock')?.addEventListener('click', () => {
    if (state.selectedObjectId) {
      toggleLock(state.selectedObjectId);
    }
  });

  // Chat
  elements.sendBtn.addEventListener('click', sendChatMessage);
  elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target === elements.chatInput) return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (state.selectedObjectId) {
          deleteObject(state.selectedObjectId);
        }
        break;
      case 'd':
        if (e.ctrlKey && state.selectedObjectId) {
          e.preventDefault();
          duplicateObject(state.selectedObjectId);
        }
        break;
      case 'l':
        if (e.ctrlKey && state.selectedObjectId) {
          e.preventDefault();
          toggleLock(state.selectedObjectId);
        }
        break;
      case 'Escape':
        state.selectedObjectId = null;
        renderSceneTree();
        renderCanvas();
        renderProperties();
        break;
    }
  });
}

// ============================================================================
// Utilities
// ============================================================================

function getRandomColor(): string {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#330867',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// Initialize
// ============================================================================

function init(): void {
  console.log('Collaborative Building - Initializing...');

  initCanvas();
  initTools();
  renderCollaborators();
  renderSceneTree();
  renderHistory();

  // Connect to server
  updateConnectionStatus('connecting');

  // Simulate connection for demo (in production, use actual WebSocket)
  setTimeout(() => {
    state.connected = true;
    updateConnectionStatus('connected');
    addSystemMessage('Connected to collaboration server');

    // Create some initial objects for demo
    createObject('cube');
    setTimeout(() => createObject('sphere'), 100);
    setTimeout(() => createObject('cylinder'), 200);
  }, 1000);

  console.log('Collaborative Building - Ready!');
}

// Start
init();
