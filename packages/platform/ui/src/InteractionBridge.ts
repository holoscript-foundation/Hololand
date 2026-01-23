/**
 * @hololand/ui - InteractionBridge
 * Unified input mapper for Mouse, Touch, and WebXR Controller events.
 */

import { Vector2 } from './types';

export enum HoloPointerType {
  MOUSE = 'mouse',
  TOUCH = 'touch',
  VR_CONTROLLER = 'vr_controller',
  STYLUS = 'stylus',
}

export interface HoloPointerEvent {
  type: 'down' | 'up' | 'move' | 'click' | 'hover';
  pointerType: HoloPointerType;
  position: Vector2;
  originalEvent?: Event;
  pressure: number;
  button: number;
}

export type HoloPointerCallback = (event: HoloPointerEvent) => void;

/**
 * InteractionBridge standardizes input across all platforms.
 */
export class InteractionBridge {
  private _onDown: HoloPointerCallback[] = [];
  private _onUp: HoloPointerCallback[] = [];
  private _onMove: HoloPointerCallback[] = [];

  constructor(private element: HTMLElement | HTMLCanvasElement) {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Mouse
    this.element.addEventListener('mousedown', (e) => this.handleMouse(e as MouseEvent, 'down'));
    this.element.addEventListener('mouseup', (e) => this.handleMouse(e as MouseEvent, 'up'));
    this.element.addEventListener('mousemove', (e) => this.handleMouse(e as MouseEvent, 'move'));

    // Touch
    this.element.addEventListener('touchstart', (e) => this.handleTouch(e as TouchEvent, 'down'), {
      passive: false,
    } as never);
    this.element.addEventListener('touchend', (e) => this.handleTouch(e as TouchEvent, 'up'), {
      passive: false,
    } as never);
    this.element.addEventListener('touchmove', (e) => this.handleTouch(e as TouchEvent, 'move'), {
      passive: false,
    } as never);
  }

  private handleMouse(e: MouseEvent, type: HoloPointerEvent['type']): void {
    const rect = this.element.getBoundingClientRect();
    const event: HoloPointerEvent = {
      type,
      pointerType: HoloPointerType.MOUSE,
      position: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
      originalEvent: e,
      pressure: e.buttons > 0 ? 1 : 0,
      button: e.button,
    };
    this.emit(event);
  }

  private handleTouch(e: TouchEvent, type: HoloPointerEvent['type']): void {
    // Map first touch to pointer
    if (e.touches.length > 0 || type === 'up') {
      const touch = type === 'up' ? e.changedTouches[0] : e.touches[0];
      const rect = this.element.getBoundingClientRect();
      const event: HoloPointerEvent = {
        type,
        pointerType: HoloPointerType.TOUCH,
        position: {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        },
        originalEvent: e,
        pressure: 1, // Assume 1 for touch start/move
        button: 0,
      };
      this.emit(event);
    }
    // Prevent scrolling when interacting with VR UI
    e.preventDefault();
  }

  /**
   * Manual trigger for VR controllers (passed from HololandRenderer)
   */
  public injectVRPointer(
    type: HoloPointerEvent['type'],
    position: Vector2,
    button: number = 0
  ): void {
    const event: HoloPointerEvent = {
      type,
      pointerType: HoloPointerType.VR_CONTROLLER,
      position,
      pressure: type === 'down' ? 1 : 0,
      button,
    };
    this.emit(event);
  }

  private emit(event: HoloPointerEvent): void {
    const listeners =
      event.type === 'down' ? this._onDown : event.type === 'up' ? this._onUp : this._onMove;
    listeners.forEach((cb) => cb(event));
  }

  public onDown(cb: HoloPointerCallback): void {
    this._onDown.push(cb);
  }
  public onUp(cb: HoloPointerCallback): void {
    this._onUp.push(cb);
  }
  public onMove(cb: HoloPointerCallback): void {
    this._onMove.push(cb);
  }

  public dispose(): void {
    this._onDown = [];
    this._onUp = [];
    this._onMove = [];
    // Listeners are on element, usually removed when element is destroyed
  }
}
