/**
 * Brittney Mobile - Main Application Entry
 * 
 * Mobile app for iOS and Android using Capacitor.
 * Uses WebAssembly-based GGUF inference for on-device AI.
 */

import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';

import { 
  BrittneyEngine, 
  ChatWidget, 
  DeviceLayout,
  BUNDLED_MODEL,
  CLOUD_PROVIDERS,
} from '@hololand/brittney-toolkit';

// State
let engine: BrittneyEngine | null = null;
let chatWidget: ChatWidget | null = null;
let layout: DeviceLayout | null = null;
let isKeyboardVisible = false;

/**
 * Initialize the application
 */
async function init() {
  console.log('📱 Brittney Mobile starting...');
  
  updateStatus('loading', 'Initializing...');
  updateProgress(10);
  
  try {
    // Setup platform listeners
    await setupPlatformListeners();
    
    updateProgress(20);
    updateStatus('loading', 'Checking model...');
    
    // Check for saved API key
    const savedProvider = await getSavedApiKey();
    
    updateProgress(40);
    updateStatus('loading', 'Loading Brittney AI...');
    
    // Create engine
    // On mobile, we use WASM-based inference or cloud
    engine = new BrittneyEngine({
      // Mobile uses WebAssembly GGUF or cloud fallback
      useWasm: true,
      wasmModelUrl: '/models/brittney-q4.gguf', // Quantized for mobile
    });
    
    // If user has saved API key, enable cloud
    if (savedProvider) {
      engine.enableCloud(savedProvider.provider as any, savedProvider.apiKey);
    }
    
    await engine.initialize();
    
    updateProgress(70);
    updateStatus('loading', 'Setting up interface...');
    
    // Create layout (mobile-optimized)
    layout = new DeviceLayout({
      device: 'mobile',
      mobilePosition: 'fullscreen',
    });
    
    // Create chat widget
    chatWidget = new ChatWidget({
      engine,
      position: 'fullscreen',
      theme: 'dark',
      streaming: true,
      enableCodeHighlight: true,
      enableVoice: true,
      welcomeMessage: `👋 Hey! I'm Brittney, your HoloScript assistant.

I can help you build worlds, create AI agents, and write HoloScript code.

Tap a quick action above or ask me anything!`,
      onMessageSent: async () => {
        // Haptic feedback on send
        await Haptics.impact({ style: ImpactStyle.Light });
      },
      onError: (error) => {
        console.error('Chat error:', error);
        updateStatus('error', 'Error');
      },
    });
    
    // Remove loading screen and mount widget
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.remove();
    }
    
    const chatContainer = document.getElementById('brittney-chat');
    if (chatContainer) {
      chatWidget.mount(chatContainer);
    }
    
    updateProgress(100);
    updateStatus('ready', savedProvider ? 'Cloud' : 'Local');
    
    // Setup UI handlers
    setupUIHandlers();
    
    console.log('✅ Brittney Mobile initialized');
    
  } catch (error: any) {
    console.error('Initialization failed:', error);
    updateStatus('error', 'Error');
    showErrorState(error.message);
  }
}

/**
 * Setup platform-specific listeners
 */
async function setupPlatformListeners() {
  // Handle app state changes
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed:', isActive ? 'active' : 'background');
  });
  
  // Handle back button (Android)
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    }
  });
  
  // Handle keyboard
  Keyboard.addListener('keyboardWillShow', (info) => {
    isKeyboardVisible = true;
    document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    document.body.classList.add('keyboard-visible');
  });
  
  Keyboard.addListener('keyboardWillHide', () => {
    isKeyboardVisible = false;
    document.body.style.setProperty('--keyboard-height', '0px');
    document.body.classList.remove('keyboard-visible');
  });
}

/**
 * Setup UI event handlers
 */
function setupUIHandlers() {
  // Quick actions
  const quickActions = document.getElementById('quick-actions');
  if (quickActions) {
    quickActions.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('quick-action')) {
        await Haptics.impact({ style: ImpactStyle.Medium });
        handleQuickAction(target.textContent || '');
      }
    });
  }
  
  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    showSettingsModal();
  });
}

/**
 * Handle quick action tap
 */
function handleQuickAction(action: string) {
  if (!chatWidget) return;
  
  if (action.includes('New World')) {
    chatWidget.setInput('Create a new HoloScript world with ');
  } else if (action.includes('Create Agent')) {
    chatWidget.setInput('Create an AI agent that ');
  } else if (action.includes('Templates')) {
    chatWidget.sendMessage('Show me the available HoloScript templates');
  } else if (action.includes('Help')) {
    chatWidget.sendMessage('What can you help me with?');
  }
}

/**
 * Show settings modal
 */
async function showSettingsModal() {
  const savedProvider = await getSavedApiKey();
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'settings-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Settings</h2>
      
      <div class="setting-item">
        <span class="setting-label">AI Mode</span>
        <span class="setting-value">${savedProvider ? 'Cloud (' + savedProvider.provider + ')' : 'Local'}</span>
      </div>
      
      <div class="setting-item" id="api-key-setting">
        <span class="setting-label">API Key</span>
        <span class="setting-value">${savedProvider ? '••••••••' : 'Not set'}</span>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">Model</span>
        <span class="setting-value">${BUNDLED_MODEL.name}</span>
      </div>
      
      <div class="setting-item" id="clear-history-setting">
        <span class="setting-label">Clear Chat History</span>
        <span class="setting-value">→</span>
      </div>
      
      <div class="setting-item">
        <span class="setting-label">Version</span>
        <span class="setting-value">1.0.0-alpha.1</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle backdrop tap
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Handle API key setting
  document.getElementById('api-key-setting')?.addEventListener('click', async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    modal.remove();
    showApiKeyModal();
  });
  
  // Handle clear history
  document.getElementById('clear-history-setting')?.addEventListener('click', async () => {
    await Haptics.impact({ style: ImpactStyle.Medium });
    if (chatWidget) {
      chatWidget.clearHistory();
    }
    modal.remove();
  });
}

/**
 * Show API key input modal
 */
function showApiKeyModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'api-key-modal';
  
  const providers = Object.entries(CLOUD_PROVIDERS)
    .filter(([_, info]) => info.apiKeyEnv !== null)
    .map(([id, info]) => `<option value="${id}">${info.name}</option>`)
    .join('');
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Add API Key</h2>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
        Optionally use cloud AI for enhanced capabilities. Your key is stored locally.
      </p>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 14px;">Provider</label>
        <select id="provider-select" style="
          width: 100%;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: white;
          font-size: 15px;
        ">
          ${providers}
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 6px; font-size: 14px;">API Key</label>
        <input 
          type="password"
          id="api-key-input"
          placeholder="sk-..."
          style="
            width: 100%;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: white;
            font-size: 15px;
          "
        />
      </div>
      
      <button 
        id="save-api-key-btn"
        style="
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 15px;
          font-weight: 500;
        "
      >
        Save & Enable Cloud
      </button>
      
      <button 
        id="use-local-btn"
        style="
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 15px;
          margin-top: 10px;
        "
      >
        Use Local Only
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle backdrop tap
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Handle save
  document.getElementById('save-api-key-btn')?.addEventListener('click', async () => {
    const provider = (document.getElementById('provider-select') as HTMLSelectElement)?.value;
    const apiKey = (document.getElementById('api-key-input') as HTMLInputElement)?.value;
    
    if (provider && apiKey && engine) {
      await saveApiKey(provider, apiKey);
      engine.enableCloud(provider as any, apiKey);
      updateStatus('ready', 'Cloud');
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
    
    modal.remove();
  });
  
  // Handle use local
  document.getElementById('use-local-btn')?.addEventListener('click', async () => {
    await clearApiKey();
    if (engine) {
      engine.useLocal();
    }
    updateStatus('ready', 'Local');
    modal.remove();
  });
}

/**
 * Save API key to preferences
 */
async function saveApiKey(provider: string, apiKey: string) {
  await Preferences.set({
    key: 'brittney_api_provider',
    value: provider,
  });
  await Preferences.set({
    key: 'brittney_api_key',
    value: apiKey,
  });
}

/**
 * Get saved API key
 */
async function getSavedApiKey(): Promise<{ provider: string; apiKey: string } | null> {
  const { value: provider } = await Preferences.get({ key: 'brittney_api_provider' });
  const { value: apiKey } = await Preferences.get({ key: 'brittney_api_key' });
  
  if (provider && apiKey) {
    return { provider, apiKey };
  }
  return null;
}

/**
 * Clear saved API key
 */
async function clearApiKey() {
  await Preferences.remove({ key: 'brittney_api_provider' });
  await Preferences.remove({ key: 'brittney_api_key' });
}

/**
 * Update status indicator
 */
function updateStatus(state: 'loading' | 'ready' | 'error', text: string) {
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  if (dot) {
    dot.className = 'status-dot';
    if (state === 'loading') dot.classList.add('loading');
    if (state === 'error') dot.classList.add('error');
  }
  
  if (statusText) {
    statusText.textContent = text;
  }
}

/**
 * Update progress bar
 */
function updateProgress(percent: number) {
  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width = `${percent}%`;
  }
}

/**
 * Show error state
 */
function showErrorState(message: string) {
  const container = document.getElementById('brittney-chat');
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-screen">
      <div style="font-size: 40px;">⚠️</div>
      <p class="loading-text" style="color: #ff6666;">
        ${message}
      </p>
      <button 
        onclick="location.reload()"
        style="
          padding: 12px 24px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          margin-top: 16px;
        "
      >
        Retry
      </button>
    </div>
  `;
}

// Start the app
init();
