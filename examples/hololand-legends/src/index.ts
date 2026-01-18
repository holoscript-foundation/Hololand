/**
 * Hololand Legends - Main Entry Point
 * 
 * 2D RPG Demo combining Pokemon Heart Gold style with Final Fantasy mechanics
 */

import { Game } from './game/Game';
import { InputManager } from './game/InputManager';
import { AssetLoader } from './game/AssetLoader';

// Game configuration
const CONFIG = {
  // Display
  TILE_SIZE: 16,
  SCALE: 3,
  VIEWPORT_WIDTH: 320,
  VIEWPORT_HEIGHT: 240,
  
  // Game
  TARGET_FPS: 60,
  DEBUG: false,
};

async function main() {
  const loadingFill = document.getElementById('loading-fill') as HTMLElement;
  const loading = document.getElementById('loading') as HTMLElement;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  
  // Set canvas size
  canvas.width = CONFIG.VIEWPORT_WIDTH;
  canvas.height = CONFIG.VIEWPORT_HEIGHT;
  canvas.style.width = `${CONFIG.VIEWPORT_WIDTH * CONFIG.SCALE}px`;
  canvas.style.height = `${CONFIG.VIEWPORT_HEIGHT * CONFIG.SCALE}px`;
  
  // Responsive scaling
  function resizeCanvas() {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;
    const aspectRatio = CONFIG.VIEWPORT_WIDTH / CONFIG.VIEWPORT_HEIGHT;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    canvas.style.width = `${Math.floor(width)}px`;
    canvas.style.height = `${Math.floor(height)}px`;
  }
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  // Load assets
  const assetLoader = new AssetLoader();
  
  assetLoader.onProgress((progress) => {
    loadingFill.style.width = `${progress * 100}%`;
  });
  
  await assetLoader.loadAll();
  
  // Initialize input
  const inputManager = new InputManager();
  
  // Initialize game
  const game = new Game(canvas, CONFIG, assetLoader, inputManager);
  
  // Hide loading screen
  loading.style.opacity = '0';
  setTimeout(() => {
    loading.style.display = 'none';
  }, 500);
  
  // Start game loop
  game.start();
  
  console.log('🎮 Hololand Legends initialized!');
}

main().catch(console.error);
