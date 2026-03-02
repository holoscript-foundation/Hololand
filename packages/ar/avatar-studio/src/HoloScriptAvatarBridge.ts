/**
 * HoloScript Avatar Bridge
 *
 * Bridges the Avatar Studio with HoloScript's avatar declaration syntax.
 * Converts between AvatarBlueprint and HoloScript avatar/hair/outfit nodes,
 * enabling seamless integration with the HoloScript pipeline.
 *
 * This allows avatars created in the studio to be declared in HoloScript:
 *
 * ```holoscript
 * avatar#player
 *   @skeleton(type: "humanoid", ik_enabled: true)
 *   @body(preset: "athletic", height: 1.8)
 *   @face(shape: "oval")
 *   @expressive(blend_shapes: true, auto_blink: true)
 *   @locomotion(style: "realistic", walk_speed: 1.4)
 * {
 *   name: "Player Avatar"
 *   vrm_url: "https://assets.hololand.io/avatars/player.vrm"
 *
 *   @on_pose_change(pose) => sync_animation(pose)
 *   @on_expression_change(emotion) => update_face(emotion)
 * }
 * ```
 *
 * And it also enables importing HoloScript avatar definitions back into
 * the studio for editing.
 */

import type {
  AvatarBlueprint,
  BodyPreset,
  GenderPresentation,
  FaceShape,
  HairPhysicsMode,
} from './types';

// =============================================================================
// HOLOSCRIPT AVATAR NODE TYPES
// =============================================================================

/**
 * Represents a parsed HoloScript avatar declaration
 */
export interface HoloScriptAvatarNode {
  /** Node type identifier */
  type: 'avatar';
  /** Node ID (e.g., "player") */
  id: string;
  /** Avatar name */
  name: string;
  /** VRM model URL for the exported avatar */
  vrmUrl?: string;

  // Decorators
  skeleton?: {
    type: 'humanoid';
    ikEnabled: boolean;
  };
  body?: {
    preset: BodyPreset;
    height: number;
    gender?: GenderPresentation;
    skinColor?: string;
  };
  face?: {
    shape: FaceShape;
  };
  expressive?: {
    blendShapes: boolean;
    autoBlink: boolean;
  };
  locomotion?: {
    style: 'realistic' | 'stylized';
    walkSpeed: number;
  };

  // Child nodes
  hair?: {
    id: string;
    style: string;
    color: string;
    physics: boolean;
  };
  outfit?: {
    id: string;
    style: string;
    type: string;
    physics?: string;
  };

  // Event handlers
  handlers: {
    event: string;
    action: string;
  }[];
}

// =============================================================================
// BRIDGE CLASS
// =============================================================================

export class HoloScriptAvatarBridge {
  /**
   * Convert an AvatarBlueprint to a HoloScript avatar declaration string
   */
  blueprintToHoloScript(blueprint: Readonly<AvatarBlueprint>, avatarId: string = 'player'): string {
    const lines: string[] = [];

    // Avatar node
    lines.push(`avatar#${avatarId}`);
    lines.push(`  @skeleton(type: "humanoid", ik_enabled: true)`);
    lines.push(`  @body(preset: "${blueprint.body.preset}", height: ${blueprint.body.height})`);
    lines.push(`  @face(shape: "${blueprint.face.shape}")`);
    lines.push(`  @expressive(blend_shapes: true, auto_blink: true)`);
    lines.push(`  @locomotion(style: "realistic", walk_speed: 1.4)`);
    lines.push(`{`);
    lines.push(`  name: "${blueprint.name}"`);

    if (blueprint.body.skinColor) {
      lines.push(`  skin_color: "${blueprint.body.skinColor.hex}"`);
    }

    // Expression handlers
    lines.push(``);
    lines.push(`  @on_pose_change(pose) => sync_animation(pose)`);
    lines.push(`  @on_expression_change(emotion) => update_face(emotion)`);
    lines.push(`}`);

    // Hair child node
    lines.push(``);
    const hairPhysics = blueprint.hair.physics !== 'none';
    lines.push(`hair#${avatarId}_hair @hair(style: "${blueprint.hair.styleId}", physics: ${hairPhysics}) {`);
    lines.push(`  color: "${blueprint.hair.primaryColor.hex}"`);
    if (blueprint.hair.secondaryColor) {
      lines.push(`  secondary_color: "${blueprint.hair.secondaryColor.hex}"`);
    }
    lines.push(`  parent: "${avatarId}"`);
    lines.push(`}`);

    // Outfit child nodes
    for (const clothing of blueprint.clothing) {
      lines.push(``);
      const slotType = this.clothingSlotToHoloScript(clothing.slot);
      lines.push(`outfit#${avatarId}_${clothing.slot} @clothing(type: "${slotType}") {`);
      lines.push(`  style: "${clothing.assetId}"`);
      if (clothing.primaryColor) {
        lines.push(`  color: "${clothing.primaryColor.hex}"`);
      }
      lines.push(`  parent: "${avatarId}"`);
      lines.push(`}`);
    }

    // Accessory child nodes
    for (const accessory of blueprint.accessories) {
      lines.push(``);
      lines.push(`accessory#${avatarId}_${accessory.slot} @accessory(type: "${accessory.slot}") {`);
      lines.push(`  style: "${accessory.assetId}"`);
      if (accessory.color) {
        lines.push(`  color: "${accessory.color.hex}"`);
      }
      lines.push(`  parent: "${avatarId}"`);
      lines.push(`}`);
    }

    return lines.join('\n');
  }

  /**
   * Convert a HoloScript avatar node to a partial AvatarBlueprint
   *
   * This enables importing HoloScript avatar definitions into the studio
   * for visual editing.
   */
  holoScriptToBlueprint(node: HoloScriptAvatarNode): Partial<AvatarBlueprint> {
    const blueprint: Partial<AvatarBlueprint> = {
      name: node.name,
    };

    // Body
    if (node.body) {
      blueprint.body = {
        preset: node.body.preset,
        genderPresentation: node.body.gender ?? 'androgynous',
        height: node.body.height,
        proportions: {
          headScale: 0.5,
          shoulderWidth: 0.5,
          chestSize: 0.5,
          waistSize: 0.5,
          hipWidth: 0.5,
          armLength: 0.5,
          legLength: 0.5,
          handSize: 0.5,
          footSize: 0.5,
          muscleTone: 0.3,
        },
        skinColor: { hex: node.body.skinColor ?? '#e0b896' },
      };
    }

    // Face
    if (node.face) {
      blueprint.face = {
        shape: node.face.shape,
        morphs: {
          jawWidth: 0.5,
          jawHeight: 0.5,
          chinSize: 0.5,
          cheekboneHeight: 0.5,
          cheekFullness: 0.5,
          foreheadHeight: 0.5,
          browRidge: 0.3,
        },
        eyes: {
          shape: 'almond',
          irisColor: { hex: '#6b4423' },
          pupilSize: 0.5,
          separation: 0.5,
          tilt: 0.5,
          size: 0.5,
          scleraColor: { hex: '#ffffff' },
        },
        nose: {
          shape: 'straight',
          bridgeWidth: 0.5,
          tipHeight: 0.5,
          nostrilWidth: 0.5,
          size: 0.5,
        },
        mouth: {
          shape: 'medium',
          lipColor: { hex: '#c47070' },
          width: 0.5,
          upperFullness: 0.5,
          lowerFullness: 0.5,
        },
        eyebrows: {
          styleId: 'default',
          color: { hex: '#3d2b1f' },
          thickness: 0.5,
          archHeight: 0.5,
          height: 0.5,
        },
        ears: {
          size: 0.5,
          pointedness: 0.0,
          angle: 0.5,
        },
        faceOverlays: [],
      };
    }

    // Hair
    if (node.hair) {
      blueprint.hair = {
        styleId: node.hair.style,
        primaryColor: { hex: node.hair.color },
        gradientPosition: 1.0,
        physics: node.hair.physics ? 'simple' : 'none',
        lengthFactor: 0.5,
        volume: 0.5,
      };
    }

    return blueprint;
  }

  /**
   * Parse a HoloScript avatar block (simplified parser for avatar nodes)
   *
   * This is a lightweight parser specifically for avatar declarations.
   * The full HoloScript parser in @holoscript/core handles the complete language.
   */
  parseHoloScriptAvatar(source: string): HoloScriptAvatarNode | null {
    const lines = source.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    // Find avatar declaration
    const avatarLine = lines.find((l) => l.startsWith('avatar#'));
    if (!avatarLine) return null;

    const idMatch = avatarLine.match(/avatar#(\w+)/);
    if (!idMatch) return null;

    const node: HoloScriptAvatarNode = {
      type: 'avatar',
      id: idMatch[1],
      name: '',
      handlers: [],
    };

    // Parse decorators and properties
    for (const line of lines) {
      // Body decorator
      const bodyMatch = line.match(/@body\(preset:\s*"(\w+)",\s*height:\s*([\d.]+)\)/);
      if (bodyMatch) {
        node.body = {
          preset: bodyMatch[1] as BodyPreset,
          height: parseFloat(bodyMatch[2]),
        };
      }

      // Face decorator
      const faceMatch = line.match(/@face\(shape:\s*"(\w+)"\)/);
      if (faceMatch) {
        node.face = { shape: faceMatch[1] as FaceShape };
      }

      // Name property
      const nameMatch = line.match(/name:\s*"([^"]+)"/);
      if (nameMatch) {
        node.name = nameMatch[1];
      }

      // Skeleton decorator
      const skelMatch = line.match(/@skeleton\(type:\s*"(\w+)",\s*ik_enabled:\s*(true|false)\)/);
      if (skelMatch) {
        node.skeleton = {
          type: 'humanoid',
          ikEnabled: skelMatch[2] === 'true',
        };
      }

      // Hair child
      const hairMatch = line.match(/@hair\(style:\s*"([^"]+)",\s*physics:\s*(true|false)\)/);
      if (hairMatch) {
        const hairIdMatch = line.match(/hair#(\w+)/);
        node.hair = {
          id: hairIdMatch?.[1] ?? 'hair',
          style: hairMatch[1],
          color: '#3d2b1f',
          physics: hairMatch[2] === 'true',
        };
      }

      // Color property for hair
      if (node.hair && line.match(/color:\s*"(#[0-9a-fA-F]+)"/)) {
        const colorMatch = line.match(/color:\s*"(#[0-9a-fA-F]+)"/);
        if (colorMatch) {
          node.hair.color = colorMatch[1];
        }
      }

      // Event handlers
      const handlerMatch = line.match(/@on_(\w+)\((\w+)\)\s*=>\s*(\w+)\((\w+)\)/);
      if (handlerMatch) {
        node.handlers.push({
          event: handlerMatch[1],
          action: `${handlerMatch[3]}(${handlerMatch[4]})`,
        });
      }
    }

    return node;
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private clothingSlotToHoloScript(slot: string): string {
    const mapping: Record<string, string> = {
      upperBody: 'upper_body',
      lowerBody: 'lower_body',
      fullBody: 'full_body',
      feet: 'feet',
      hands: 'hands',
      head: 'head',
      outerwear: 'outerwear',
      face: 'face',
      neck: 'neck',
    };
    return mapping[slot] ?? slot;
  }
}
