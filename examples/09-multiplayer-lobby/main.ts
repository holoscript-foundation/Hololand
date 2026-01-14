/**
 * Hololand Multiplayer Lobby Example
 *
 * Demonstrates Phase 3 networking features:
 * - Room creation and joining
 * - Player presence and synchronization
 * - Real-time text chat
 * - Voice chat controls
 */

import {
  NetworkClient,
  RoomManager,
  TextChat,
  VoiceChat,
  StateSync,
  InterestManager,
} from '@hololand/network';
import type { RoomInfo, PlayerInfo, ChatMessage } from '@hololand/network';
import {
  UICanvas,
  Button,
  Panel,
  Text,
  TextInput,
  Toggle,
  List,
} from '@hololand/ui';

// ============================================================================
// Configuration
// ============================================================================

const SERVER_URL = 'wss://localhost:8080'; // Demo server URL
const colors = {
  panelBg: 'rgba(26, 26, 46, 0.95)',
  surface: 'rgba(37, 37, 66, 0.9)',
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  text: '#e0e0e0',
  textSecondary: '#9ca3af',
};

// ============================================================================
// State
// ============================================================================

let networkClient: NetworkClient | null = null;
let roomManager: RoomManager | null = null;
let textChat: TextChat | null = null;
let voiceChat: VoiceChat | null = null;
let stateSync: StateSync | null = null;
let interestManager: InterestManager | null = null;

let currentRoom: RoomInfo | null = null;
let players: PlayerInfo[] = [];
let roomList: RoomInfo[] = [];
let chatMessages: ChatMessage[] = [];
let displayName = 'Player_' + Math.random().toString(36).substr(2, 4);
let isConnected = false;
let isInVoice = false;
let isMuted = false;

// ============================================================================
// Setup UI Canvas (Sidebar)
// ============================================================================

const uiCanvas = document.getElementById('ui-canvas') as HTMLCanvasElement;
uiCanvas.width = 320;
uiCanvas.height = window.innerHeight;

const ui = new UICanvas(uiCanvas, {
  width: 320,
  height: window.innerHeight,
  transparent: false,
});

// ============================================================================
// Connection Panel
// ============================================================================

const connectionPanel = new Panel({
  position: { x: 10, y: 10 },
  size: { width: 300, height: 180 },
  backgroundColor: colors.panelBg,
  borderRadius: 12,
});

const connectionTitle = new Text({
  position: { x: 15, y: 15 },
  content: 'Connection',
  fontSize: 18,
  color: colors.text,
  fontWeight: '600',
});
connectionPanel.addChild(connectionTitle);

const statusText = new Text({
  position: { x: 15, y: 45 },
  content: 'Status: Disconnected',
  fontSize: 12,
  color: colors.error,
});
connectionPanel.addChild(statusText);

const nameLabel = new Text({
  position: { x: 15, y: 75 },
  content: 'Display Name:',
  fontSize: 12,
  color: colors.textSecondary,
});
connectionPanel.addChild(nameLabel);

const nameInput = new TextInput({
  position: { x: 15, y: 95 },
  size: { width: 200, height: 32 },
  placeholder: 'Enter name...',
  value: displayName,
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 6,
  onChange: (value) => {
    displayName = value;
  },
});
connectionPanel.addChild(nameInput);

const connectBtn = new Button({
  position: { x: 15, y: 140 },
  size: { width: 130, height: 32 },
  text: 'Connect',
  backgroundColor: colors.primary,
  textColor: '#ffffff',
  borderRadius: 6,
  onClick: () => connectToServer(),
});
connectionPanel.addChild(connectBtn);

const disconnectBtn = new Button({
  position: { x: 155, y: 140 },
  size: { width: 130, height: 32 },
  text: 'Disconnect',
  backgroundColor: colors.error,
  textColor: '#ffffff',
  borderRadius: 6,
  onClick: () => disconnect(),
});
connectionPanel.addChild(disconnectBtn);

ui.add(connectionPanel);

// ============================================================================
// Room List Panel
// ============================================================================

const roomListPanel = new Panel({
  position: { x: 10, y: 200 },
  size: { width: 300, height: 250 },
  backgroundColor: colors.panelBg,
  borderRadius: 12,
});

const roomListTitle = new Text({
  position: { x: 15, y: 15 },
  content: 'Available Rooms',
  fontSize: 18,
  color: colors.text,
  fontWeight: '600',
});
roomListPanel.addChild(roomListTitle);

const refreshBtn = new Button({
  position: { x: 200, y: 10 },
  size: { width: 85, height: 28 },
  text: 'Refresh',
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 6,
  fontSize: 12,
  onClick: () => refreshRoomList(),
});
roomListPanel.addChild(refreshBtn);

const roomListContainer = new List({
  position: { x: 15, y: 50 },
  size: { width: 270, height: 140 },
  items: [],
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 8,
  onItemClick: (index) => joinRoom(roomList[index]?.id),
});
roomListPanel.addChild(roomListContainer);

const createRoomBtn = new Button({
  position: { x: 15, y: 205 },
  size: { width: 270, height: 32 },
  text: 'Create New Room',
  backgroundColor: colors.success,
  textColor: '#ffffff',
  borderRadius: 6,
  onClick: () => createRoom(),
});
roomListPanel.addChild(createRoomBtn);

ui.add(roomListPanel);

// ============================================================================
// Current Room Panel
// ============================================================================

const currentRoomPanel = new Panel({
  position: { x: 10, y: 460 },
  size: { width: 300, height: 200 },
  backgroundColor: colors.panelBg,
  borderRadius: 12,
});

const currentRoomTitle = new Text({
  position: { x: 15, y: 15 },
  content: 'Current Room',
  fontSize: 18,
  color: colors.text,
  fontWeight: '600',
});
currentRoomPanel.addChild(currentRoomTitle);

const roomNameText = new Text({
  position: { x: 15, y: 45 },
  content: 'Not in a room',
  fontSize: 14,
  color: colors.textSecondary,
});
currentRoomPanel.addChild(roomNameText);

const playerCountText = new Text({
  position: { x: 15, y: 70 },
  content: 'Players: 0/0',
  fontSize: 12,
  color: colors.textSecondary,
});
currentRoomPanel.addChild(playerCountText);

const playerListContainer = new List({
  position: { x: 15, y: 95 },
  size: { width: 270, height: 60 },
  items: [],
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 8,
});
currentRoomPanel.addChild(playerListContainer);

const leaveRoomBtn = new Button({
  position: { x: 15, y: 165 },
  size: { width: 130, height: 28 },
  text: 'Leave Room',
  backgroundColor: colors.error,
  textColor: '#ffffff',
  borderRadius: 6,
  fontSize: 12,
  onClick: () => leaveRoom(),
});
currentRoomPanel.addChild(leaveRoomBtn);

ui.add(currentRoomPanel);

// ============================================================================
// Voice Chat Panel
// ============================================================================

const voicePanel = new Panel({
  position: { x: 10, y: 670 },
  size: { width: 300, height: 100 },
  backgroundColor: colors.panelBg,
  borderRadius: 12,
});

const voiceTitle = new Text({
  position: { x: 15, y: 15 },
  content: 'Voice Chat',
  fontSize: 18,
  color: colors.text,
  fontWeight: '600',
});
voicePanel.addChild(voiceTitle);

const voiceToggle = new Toggle({
  position: { x: 15, y: 50 },
  checked: false,
  label: 'Join Voice',
  trackColorOn: colors.success,
  labelColor: colors.text,
  onChange: (checked) => toggleVoice(checked),
});
voicePanel.addChild(voiceToggle);

const muteToggle = new Toggle({
  position: { x: 150, y: 50 },
  checked: false,
  label: 'Mute',
  trackColorOn: colors.warning,
  labelColor: colors.text,
  onChange: (checked) => toggleMute(checked),
});
voicePanel.addChild(muteToggle);

ui.add(voicePanel);

// ============================================================================
// Chat Canvas
// ============================================================================

const chatCanvas = document.getElementById('chat-canvas') as HTMLCanvasElement;
chatCanvas.width = window.innerWidth - 320;
chatCanvas.height = 200;

const chatUI = new UICanvas(chatCanvas, {
  width: window.innerWidth - 320,
  height: 200,
  transparent: false,
});

const chatPanel = new Panel({
  position: { x: 10, y: 10 },
  size: { width: chatCanvas.width - 20, height: 180 },
  backgroundColor: colors.panelBg,
  borderRadius: 12,
});

const chatTitle = new Text({
  position: { x: 15, y: 10 },
  content: 'Chat',
  fontSize: 14,
  color: colors.text,
  fontWeight: '600',
});
chatPanel.addChild(chatTitle);

const chatMessagesContainer = new List({
  position: { x: 15, y: 35 },
  size: { width: chatCanvas.width - 200, height: 100 },
  items: [],
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 8,
  itemHeight: 24,
});
chatPanel.addChild(chatMessagesContainer);

const chatInput = new TextInput({
  position: { x: 15, y: 145 },
  size: { width: chatCanvas.width - 200, height: 28 },
  placeholder: 'Type a message...',
  backgroundColor: colors.surface,
  textColor: colors.text,
  borderRadius: 6,
  onSubmit: (value) => {
    sendChatMessage(value);
    chatInput.value = '';
  },
});
chatPanel.addChild(chatInput);

const sendBtn = new Button({
  position: { x: chatCanvas.width - 170, y: 145 },
  size: { width: 80, height: 28 },
  text: 'Send',
  backgroundColor: colors.primary,
  textColor: '#ffffff',
  borderRadius: 6,
  fontSize: 12,
  onClick: () => {
    sendChatMessage(chatInput.value);
    chatInput.value = '';
  },
});
chatPanel.addChild(sendBtn);

chatUI.add(chatPanel);

// ============================================================================
// Room Canvas (Player positions)
// ============================================================================

const roomCanvas = document.getElementById('room-canvas') as HTMLCanvasElement;
roomCanvas.width = window.innerWidth - 320;
roomCanvas.height = window.innerHeight - 200;
const roomCtx = roomCanvas.getContext('2d')!;

function renderRoom() {
  // Clear canvas
  roomCtx.fillStyle = '#16213e';
  roomCtx.fillRect(0, 0, roomCanvas.width, roomCanvas.height);

  // Draw grid
  roomCtx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
  roomCtx.lineWidth = 1;
  const gridSize = 50;

  for (let x = 0; x < roomCanvas.width; x += gridSize) {
    roomCtx.beginPath();
    roomCtx.moveTo(x, 0);
    roomCtx.lineTo(x, roomCanvas.height);
    roomCtx.stroke();
  }

  for (let y = 0; y < roomCanvas.height; y += gridSize) {
    roomCtx.beginPath();
    roomCtx.moveTo(0, y);
    roomCtx.lineTo(roomCanvas.width, y);
    roomCtx.stroke();
  }

  if (!currentRoom) {
    // Show "Not in a room" message
    roomCtx.fillStyle = colors.textSecondary;
    roomCtx.font = '24px system-ui';
    roomCtx.textAlign = 'center';
    roomCtx.fillText(
      'Join or create a room to see players',
      roomCanvas.width / 2,
      roomCanvas.height / 2
    );
    return;
  }

  // Draw players
  players.forEach((player, index) => {
    const x = 100 + (index % 5) * 120;
    const y = 100 + Math.floor(index / 5) * 120;

    // Avatar circle
    const isLocal = player.id === networkClient?.getClientId();
    roomCtx.fillStyle = isLocal ? colors.primary : colors.success;
    roomCtx.beginPath();
    roomCtx.arc(x, y, 30, 0, Math.PI * 2);
    roomCtx.fill();

    // Player name
    roomCtx.fillStyle = colors.text;
    roomCtx.font = '14px system-ui';
    roomCtx.textAlign = 'center';
    roomCtx.fillText(player.displayName, x, y + 50);

    // Role badge
    if (player.role === 'host') {
      roomCtx.fillStyle = colors.warning;
      roomCtx.font = '10px system-ui';
      roomCtx.fillText('HOST', x, y + 65);
    }
  });

  // Room info
  roomCtx.fillStyle = colors.text;
  roomCtx.font = '16px system-ui';
  roomCtx.textAlign = 'left';
  roomCtx.fillText(`Room: ${currentRoom.name}`, 20, 30);
  roomCtx.fillText(`Players: ${currentRoom.playerCount}/${currentRoom.maxPlayers}`, 20, 50);
}

// ============================================================================
// Network Functions
// ============================================================================

async function connectToServer() {
  if (isConnected) return;

  statusText.content = 'Status: Connecting...';
  statusText.color = colors.warning;

  try {
    networkClient = new NetworkClient({ url: SERVER_URL });
    roomManager = new RoomManager(networkClient);
    stateSync = new StateSync();
    interestManager = new InterestManager({ viewDistance: 100 });

    // Set up event handlers
    networkClient.on('connected', ({ clientId }) => {
      isConnected = true;
      statusText.content = `Status: Connected (${clientId.slice(0, 8)}...)`;
      statusText.color = colors.success;
      console.log('Connected to server');

      // Initialize chat
      textChat = new TextChat(networkClient!);
      textChat.on('message', ({ message }) => {
        addChatMessage(message);
      });

      // Initialize voice chat
      voiceChat = new VoiceChat(networkClient!);

      refreshRoomList();
    });

    networkClient.on('disconnected', ({ reason }) => {
      isConnected = false;
      currentRoom = null;
      players = [];
      statusText.content = `Status: Disconnected (${reason})`;
      statusText.color = colors.error;
      console.log('Disconnected:', reason);
    });

    networkClient.on('error', ({ message }) => {
      console.error('Network error:', message);
    });

    networkClient.on('latency', ({ ms }) => {
      console.log('Latency:', ms, 'ms');
    });

    await networkClient.connect();
  } catch (error) {
    statusText.content = 'Status: Connection failed';
    statusText.color = colors.error;
    console.error('Failed to connect:', error);

    // Demo mode: simulate connection for UI testing
    simulateDemoMode();
  }
}

function disconnect() {
  if (!isConnected && !currentRoom) return;

  if (voiceChat?.isInVoice()) {
    voiceChat.leaveVoice();
  }

  textChat?.destroy();
  voiceChat?.destroy();
  networkClient?.disconnect();

  isConnected = false;
  currentRoom = null;
  players = [];
  roomList = [];

  updateUI();
}

async function refreshRoomList() {
  if (!roomManager) {
    // Demo mode
    roomList = [
      {
        id: 'demo_1',
        name: 'Demo Room 1',
        playerCount: 3,
        maxPlayers: 10,
        state: 'open',
        isPrivate: false,
        hostId: 'host_1',
        createdAt: Date.now(),
      },
      {
        id: 'demo_2',
        name: 'VR Hangout',
        playerCount: 7,
        maxPlayers: 20,
        state: 'open',
        isPrivate: false,
        hostId: 'host_2',
        createdAt: Date.now(),
      },
    ];
    updateUI();
    return;
  }

  try {
    roomList = await roomManager.getRoomList();
    updateUI();
  } catch (error) {
    console.error('Failed to get room list:', error);
  }
}

async function createRoom() {
  if (!roomManager) {
    // Demo mode
    currentRoom = {
      id: 'demo_new',
      name: `${displayName}'s Room`,
      playerCount: 1,
      maxPlayers: 10,
      state: 'open',
      isPrivate: false,
      hostId: 'local',
      createdAt: Date.now(),
    };
    players = [
      {
        id: 'local',
        displayName,
        role: 'host',
        joinedAt: Date.now(),
      },
    ];
    updateUI();
    addChatMessage({
      id: 'sys_1',
      type: 'system',
      senderId: 'system',
      senderName: 'System',
      content: `Room "${currentRoom.name}" created`,
      timestamp: Date.now(),
    });
    return;
  }

  try {
    const room = await roomManager.createRoom({
      name: `${displayName}'s Room`,
      maxPlayers: 10,
    });

    currentRoom = room.getInfo();
    players = room.getPlayers();
    textChat?.joinRoom(currentRoom.id, displayName);

    // Set up room events
    room.on('playerJoined', ({ player }) => {
      players = room.getPlayers();
      updateUI();
      addChatMessage({
        id: `sys_${Date.now()}`,
        type: 'system',
        senderId: 'system',
        senderName: 'System',
        content: `${player.displayName} joined the room`,
        timestamp: Date.now(),
      });
    });

    room.on('playerLeft', ({ playerId }) => {
      const player = players.find((p) => p.id === playerId);
      players = room.getPlayers();
      updateUI();
      if (player) {
        addChatMessage({
          id: `sys_${Date.now()}`,
          type: 'system',
          senderId: 'system',
          senderName: 'System',
          content: `${player.displayName} left the room`,
          timestamp: Date.now(),
        });
      }
    });

    updateUI();
  } catch (error) {
    console.error('Failed to create room:', error);
  }
}

async function joinRoom(roomId: string) {
  if (!roomId) return;

  if (!roomManager) {
    // Demo mode
    const roomInfo = roomList.find((r) => r.id === roomId);
    if (roomInfo) {
      currentRoom = { ...roomInfo, playerCount: roomInfo.playerCount + 1 };
      players = [
        { id: 'local', displayName, role: 'player', joinedAt: Date.now() },
        { id: 'other_1', displayName: 'Alice', role: 'host', joinedAt: Date.now() - 1000 },
        { id: 'other_2', displayName: 'Bob', role: 'player', joinedAt: Date.now() - 500 },
      ];
      updateUI();
      addChatMessage({
        id: 'sys_join',
        type: 'system',
        senderId: 'system',
        senderName: 'System',
        content: `Joined "${currentRoom.name}"`,
        timestamp: Date.now(),
      });
    }
    return;
  }

  try {
    const room = await roomManager.joinRoom(roomId);
    currentRoom = room.getInfo();
    players = room.getPlayers();
    textChat?.joinRoom(currentRoom.id, displayName);
    updateUI();
  } catch (error) {
    console.error('Failed to join room:', error);
  }
}

function leaveRoom() {
  if (!currentRoom) return;

  if (roomManager) {
    roomManager.leaveCurrentRoom();
  }

  textChat?.leaveRoom();
  if (voiceChat?.isInVoice()) {
    voiceChat.leaveVoice();
  }

  currentRoom = null;
  players = [];
  chatMessages = [];
  updateUI();
}

function sendChatMessage(content: string) {
  if (!content.trim()) return;

  if (!textChat) {
    // Demo mode
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'text',
      senderId: 'local',
      senderName: displayName,
      content: content.trim(),
      timestamp: Date.now(),
    };
    addChatMessage(message);
    return;
  }

  textChat.send(content);
}

function addChatMessage(message: ChatMessage) {
  chatMessages.push(message);
  if (chatMessages.length > 50) {
    chatMessages.shift();
  }
  updateChatUI();
}

async function toggleVoice(enabled: boolean) {
  if (!voiceChat || !currentRoom) {
    isInVoice = enabled; // Demo mode
    return;
  }

  if (enabled) {
    try {
      await voiceChat.joinVoice(currentRoom.id);
      isInVoice = true;
    } catch (error) {
      console.error('Failed to join voice:', error);
      isInVoice = false;
    }
  } else {
    voiceChat.leaveVoice();
    isInVoice = false;
  }
}

function toggleMute(muted: boolean) {
  isMuted = muted;
  if (voiceChat) {
    if (muted) {
      voiceChat.mute();
    } else {
      voiceChat.unmute();
    }
  }
}

// ============================================================================
// Demo Mode (when server unavailable)
// ============================================================================

function simulateDemoMode() {
  console.log('Running in demo mode (no server)');
  isConnected = true;
  statusText.content = 'Status: Demo Mode';
  statusText.color = colors.warning;

  roomList = [
    {
      id: 'demo_1',
      name: 'Demo Room 1',
      playerCount: 3,
      maxPlayers: 10,
      state: 'open',
      isPrivate: false,
      hostId: 'host_1',
      createdAt: Date.now(),
    },
    {
      id: 'demo_2',
      name: 'VR Hangout',
      playerCount: 7,
      maxPlayers: 20,
      state: 'open',
      isPrivate: false,
      hostId: 'host_2',
      createdAt: Date.now(),
    },
  ];

  updateUI();
}

// ============================================================================
// UI Updates
// ============================================================================

function updateUI() {
  // Update room list
  roomListContainer.items = roomList.map(
    (room) => `${room.name} (${room.playerCount}/${room.maxPlayers})`
  );

  // Update current room info
  if (currentRoom) {
    roomNameText.content = currentRoom.name;
    playerCountText.content = `Players: ${currentRoom.playerCount}/${currentRoom.maxPlayers}`;
    playerListContainer.items = players.map(
      (p) => `${p.displayName}${p.role === 'host' ? ' (Host)' : ''}`
    );
  } else {
    roomNameText.content = 'Not in a room';
    playerCountText.content = 'Players: 0/0';
    playerListContainer.items = [];
  }

  renderRoom();
}

function updateChatUI() {
  chatMessagesContainer.items = chatMessages.slice(-10).map((msg) => {
    if (msg.type === 'system') {
      return `[System] ${msg.content}`;
    }
    return `${msg.senderName}: ${msg.content}`;
  });
}

// ============================================================================
// Start Application
// ============================================================================

ui.start();
chatUI.start();

// Render loop for room canvas
function animate() {
  renderRoom();
  requestAnimationFrame(animate);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  uiCanvas.height = window.innerHeight;
  ui.resize(320, window.innerHeight);

  roomCanvas.width = window.innerWidth - 320;
  roomCanvas.height = window.innerHeight - 200;

  chatCanvas.width = window.innerWidth - 320;
  chatUI.resize(window.innerWidth - 320, 200);
});

// Initial UI update
updateUI();

console.log('Hololand Multiplayer Lobby started!');
console.log('');
console.log('This example demonstrates:');
console.log('- Room creation and joining');
console.log('- Player presence visualization');
console.log('- Real-time text chat');
console.log('- Voice chat controls');
console.log('');
console.log('Note: Connect to a server or use demo mode');
