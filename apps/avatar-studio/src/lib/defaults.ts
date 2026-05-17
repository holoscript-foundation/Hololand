/**
 * Default blueprint factory for new avatars.
 *
 * Creates a fully populated AvatarBlueprint with sensible defaults.
 * Used when the studio opens without an initial blueprint.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AvatarBlueprint } from './types';

export function createDefaultBlueprint(overrides?: Partial<AvatarBlueprint>): AvatarBlueprint {
  const now = Date.now();

  return {
    id: uuidv4(),
    name: 'New Avatar',
    version: 1,
    createdAt: now,
    updatedAt: now,

    body: {
      preset: 'average',
      genderPresentation: 'androgynous',
      height: 1.7,
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
      skinColor: { hex: '#e0b896' },
    },

    face: {
      shape: 'oval',
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
        irisColor: { hex: '#5b7c4f' },
        pupilSize: 0.5,
        separation: 0.5,
        tilt: 0.5,
        size: 0.5,
        scleraColor: { hex: '#f5f5f0' },
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
        lipColor: { hex: '#c97878' },
        width: 0.5,
        upperFullness: 0.5,
        lowerFullness: 0.5,
      },
      eyebrows: {
        styleId: 'brow-natural-01',
        color: { hex: '#4a3728' },
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
    },

    hair: {
      styleId: 'hair-short-01',
      primaryColor: { hex: '#4a3728' },
      gradientPosition: 1.0,
      physics: 'simple',
      lengthFactor: 0.5,
      volume: 0.5,
    },

    clothing: [],
    accessories: [],

    expressions: [
      {
        name: 'happy',
        isStandard: true,
        blendShapeWeights: { happy: 1.0 },
      },
      {
        name: 'neutral',
        isStandard: true,
        blendShapeWeights: {},
      },
    ],

    vrmMeta: {
      title: 'HoloLand Avatar',
      description: 'Avatar created with HoloLand Avatar Studio',
      author: 'HoloLand User',
      version: '1.0',
      allowedUser: 'Everyone',
      violentUsage: false,
      sexualUsage: false,
      commercialUsage: true,
      license: 'CC_BY',
    },

    ...overrides,
  };
}
