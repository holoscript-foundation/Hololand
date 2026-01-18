/**
 * Input Manager
 * 
 * Handles keyboard, gamepad, and touch input across all platforms
 */

export type InputAction = 
  | 'up' | 'down' | 'left' | 'right'
  | 'confirm' | 'cancel' | 'menu'
  | 'action1' | 'action2';

interface InputState {
  pressed: Set<InputAction>;
  held: Set<InputAction>;
  released: Set<InputAction>;
}

export class InputManager {
  private state: InputState = {
    pressed: new Set(),
    held: new Set(),
    released: new Set(),
  };
  
  private keyMap: Map<string, InputAction> = new Map([
    // Arrow keys
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    // WASD
    ['KeyW', 'up'],
    ['KeyS', 'down'],
    ['KeyA', 'left'],
    ['KeyD', 'right'],
    // Actions
    ['Enter', 'confirm'],
    ['Space', 'confirm'],
    ['KeyZ', 'confirm'],
    ['Escape', 'cancel'],
    ['KeyX', 'cancel'],
    ['Tab', 'menu'],
    ['KeyC', 'action1'],
    ['KeyV', 'action2'],
  ]);
  
  private gamepadIndex: number | null = null;
  private touchState: Map<InputAction, boolean> = new Map();
  
  constructor() {
    this.setupKeyboard();
    this.setupGamepad();
    this.setupTouch();
  }
  
  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const action = this.keyMap.get(e.code);
      if (action && !this.state.held.has(action)) {
        this.state.pressed.add(action);
        this.state.held.add(action);
      }
      
      // Prevent default for game keys
      if (action) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      const action = this.keyMap.get(e.code);
      if (action) {
        this.state.held.delete(action);
        this.state.released.add(action);
      }
    });
  }
  
  private setupGamepad(): void {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      console.log('Gamepad connected:', e.gamepad.id);
    });
    
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadIndex = null;
    });
  }
  
  private setupTouch(): void {
    // D-Pad
    const dpad = document.getElementById('dpad');
    if (dpad) {
      this.createDPad(dpad);
    }
    
    // Action buttons
    const btnA = document.getElementById('btn-a');
    const btnB = document.getElementById('btn-b');
    
    if (btnA) {
      this.bindTouchButton(btnA, 'confirm');
    }
    if (btnB) {
      this.bindTouchButton(btnB, 'cancel');
    }
  }
  
  private createDPad(container: HTMLElement): void {
    container.innerHTML = `
      <svg viewBox="0 0 120 120" style="width: 100%; height: 100%;">
        <rect id="dpad-up" x="40" y="0" width="40" height="40" fill="rgba(255,255,255,0.3)" rx="5"/>
        <rect id="dpad-down" x="40" y="80" width="40" height="40" fill="rgba(255,255,255,0.3)" rx="5"/>
        <rect id="dpad-left" x="0" y="40" width="40" height="40" fill="rgba(255,255,255,0.3)" rx="5"/>
        <rect id="dpad-right" x="80" y="40" width="40" height="40" fill="rgba(255,255,255,0.3)" rx="5"/>
        <rect x="40" y="40" width="40" height="40" fill="rgba(255,255,255,0.2)" rx="5"/>
      </svg>
    `;
    
    const directions: [string, InputAction][] = [
      ['dpad-up', 'up'],
      ['dpad-down', 'down'],
      ['dpad-left', 'left'],
      ['dpad-right', 'right'],
    ];
    
    directions.forEach(([id, action]) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.touchState.set(action, true);
          this.state.pressed.add(action);
          this.state.held.add(action);
        });
        el.addEventListener('touchend', () => {
          this.touchState.set(action, false);
          this.state.held.delete(action);
          this.state.released.add(action);
        });
      }
    });
  }
  
  private bindTouchButton(el: HTMLElement, action: InputAction): void {
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchState.set(action, true);
      this.state.pressed.add(action);
      this.state.held.add(action);
    });
    el.addEventListener('touchend', () => {
      this.touchState.set(action, false);
      this.state.held.delete(action);
      this.state.released.add(action);
    });
  }
  
  update(): void {
    // Clear pressed/released states (they only last one frame)
    this.state.pressed.clear();
    this.state.released.clear();
    
    // Poll gamepad
    if (this.gamepadIndex !== null) {
      this.pollGamepad();
    }
  }
  
  private pollGamepad(): void {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex!];
    if (!gp) return;
    
    // D-Pad or left stick
    const threshold = 0.5;
    
    this.updateGamepadAxis('left', gp.axes[0] < -threshold);
    this.updateGamepadAxis('right', gp.axes[0] > threshold);
    this.updateGamepadAxis('up', gp.axes[1] < -threshold);
    this.updateGamepadAxis('down', gp.axes[1] > threshold);
    
    // Buttons (Xbox layout)
    this.updateGamepadButton('confirm', gp.buttons[0]?.pressed); // A
    this.updateGamepadButton('cancel', gp.buttons[1]?.pressed);  // B
    this.updateGamepadButton('menu', gp.buttons[9]?.pressed);    // Start
  }
  
  private updateGamepadAxis(action: InputAction, active: boolean): void {
    if (active && !this.state.held.has(action)) {
      this.state.pressed.add(action);
      this.state.held.add(action);
    } else if (!active && this.state.held.has(action)) {
      this.state.held.delete(action);
      this.state.released.add(action);
    }
  }
  
  private updateGamepadButton(action: InputAction, pressed: boolean): void {
    if (pressed && !this.state.held.has(action)) {
      this.state.pressed.add(action);
      this.state.held.add(action);
    } else if (!pressed && this.state.held.has(action)) {
      this.state.held.delete(action);
      this.state.released.add(action);
    }
  }
  
  // Public API
  isActionPressed(action: InputAction): boolean {
    return this.state.pressed.has(action);
  }
  
  isActionHeld(action: InputAction): boolean {
    return this.state.held.has(action);
  }
  
  isActionReleased(action: InputAction): boolean {
    return this.state.released.has(action);
  }
  
  getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    
    if (this.state.held.has('left')) x -= 1;
    if (this.state.held.has('right')) x += 1;
    if (this.state.held.has('up')) y -= 1;
    if (this.state.held.has('down')) y += 1;
    
    return { x, y };
  }
}
