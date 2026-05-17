/**
 * @hololand/ui - HUD Components
 * Components designed for head-up displays (HUDs).
 */

import { Panel } from './Panel';
import { Text } from './Text';
import { themeContext, Theme } from '../theme';
import { UIComponentConfig } from '../types';

/**
 * HudComponent - A base for UI elements that are usually fixed to the viewport.
 */
export class HudComponent extends Panel {
  constructor(config: UIComponentConfig) {
    super({
      ...config,
      zIndex: config.zIndex ?? 1000, // Always high z-index
    });
  }
}

/**
 * StatusHud - Displays current world status (Scale, AI state, etc.)
 */
export class StatusHud extends HudComponent {
  private scaleText: Text;
  private aiStatusText: Text;

  constructor(config: UIComponentConfig) {
    super(config);

    const theme = (themeContext as unknown as { theme: Theme }).theme;

    this.scaleText = new Text({
      position: { x: theme.spacing?.md || 16, y: theme.spacing?.md || 16 },
      content: 'Scale: 1.0x (Human)',
      fontSize: theme.typography?.fontSize?.md || 14,
      color: theme.colors?.textPrimary || '#333',
    });

    this.aiStatusText = new Text({
      position: { x: theme.spacing?.md || 16, y: (theme.spacing?.md || 16) + 24 },
      content: 'AI: Ready',
      fontSize: theme.typography?.fontSize?.['sm'] || 12,
      color: theme.colors?.success || '#27ae60',
    });

    this.addChild(this.scaleText);
    this.addChild(this.aiStatusText);
  }

  public setScale(multiplier: number, magnitude: string): void {
    const rounded = multiplier.toExponential(2);
    this.scaleText.content = `Scale: ${rounded} (${magnitude})`;
    this.markDirty();
  }

  public setAIStatus(status: string, active: boolean = false): void {
    this.aiStatusText.content = `AI: ${status}`;
    this.aiStatusText.color = active
      ? themeContext.theme.colors.primary
      : themeContext.theme.colors.success;
    this.markDirty();
  }
}
