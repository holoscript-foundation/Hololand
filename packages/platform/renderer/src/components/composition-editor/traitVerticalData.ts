/**
 * Trait-Vertical Mappings Data
 *
 * ⚠️ MIGRATION NOTICE:
 * The canonical source for trait-vertical mappings is @holoscript/lsp:
 *   packages/lsp/src/data/trait-vertical-mappings.ts (15 verticals, full data)
 *
 * This local copy has only 2 verticals (healthcare, education).
 * When @holoscript/lsp is next rebuilt, replace this file with:
 *   export { VERTICAL_MAPPINGS, getVerticalById, findVerticalsByTags } from '@holoscript/lsp';
 *   export type { TraitRecommendation, VerticalMapping } from '@holoscript/lsp';
 *
 * Source: @holoscript/lsp/src/data/trait-vertical-mappings.ts
 */

import type { TraitRecommendation, VerticalMapping } from './types';

export const VERTICAL_MAPPINGS: VerticalMapping[] = [
  {
    id: 'healthcare',
    displayName: 'Healthcare',
    description: 'Medical training, surgical simulation, patient rehabilitation, and health data visualization.',
    matchTags: ['healthcare', 'medical', 'health', 'surgical', 'rehabilitation', 'therapy', 'clinical', 'hospital', 'patient'],
    traits: [
      { trait: '@hand_tracked', relevance: 1.0, rationale: 'Precise hand tracking for surgical simulation and medical tool manipulation.', configHint: 'solver: "fabrik", precision: "high"' },
      { trait: '@haptic', relevance: 0.95, rationale: 'Tactile feedback for tissue palpation, needle insertion, and instrument handling.', configHint: 'intensity: 0.8, pattern: "pulse"' },
      { trait: '@anchor', relevance: 0.9, rationale: 'Anchors medical models and anatomical overlays to real-world surfaces in AR.', configHint: 'type: "surface", persistent: true' },
      { trait: '@accessible', relevance: 0.9, rationale: 'WCAG compliance for medical applications; screen reader and subtitle support.', configHint: 'screenReader: true, subtitles: true, highContrast: true' },
      { trait: '@ik', relevance: 0.85, rationale: 'Inverse kinematics for realistic avatar arm/hand positioning during procedures.', configHint: 'solver: "two-bone", iterations: 20' },
      { trait: '@voice_input', relevance: 0.8, rationale: 'Hands-free voice commands during sterile procedures.', configHint: 'continuous: true, language: "en-US"' },
      { trait: '@networked', relevance: 0.75, rationale: 'Multi-user collaboration for remote surgical consultation and training.', configHint: 'owner: "server", syncRate: 30' },
      { trait: '@trigger', relevance: 0.7, rationale: 'Spatial zones for step-by-step procedural guidance.', configHint: 'shape: "sphere", radius: 0.5' },
      { trait: '@material', relevance: 0.65, rationale: 'Realistic tissue and organ rendering with subsurface scattering.', configHint: 'type: "standard", transparent: true' },
      { trait: '@skeleton', relevance: 0.6, rationale: 'Anatomical skeleton visualization and animation for education.', configHint: 'armature: "humanoid"' },
    ],
  },
  {
    id: 'education',
    displayName: 'Education',
    description: 'Virtual classrooms, interactive lessons, 3D visualizations, and collaborative learning.',
    matchTags: ['education', 'learning', 'classroom', 'school', 'university', 'training', 'tutorial', 'lesson', 'academic'],
    traits: [
      { trait: '@voice_input', relevance: 1.0, rationale: 'Voice interaction for Q&A, answer recognition, and hands-free navigation.', configHint: 'language: "en-US", continuous: true' },
      { trait: '@voice_output', relevance: 0.95, rationale: 'Text-to-speech for narration, instructions, and accessibility.', configHint: 'rate: 0.9, volume: 1.0' },
      { trait: '@networked', relevance: 0.9, rationale: 'Multi-student collaborative environments and shared whiteboards.', configHint: 'owner: "server", syncRate: 20' },
      { trait: '@dialog', relevance: 0.85, rationale: 'Structured dialog trees for guided lessons and interactive quizzes.', configHint: 'autoAdvance: false, typewriterSpeed: 30' },
      { trait: '@animation', relevance: 0.85, rationale: 'Animated diagrams and step-by-step process visualization.', configHint: 'loop: true, easing: "easeInOut"' },
      { trait: '@accessible', relevance: 0.8, rationale: 'Inclusive design for diverse learners with different abilities.', configHint: 'screenReader: true, subtitles: true' },
      { trait: '@anchor', relevance: 0.75, rationale: 'AR overlays for textbook augmentation and lab simulations.', configHint: 'type: "image", persistent: false' },
      { trait: '@ai_driver', relevance: 0.7, rationale: 'AI tutors that adapt to student questions and learning pace.', configHint: 'model: "gpt-4", temperature: 0.5' },
      { trait: '@lobby', relevance: 0.65, rationale: 'Classroom session management and student grouping.', configHint: 'maxPlayers: 30, isPublic: false' },
      { trait: '@material', relevance: 0.6, rationale: 'Visual differentiation of interactive vs. static objects.', configHint: 'emissive: [0.2, 0.5, 1.0]' },
    ],
  },
  // NOTE: 13 more verticals available in @holoscript/lsp canonical source
];

/**
 * Get all unique traits across all verticals
 */
export function getAllTraits(): string[] {
  const traitSet = new Set<string>();
  for (const vertical of VERTICAL_MAPPINGS) {
    for (const trait of vertical.traits) {
      traitSet.add(trait.trait);
    }
  }
  return Array.from(traitSet).sort();
}

/**
 * Get trait recommendation for a specific vertical and trait
 */
export function getTraitRecommendation(
  verticalId: string,
  traitName: string
): TraitRecommendation | undefined {
  const vertical = VERTICAL_MAPPINGS.find((v) => v.id === verticalId);
  if (!vertical) return undefined;
  return vertical.traits.find((t) => t.trait === traitName);
}
