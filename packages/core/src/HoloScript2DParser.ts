/**
 * HoloScript 2D Parser Extension
 *
 * Adds support for 2D UI elements to HoloScript for desktop/mobile apps
 * Works alongside 3D VR syntax for hybrid applications
 */

import { logger } from './logger';

// 2D UI Node Types
export interface UI2DNode {
  type: '2d-element';
  elementType: UIElementType;
  name: string;
  properties: Record<string, any>;
  children?: UI2DNode[];
  events?: Record<string, string>; // event name -> function name
}

export type UIElementType =
  | 'canvas'
  | 'button'
  | 'textinput'
  | 'panel'
  | 'text'
  | 'image'
  | 'list'
  | 'modal'
  | 'slider'
  | 'toggle'
  | 'dropdown'
  | 'flex-container'
  | 'grid-container'
  | 'scroll-view';

export interface Position2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface UIStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
}

// Security configuration for 2D parsing
const UI_SECURITY_CONFIG = {
  maxUIElements: 500,
  maxNestingDepth: 10,
  maxPropertyLength: 500,
  allowedEventHandlers: ['onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur', 'onHover'],
};

export class HoloScript2DParser {
  private uiElements: Map<string, UI2DNode> = new Map();

  /**
   * Parse 2D UI element from HoloScript code
   *
   * Syntax:
   * button myButton {
   *   text: "Click me"
   *   x: 100
   *   y: 100
   *   onClick: handleClick
   * }
   */
  parse2DElement(code: string): UI2DNode | null {
    const lines = code.trim().split('\n');
    if (lines.length === 0) return null;

    // Parse first line: <elementType> <name> {
    const firstLine = lines[0].trim();
    const match = firstLine.match(/^(\w+)\s+(\w+)\s*\{/);

    if (!match) {
      logger.warn('[HoloScript2DParser] Invalid 2D element syntax', { line: firstLine });
      return null;
    }

    const [, elementType, name] = match;

    // Validate element type
    if (!this.isValidUIElementType(elementType)) {
      logger.warn('[HoloScript2DParser] Invalid UI element type', { elementType });
      return null;
    }

    // Parse properties
    const properties: Record<string, any> = {};
    const events: Record<string, string> = {};
    const children: UI2DNode[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip closing brace
      if (line === '}') continue;

      // Parse property: key: value
      const propMatch = line.match(/^(\w+):\s*(.+)$/);
      if (propMatch) {
        const [, key, rawValue] = propMatch;

        // Check if it's an event handler
        if (UI_SECURITY_CONFIG.allowedEventHandlers.includes(key)) {
          events[key] = rawValue.trim();
        } else {
          properties[key] = this.parsePropertyValue(rawValue);
        }
      }
    }

    const node: UI2DNode = {
      type: '2d-element',
      elementType: elementType as UIElementType,
      name,
      properties,
      events: Object.keys(events).length > 0 ? events : undefined,
      children: children.length > 0 ? children : undefined,
    };

    // Security check: max UI elements
    if (this.uiElements.size >= UI_SECURITY_CONFIG.maxUIElements) {
      logger.warn('[HoloScript2DParser] Max UI elements limit reached');
      return null;
    }

    this.uiElements.set(name, node);
    return node;
  }

  /**
   * Parse voice command for 2D UI creation
   *
   * Example: "create button login"
   * Example: "add textinput username"
   */
  parse2DVoiceCommand(command: string): UI2DNode | null {
    const tokens = command.toLowerCase().trim().split(/\s+/);

    if (tokens.length < 3) return null;

    const action = tokens[0]; // create, add, etc.
    const elementType = tokens[1];
    const name = tokens[2];

    if (action !== 'create' && action !== 'add') return null;
    if (!this.isValidUIElementType(elementType)) return null;

    // Create basic UI element
    const node: UI2DNode = {
      type: '2d-element',
      elementType: elementType as UIElementType,
      name,
      properties: this.getDefaultProperties(elementType as UIElementType),
    };

    this.uiElements.set(name, node);
    return node;
  }

  /**
   * Parse gesture for 2D UI interaction
   *
   * In hybrid mode, gestures can create 2D UI elements
   */
  parse2DGesture(gestureType: string, position: Position2D): UI2DNode | null {
    switch (gestureType) {
      case 'tap':
        // Tap creates a button at position
        return this.createQuick2DElement('button', `button_${Date.now()}`, position);

      case 'double-tap':
        // Double tap creates text input
        return this.createQuick2DElement('textinput', `input_${Date.now()}`, position);

      case 'long-press':
        // Long press creates panel
        return this.createQuick2DElement('panel', `panel_${Date.now()}`, position);

      default:
        return null;
    }
  }

  /**
   * Create quick 2D element from gesture
   */
  private createQuick2DElement(elementType: UIElementType, name: string, position: Position2D): UI2DNode {
    const node: UI2DNode = {
      type: '2d-element',
      elementType,
      name,
      properties: {
        ...this.getDefaultProperties(elementType),
        x: position.x,
        y: position.y,
      },
    };

    this.uiElements.set(name, node);
    return node;
  }

  /**
   * Parse container element with children
   *
   * Syntax:
   * flex-container sidebar {
   *   direction: "column"
   *
   *   button home {
   *     text: "Home"
   *   }
   *
   *   button settings {
   *     text: "Settings"
   *   }
   * }
   */
  parseContainer(code: string, depth: number = 0): UI2DNode | null {
    // Security: prevent deep nesting
    if (depth > UI_SECURITY_CONFIG.maxNestingDepth) {
      logger.warn('[HoloScript2DParser] Max nesting depth exceeded', { depth });
      return null;
    }

    // Parse container structure (simplified implementation)
    const node = this.parse2DElement(code);

    if (!node) return null;

    // Container types
    const containerTypes: UIElementType[] = ['panel', 'flex-container', 'grid-container', 'scroll-view', 'modal'];

    if (containerTypes.includes(node.elementType)) {
      // Parse children (in real implementation, would recursively parse nested elements)
      node.children = [];
    }

    return node;
  }

  /**
   * Validate if element type is supported
   */
  private isValidUIElementType(type: string): boolean {
    const validTypes: UIElementType[] = [
      'canvas', 'button', 'textinput', 'panel', 'text', 'image',
      'list', 'modal', 'slider', 'toggle', 'dropdown',
      'flex-container', 'grid-container', 'scroll-view'
    ];

    return validTypes.includes(type as UIElementType);
  }

  /**
   * Parse property value from string
   */
  private parsePropertyValue(value: string): any {
    const trimmed = value.trim();

    // String (quoted)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Number
    if (!isNaN(parseFloat(trimmed)) && isFinite(parseFloat(trimmed))) {
      return parseFloat(trimmed);
    }

    // Boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Array (simple comma-separated)
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const items = trimmed.slice(1, -1).split(',').map(item =>
        this.parsePropertyValue(item.trim())
      );
      return items;
    }

    // Default: return as string
    return trimmed;
  }

  /**
   * Get default properties for element type
   */
  private getDefaultProperties(elementType: UIElementType): Record<string, any> {
    const defaults: Record<UIElementType, Record<string, any>> = {
      'canvas': {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
      },
      'button': {
        text: 'Button',
        width: 120,
        height: 40,
        backgroundColor: '#007bff',
        color: '#ffffff',
        borderRadius: 4,
      },
      'textinput': {
        placeholder: '',
        width: 200,
        height: 36,
        fontSize: 14,
        borderColor: '#cccccc',
        borderWidth: 1,
        borderRadius: 4,
      },
      'panel': {
        width: 200,
        height: 200,
        backgroundColor: '#f0f0f0',
        borderRadius: 0,
      },
      'text': {
        content: 'Text',
        fontSize: 16,
        color: '#000000',
        fontFamily: 'sans-serif',
      },
      'image': {
        src: '',
        width: 100,
        height: 100,
        fit: 'cover',
      },
      'list': {
        items: [],
        itemHeight: 40,
        width: 200,
        height: 300,
      },
      'modal': {
        title: 'Modal',
        width: 400,
        height: 300,
        visible: false,
        backgroundColor: '#ffffff',
      },
      'slider': {
        min: 0,
        max: 100,
        value: 50,
        width: 200,
      },
      'toggle': {
        checked: false,
        width: 50,
        height: 24,
      },
      'dropdown': {
        options: [],
        selected: null,
        width: 200,
      },
      'flex-container': {
        direction: 'row',
        gap: 10,
        padding: 10,
      },
      'grid-container': {
        columns: 3,
        gap: 10,
        padding: 10,
      },
      'scroll-view': {
        width: 300,
        height: 400,
        scrollDirection: 'vertical',
      },
    };

    return { ...defaults[elementType] };
  }

  /**
   * Get all parsed UI elements
   */
  getUIElements(): Map<string, UI2DNode> {
    return new Map(this.uiElements);
  }

  /**
   * Find UI element by name
   */
  findElement(name: string): UI2DNode | null {
    return this.uiElements.get(name) || null;
  }

  /**
   * Clear all UI elements
   */
  clear(): void {
    this.uiElements.clear();
  }

  /**
   * Generate @hololand/ui code from parsed elements
   *
   * Converts HoloScript 2D syntax to actual @hololand/ui API calls
   */
  generateUICode(element: UI2DNode): string {
    const { elementType, name, properties, events } = element;

    // Map element types to @hololand/ui classes
    const classNames: Record<UIElementType, string> = {
      'canvas': 'UICanvas',
      'button': 'Button',
      'textinput': 'TextInput',
      'panel': 'Panel',
      'text': 'Text',
      'image': 'Image',
      'list': 'List',
      'modal': 'Modal',
      'slider': 'Slider',
      'toggle': 'Toggle',
      'dropdown': 'Dropdown',
      'flex-container': 'FlexContainer',
      'grid-container': 'GridContainer',
      'scroll-view': 'ScrollView',
    };

    const className = classNames[elementType];

    let code = `const ${name} = new ${className}({\n`;

    // Add properties
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        code += `  ${key}: "${value}",\n`;
      } else if (Array.isArray(value)) {
        code += `  ${key}: ${JSON.stringify(value)},\n`;
      } else {
        code += `  ${key}: ${value},\n`;
      }
    }

    // Add event handlers
    if (events) {
      for (const [eventName, handlerName] of Object.entries(events)) {
        code += `  ${eventName}: ${handlerName},\n`;
      }
    }

    code += `});`;

    return code;
  }

  /**
   * Convert entire UI tree to @hololand/ui code
   */
  generateFullUICode(): string {
    let code = `import { UICanvas, Button, TextInput, Panel, Text, Image, List, Modal, Slider, Toggle, Dropdown, FlexContainer, GridContainer, ScrollView } from '@hololand/ui';\n\n`;

    for (const element of this.uiElements.values()) {
      code += this.generateUICode(element) + '\n\n';
    }

    return code;
  }
}
