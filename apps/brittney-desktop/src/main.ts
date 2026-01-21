/**
 * Brittney Desktop - Main Application Entry
 * 
 * Initializes the Brittney AI engine with the bundled GGUF model
 * and sets up the chat interface.
 */

import { invoke } from '@tauri-apps/api/core';
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

/**
 * Initialize the application
 */
async function init() {
  console.log('🚀 Brittney Desktop starting...');
  
  updateStatus('loading', 'Checking system...');
  updateProgress(10);
  
  try {
    // Get system info
    const systemInfo = await invoke<{ os: string; arch: string }>('get_system_info');
    console.log('System:', systemInfo);
    
    updateProgress(20);
    updateStatus('loading', 'Locating model...');
    
    // Check if model exists
    const modelExists = await invoke<boolean>('check_model_exists');
    
    if (!modelExists) {
      updateStatus('error', 'Model not found');
      showModelDownloadPrompt();
      return;
    }
    
    updateProgress(30);
    updateStatus('loading', 'Loading model path...');
    
    // Get model path
    const modelPath = await invoke<string>('get_model_path');
    console.log('Model path:', modelPath);
    
    updateProgress(50);
    updateStatus('loading', 'Initializing Brittney AI...');
    
    // Create engine with local model
    engine = new BrittneyEngine({
      modelPath,
      contextSize: BUNDLED_MODEL.contextSize,
      gpuLayers: -1, // Auto-detect
    });
    
    await engine.initialize();
    
    updateProgress(80);
    updateStatus('loading', 'Setting up interface...');
    
    // Create layout
    layout = new DeviceLayout({
      desktopPosition: 'fullscreen', // Embedded in app
      draggable: false,
    });
    
    // Create chat widget
    chatWidget = new ChatWidget({
      engine,
      position: 'fullscreen',
      theme: 'holographic',
      streaming: true,
      enableCodeHighlight: true,
      welcomeMessage: `👋 Welcome to Brittney AI!

I'm your local HoloScript assistant, running entirely on your device with **${BUNDLED_MODEL.name}** (${BUNDLED_MODEL.size}).

I can help you:
• 🌍 Create new HoloScript worlds
• 🤖 Build AI agents and neural networks
• 🎨 Design 3D scenes and environments
• 📝 Write and debug HoloScript code

What would you like to build today?`,
      onError: (error) => {
        console.error('Chat error:', error);
        updateStatus('error', error.message);
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
    updateStatus('ready', 'Local AI Ready');
    
    // Setup sidebar buttons
    setupSidebarButtons();
    
    console.log('✅ Brittney Desktop initialized');
    
  } catch (error: any) {
    console.error('Initialization failed:', error);
    updateStatus('error', `Error: ${error.message}`);
  }
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
 * Show model download prompt
 */
function showModelDownloadPrompt() {
  const container = document.getElementById('brittney-chat');
  if (!container) return;
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 40px; text-align: center;">
      <div style="font-size: 48px;">📦</div>
      <h2 style="color: #00d4ff;">Model Not Found</h2>
      <p style="color: #8888aa; max-width: 400px;">
        The Brittney AI model (${BUNDLED_MODEL.file}) was not found in the application bundle.
        This usually means the model wasn't included during the build process.
      </p>
      <button 
        id="download-model-btn"
        style="
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        "
      >
        Download Model (${BUNDLED_MODEL.size})
      </button>
      <p style="font-size: 12px; color: #666;">
        Or run: <code style="background: #222; padding: 4px 8px; border-radius: 4px;">pnpm download:model</code>
      </p>
    </div>
  `;
  
  document.getElementById('download-model-btn')?.addEventListener('click', () => {
    // TODO: Implement model download
    alert('Model download not yet implemented. Please run: pnpm download:model');
  });
}

/**
 * Setup sidebar button handlers
 */
function setupSidebarButtons() {
  // New World button
  document.getElementById('new-world-btn')?.addEventListener('click', () => {
    if (chatWidget) {
      chatWidget.setInput('Create a new HoloScript world with ');
    }
  });
  
  // Templates button
  document.getElementById('templates-btn')?.addEventListener('click', () => {
    if (chatWidget) {
      chatWidget.sendMessage('Show me the available HoloScript world templates');
    }
  });
  
  // API Key button
  document.getElementById('api-key-btn')?.addEventListener('click', () => {
    showApiKeyDialog();
  });
}

/**
 * Show API key configuration dialog
 */
function showApiKeyDialog() {
  const providers = Object.entries(CLOUD_PROVIDERS)
    .filter(([_, info]) => info.apiKeyEnv !== null)
    .map(([id, info]) => `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-size: 13px;">
          ${info.name}
        </label>
        <input 
          type="password"
          id="api-key-${id}"
          placeholder="${info.apiKeyEnv}"
          style="
            width: 100%;
            padding: 8px 12px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            color: white;
            font-size: 13px;
          "
        />
      </div>
    `)
    .join('');
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="
      background: #12122a;
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 12px;
      padding: 24px;
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
    ">
      <h2 style="margin-bottom: 8px; color: #00d4ff;">Cloud API Keys</h2>
      <p style="font-size: 13px; color: #8888aa; margin-bottom: 20px;">
        Optionally add your own API keys for enhanced cloud capabilities.
        Your keys are stored locally and never sent to our servers.
      </p>
      
      ${providers}
      
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button 
          id="save-keys-btn"
          style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
          "
        >
          Save Keys
        </button>
        <button 
          id="cancel-keys-btn"
          style="
            padding: 12px 20px;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            color: white;
            cursor: pointer;
          "
        >
          Cancel
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle save
  document.getElementById('save-keys-btn')?.addEventListener('click', () => {
    const openaiKey = (document.getElementById('api-key-openai') as HTMLInputElement)?.value;
    
    if (openaiKey && engine) {
      engine.enableCloud('openai', openaiKey);
      updateStatus('ready', 'Cloud Enabled');
    }
    
    modal.remove();
  });
  
  // Handle cancel
  document.getElementById('cancel-keys-btn')?.addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Start the app
init();
