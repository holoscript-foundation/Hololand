import { HololandRenderer } from '@hololand/renderer';
import { HololandWorld } from '@hololand/world';
import { UICanvas, InteractionBridge, AdaptiveLayout, StatusHud, Button } from '@hololand/ui';
import { VoiceVisualizer } from '@hololand/ai-bridge';

async function init() {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const uiOverlay = document.getElementById('uiCanvas') as HTMLCanvasElement;
  
  // 1. Initialize World and Renderer
  const world = new HololandWorld();
  const renderer = new HololandRenderer(canvas, world, {
    quality: 'auto',
    renderMode: 'hybrid',
    enableVR: true
  });
  
  // 2. Initialize UI System
  const ui = new UICanvas(uiOverlay, { transparent: true });
  const bridge = new InteractionBridge(uiOverlay);
  const layout = new AdaptiveLayout(renderer.getQualityManager().getDeviceType());
  
  // 3. Create Status HUD
  const statusHud = new StatusHud({
    position: { x: 20, y: 20 },
    size: { width: 200, height: 100 }
  });
  ui.add(statusHud);
  
  // 4. Create Mode Switcher Button (Kid/Pro)
  const modeBtn = new Button({
    position: { x: 20, y: 140 },
    size: { width: 150, height: 40 },
    text: 'Switch to Pro Mode'
  });
  
  modeBtn.on('click', () => {
    const newMode = layout.userMode === 'simple' ? 'expert' : 'simple';
    layout.setUserMode(newMode);
    modeBtn.text = newMode === 'simple' ? 'Switch to Pro Mode' : 'Switch to Kid Mode';
    statusHud.setAIStatus(`Mode: ${newMode}`, true);
  });
  
  ui.add(modeBtn);
  
  // 5. Initialize Voice Visualizer
  const voiceCanvas = document.createElement('canvas');
  voiceCanvas.width = 150;
  voiceCanvas.height = 30;
  const voiceCtx = voiceCanvas.getContext('2d')!;
  const visualizer = new VoiceVisualizer(voiceCtx, { color: '#00E676' });
  
  // Map Bridge to UI
  bridge.onDown((e) => {
    // Forward to UI
    ui.handlePointerDown(e.position);
    console.log(`Universal Input: ${e.pointerType} ${e.type} at`, e.position);
  });
  
  bridge.onUp((e) => ui.handlePointerUp(e.position));
  bridge.onMove((e) => ui.handlePointerMove(e.position));

  // 6. Connect Renderer to UI
  renderer.setUICanvas(ui);
  
  // Handle Scale Changes for HUD
  world.on('scale:change', (data) => {
    statusHud.setScale(data.multiplier, data.magnitude);
  });

  // Start Loops
  renderer.start();
  ui.start();
  
  console.log('Universal Dashboard Running');
}

window.addEventListener('DOMContentLoaded', init);
 Vinc
