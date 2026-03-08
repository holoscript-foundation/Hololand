/**
 * HoloScript Accessibility Scanner
 *
 * Parses .holo files and evaluates them against WCAG 2.1 Level AA criteria
 * by checking for the presence and correctness of HoloScript accessibility
 * traits. The scanner performs static analysis on the .holo source text,
 * extracting objects, their traits, and trait properties.
 *
 * Architecture:
 *   1. Parse phase: Extract objects, traits, and properties from .holo source
 *   2. Resolve phase: Resolve template references to inherit traits
 *   3. Audit phase: Check each object against WCAG criteria
 *   4. Report phase: Aggregate results into a structured report
 *
 * The parser uses line-by-line regex matching rather than a full grammar
 * parse because:
 *   - It runs outside the render loop (no frame budget constraint)
 *   - It needs to work with partial/invalid .holo files gracefully
 *   - It provides line numbers for each finding
 *   - The accessibility traits have a predictable structure
 *
 * @module accessibility-audit-dashboard/holoAccessibilityScanner
 */

import type {
  ParsedHoloFile,
  HoloObject,
  AccessibleProperties,
  AltTextProperties,
  ScreenReaderProperties,
  HoloAccessibilityTrait,
  AccessibilityAuditReport,
  AuditCheckResult,
  CriterionAuditResult,
  AuditSummary,
  AuditCheckStatus,
  AuditSeverity,
  WCAGPrinciple,
} from './types';
import {
  WCAG_CRITERIA,
  TRAIT_REGISTRY,
  createAuditCheckId,
  createReportId,
} from './types';

// =============================================================================
// PARSER - EXTRACT OBJECTS FROM .HOLO SOURCE
// =============================================================================

/**
 * All accessibility trait names for regex matching.
 */
const ALL_TRAITS: HoloAccessibilityTrait[] = [
  '@accessible', '@alt_text', '@screen_reader', '@subtitle',
  '@high_contrast', '@motion_reduced', '@haptic_cue', '@haptic',
  '@voice_input', '@voice_output',
];

/**
 * Regex patterns for detecting object definitions in .holo files.
 *
 * Matches patterns like:
 *   object "Name" { ... }
 *   object "Name" @trait { ... }
 *   object "Name" using "Template" { ... }
 *   template "Name" { ... }
 */
const OBJECT_START_PATTERN = /^\s*(object|template)\s+"([^"]+)"\s*(.*)\{/;

/**
 * Regex for detecting composition blocks.
 */
const COMPOSITION_PATTERN = /^\s*composition\s+"([^"]+)"\s*\{/;

/**
 * Regex for detecting accessibility config blocks.
 */
const ACCESSIBILITY_BLOCK_PATTERN = /^\s*accessibility\s*\{/;

/**
 * Regex for detecting trait annotations on a line.
 */
const TRAIT_INLINE_PATTERN = /@(accessible|alt_text|screen_reader|subtitle|high_contrast|motion_reduced|haptic_cue|haptic|voice_input|voice_output)/g;

/**
 * Regex for detecting a trait block (trait with properties in braces).
 */
const TRAIT_BLOCK_PATTERN = /^\s*@(accessible|alt_text|screen_reader|subtitle|high_contrast|motion_reduced|haptic_cue|haptic|voice_input|voice_output)\s*\{/;

/**
 * Regex for detecting interactive event handlers.
 */
const INTERACTIVE_PATTERN = /on_activate|on_event|onClick|onGrab|on_focus|on_blur|onHoverEnter/;

/**
 * Regex for detecting visual content.
 */
const VISUAL_CONTENT_PATTERN = /\b(geometry|src|text)\s*:/;

/**
 * Regex for detecting audio content.
 */
const AUDIO_CONTENT_PATTERN = /\b(audio_source|ambience|clip)\s*:/;

/**
 * Regex for detecting animation blocks.
 */
const ANIMATION_PATTERN = /\b(animation)\s+\w+/;

/**
 * Regex for template reference.
 */
const TEMPLATE_REF_PATTERN = /using\s+"([^"]+)"/;

/**
 * Regex for simple key-value properties.
 */
const PROPERTY_PATTERN = /^\s*(\w+)\s*:\s*(.+)/;

/**
 * Parse a .holo file source into a structured representation.
 */
export function parseHoloFile(
  fileName: string,
  filePath: string,
  source: string,
): ParsedHoloFile {
  const lines = source.split('\n');
  const objects: HoloObject[] = [];
  const compositions: string[] = [];
  const templates: string[] = [];
  let hasAccessibilityBlock = false;
  let locale: string | undefined;

  let currentObject: HoloObject | null = null;
  let braceDepth = 0;
  let objectBraceDepth = 0;
  let inTraitBlock = false;
  let currentTraitName: HoloAccessibilityTrait | null = null;
  let traitBraceDepth = 0;
  let inAccessibilityBlock = false;
  let accessibilityBraceDepth = 0;
  let inComposition = false;
  let compositionDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Count braces for depth tracking
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Skip comment-only lines
    if (/^\s*\/\//.test(line)) {
      continue;
    }

    // Detect composition start
    const compositionMatch = COMPOSITION_PATTERN.exec(line);
    if (compositionMatch) {
      compositions.push(compositionMatch[1]);
      inComposition = true;
      compositionDepth = braceDepth + openBraces;
    }

    // Detect global accessibility block
    if (ACCESSIBILITY_BLOCK_PATTERN.test(line) && !currentObject) {
      hasAccessibilityBlock = true;
      inAccessibilityBlock = true;
      accessibilityBraceDepth = braceDepth + openBraces;
    }

    // Parse accessibility block properties
    if (inAccessibilityBlock) {
      const propMatch = PROPERTY_PATTERN.exec(line);
      if (propMatch && propMatch[1] === 'locale') {
        locale = propMatch[2].replace(/['"]/g, '').trim();
      }
    }

    // Detect object/template definitions
    const objectMatch = OBJECT_START_PATTERN.exec(line);
    if (objectMatch) {
      // Finalize previous object if any
      if (currentObject) {
        objects.push(currentObject);
      }

      const objectType = objectMatch[1];
      const objectName = objectMatch[2];
      const restOfLine = objectMatch[3] || '';

      // Extract inline traits from the definition line
      const inlineTraits: HoloAccessibilityTrait[] = [];
      let traitMatch: RegExpExecArray | null;
      const traitRegex = new RegExp(TRAIT_INLINE_PATTERN.source, 'g');
      while ((traitMatch = traitRegex.exec(restOfLine)) !== null) {
        inlineTraits.push(`@${traitMatch[1]}` as HoloAccessibilityTrait);
      }

      // Extract template reference
      const templateRefMatch = TEMPLATE_REF_PATTERN.exec(restOfLine);
      const templateRef = templateRefMatch ? templateRefMatch[1] : undefined;

      if (objectType === 'template') {
        templates.push(objectName);
      }

      currentObject = {
        name: objectName,
        type: objectType,
        lineNumber: lineNum,
        isInteractive: false,
        hasVisualContent: false,
        hasAudioContent: false,
        hasAnimation: false,
        traits: [...inlineTraits],
        accessibleProps: {},
        altTextProps: {},
        screenReaderProps: {},
        templateRef,
        isCompositionChild: inComposition,
      };

      objectBraceDepth = braceDepth + openBraces;
    }

    // Process lines inside an object
    if (currentObject) {
      // Detect trait blocks (multi-line trait definitions)
      const traitBlockMatch = TRAIT_BLOCK_PATTERN.exec(line);
      if (traitBlockMatch) {
        currentTraitName = `@${traitBlockMatch[1]}` as HoloAccessibilityTrait;
        if (!currentObject.traits.includes(currentTraitName)) {
          currentObject.traits.push(currentTraitName);
        }
        inTraitBlock = true;
        traitBraceDepth = braceDepth + openBraces;
      }

      // Parse trait block properties
      if (inTraitBlock && currentTraitName) {
        const propMatch = PROPERTY_PATTERN.exec(line);
        if (propMatch) {
          const key = propMatch[1];
          const value = propMatch[2].replace(/['"]/g, '').trim();

          if (currentTraitName === '@accessible') {
            switch (key) {
              case 'role': currentObject.accessibleProps.role = value; break;
              case 'label': currentObject.accessibleProps.label = value; break;
              case 'description': currentObject.accessibleProps.description = value; break;
              case 'tab_index': currentObject.accessibleProps.tabIndex = parseInt(value, 10); break;
              case 'focus_visible': currentObject.accessibleProps.focusVisible = value === 'true'; break;
              case 'keyboard_shortcut': currentObject.accessibleProps.keyboardShortcut = value; break;
              case 'live_region': currentObject.accessibleProps.liveRegion = value; break;
            }
          } else if (currentTraitName === '@alt_text') {
            switch (key) {
              case 'text': currentObject.altTextProps.text = value; break;
              case 'verbose': currentObject.altTextProps.verbose = value; break;
              case 'language': currentObject.altTextProps.language = value; break;
              case 'context_aware': currentObject.altTextProps.contextAware = value === 'true'; break;
              case 'include_spatial': currentObject.altTextProps.includeSpatial = value === 'true'; break;
            }
          } else if (currentTraitName === '@screen_reader') {
            switch (key) {
              case 'semantic_structure': currentObject.screenReaderProps.semanticStructure = value === 'true'; break;
              case 'navigation_order': currentObject.screenReaderProps.navigationOrder = parseInt(value, 10); break;
              case 'reading_mode': currentObject.screenReaderProps.readingMode = value; break;
              case 'verbosity': currentObject.screenReaderProps.verbosity = value; break;
              case 'announce_changes': currentObject.screenReaderProps.announceChanges = value === 'true'; break;
            }
          }
        }
      }

      // Detect interactive elements
      if (INTERACTIVE_PATTERN.test(line)) {
        currentObject.isInteractive = true;
      }

      // Detect visual content
      if (VISUAL_CONTENT_PATTERN.test(line)) {
        currentObject.hasVisualContent = true;
      }

      // Detect audio content
      if (AUDIO_CONTENT_PATTERN.test(line)) {
        currentObject.hasAudioContent = true;
      }

      // Detect animation
      if (ANIMATION_PATTERN.test(line)) {
        currentObject.hasAnimation = true;
      }
    }

    // Update brace depth
    braceDepth += openBraces - closeBraces;

    // Check if we've exited the trait block
    if (inTraitBlock && braceDepth <= traitBraceDepth - 1) {
      inTraitBlock = false;
      currentTraitName = null;
    }

    // Check if we've exited the accessibility block
    if (inAccessibilityBlock && braceDepth <= accessibilityBraceDepth - 1) {
      inAccessibilityBlock = false;
    }

    // Check if we've exited the composition
    if (inComposition && braceDepth <= compositionDepth - 1) {
      inComposition = false;
    }

    // Check if we've exited the current object
    if (currentObject && braceDepth <= objectBraceDepth - 1) {
      objects.push(currentObject);
      currentObject = null;
    }
  }

  // Handle case where last object wasn't closed
  if (currentObject) {
    objects.push(currentObject);
  }

  return {
    fileName,
    filePath,
    source,
    lineCount: lines.length,
    objects,
    compositions,
    templates,
    hasAccessibilityBlock,
    locale,
  };
}

// =============================================================================
// TEMPLATE RESOLUTION
// =============================================================================

/**
 * Resolve template references so objects inherit their template's traits.
 */
export function resolveTemplates(parsedFile: ParsedHoloFile): ParsedHoloFile {
  const templateMap = new Map<string, HoloObject>();

  // Build template lookup
  for (const obj of parsedFile.objects) {
    if (obj.type === 'template') {
      templateMap.set(obj.name, obj);
    }
  }

  // Resolve template references
  const resolvedObjects = parsedFile.objects.map((obj) => {
    if (!obj.templateRef) return obj;

    const template = templateMap.get(obj.templateRef);
    if (!template) return obj;

    // Merge traits: object's own traits take precedence
    const mergedTraits = new Set([...template.traits, ...obj.traits]);

    // Merge accessible properties (object overrides template)
    const mergedAccessibleProps: AccessibleProperties = {
      ...template.accessibleProps,
      ...obj.accessibleProps,
    };

    // Merge alt_text properties
    const mergedAltTextProps: AltTextProperties = {
      ...template.altTextProps,
      ...obj.altTextProps,
    };

    // Merge screen_reader properties
    const mergedScreenReaderProps: ScreenReaderProperties = {
      ...template.screenReaderProps,
      ...obj.screenReaderProps,
    };

    return {
      ...obj,
      traits: Array.from(mergedTraits),
      accessibleProps: mergedAccessibleProps,
      altTextProps: mergedAltTextProps,
      screenReaderProps: mergedScreenReaderProps,
      isInteractive: obj.isInteractive || template.isInteractive,
      hasVisualContent: obj.hasVisualContent || template.hasVisualContent,
      hasAudioContent: obj.hasAudioContent || template.hasAudioContent,
      hasAnimation: obj.hasAnimation || template.hasAnimation,
    };
  });

  return {
    ...parsedFile,
    objects: resolvedObjects,
  };
}

// =============================================================================
// AUDIT ENGINE
// =============================================================================

/**
 * Run WCAG 2.1 audit checks on a parsed .holo file.
 */
function auditObject(
  obj: HoloObject,
  parsedFile: ParsedHoloFile,
): AuditCheckResult[] {
  const results: AuditCheckResult[] = [];

  // Skip template definitions (they're checked via their instances)
  if (obj.type === 'template') return results;

  for (const criterion of WCAG_CRITERIA) {
    const check = evaluateCriterion(criterion.id, obj, parsedFile);
    if (check) {
      results.push(check);
    }
  }

  return results;
}

/**
 * Evaluate a single WCAG criterion against an object.
 */
function evaluateCriterion(
  criterionId: string,
  obj: HoloObject,
  parsedFile: ParsedHoloFile,
): AuditCheckResult | null {
  switch (criterionId) {
    case '1.1.1': return checkNonTextContent(obj);
    case '1.2.1': return checkAudioVideoAlternative(obj);
    case '1.3.1': return checkInfoRelationships(obj);
    case '1.3.2': return checkMeaningfulSequence(obj, parsedFile);
    case '1.4.3': return checkContrastMinimum(obj);
    case '1.4.4': return checkResizeText(obj, parsedFile);
    case '1.4.11': return checkNonTextContrast(obj);
    case '2.1.1': return checkKeyboard(obj);
    case '2.3.1': return checkThreeFlashes(obj);
    case '2.4.1': return checkBypassBlocks(obj, parsedFile);
    case '2.4.3': return checkFocusOrder(obj);
    case '2.4.6': return checkHeadingsLabels(obj);
    case '2.4.7': return checkFocusVisible(obj);
    case '2.5.1': return checkPointerGestures(obj, parsedFile);
    case '3.1.1': return checkLanguageOfPage(obj, parsedFile);
    case '3.3.2': return checkLabelsInstructions(obj);
    case '4.1.2': return checkNameRoleValue(obj);
    case '4.1.3': return checkStatusMessages(obj);
    default: return null;
  }
}

// -- Individual Criterion Checks --

/**
 * 1.1.1 Non-text Content: Objects with visual content need @alt_text.
 */
function checkNonTextContent(obj: HoloObject): AuditCheckResult | null {
  if (!obj.hasVisualContent) {
    return null; // Not applicable
  }

  const hasAltText = obj.traits.includes('@alt_text');
  const hasText = obj.altTextProps.text && obj.altTextProps.text.length > 0;

  if (hasAltText && hasText) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.1.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has alt text: "${obj.altTextProps.text}"`,
    };
  }

  if (hasAltText && !hasText) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.1.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'warning',
      severity: 'major',
      message: `Object "${obj.name}" has @alt_text trait but missing "text" property`,
      suggestedFix: 'Add a descriptive "text" property inside the @alt_text block',
      missingProperties: ['text'],
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.1.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'critical',
    message: `Object "${obj.name}" has visual content but no @alt_text trait`,
    suggestedFix: `Add @alt_text { text: "Description of ${obj.name}" } to provide alternative text`,
    missingTrait: '@alt_text',
  };
}

/**
 * 1.2.1 Audio-only and Video-only: Audio content needs @voice_output or @subtitle.
 */
function checkAudioVideoAlternative(obj: HoloObject): AuditCheckResult | null {
  if (!obj.hasAudioContent) {
    return null;
  }

  const hasVoiceOutput = obj.traits.includes('@voice_output');
  const hasSubtitle = obj.traits.includes('@subtitle');

  if (hasVoiceOutput || hasSubtitle) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.2.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Audio object "${obj.name}" has ${hasSubtitle ? 'subtitles' : 'voice output'} alternative`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.2.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'major',
    message: `Audio object "${obj.name}" has no text alternative (@subtitle or @voice_output)`,
    suggestedFix: 'Add @subtitle or @voice_output trait to provide text alternative for audio content',
    missingTrait: '@subtitle',
  };
}

/**
 * 1.3.1 Info and Relationships: Interactive or content objects need @screen_reader.
 */
function checkInfoRelationships(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive && !obj.hasVisualContent) {
    return null;
  }

  const hasScreenReader = obj.traits.includes('@screen_reader');

  if (hasScreenReader) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.3.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: obj.screenReaderProps.semanticStructure ? 'pass' : 'warning',
      severity: obj.screenReaderProps.semanticStructure ? 'info' : 'minor',
      message: obj.screenReaderProps.semanticStructure
        ? `Object "${obj.name}" has semantic structure via @screen_reader`
        : `Object "${obj.name}" has @screen_reader but semantic_structure is not enabled`,
      suggestedFix: obj.screenReaderProps.semanticStructure
        ? undefined
        : 'Set semantic_structure: true in the @screen_reader block',
      missingProperties: obj.screenReaderProps.semanticStructure ? undefined : ['semantic_structure'],
    };
  }

  if (!obj.isInteractive) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.3.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'warning',
      severity: 'minor',
      message: `Visual object "${obj.name}" has no @screen_reader trait for semantic structure`,
      suggestedFix: 'Add @screen_reader { semantic_structure: true } for assistive technology support',
      missingTrait: '@screen_reader',
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.3.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'major',
    message: `Interactive object "${obj.name}" missing @screen_reader for semantic structure`,
    suggestedFix: 'Add @screen_reader { semantic_structure: true, reading_mode: "interactive" }',
    missingTrait: '@screen_reader',
  };
}

/**
 * 1.3.2 Meaningful Sequence: Objects with tab_index should have sequential order.
 */
function checkMeaningfulSequence(
  obj: HoloObject,
  _parsedFile: ParsedHoloFile,
): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  const hasAccessible = obj.traits.includes('@accessible');
  const hasTabIndex = obj.accessibleProps.tabIndex !== undefined;

  if (hasAccessible && hasTabIndex) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.3.2',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has tab_index: ${obj.accessibleProps.tabIndex} for sequencing`,
    };
  }

  if (hasAccessible && !hasTabIndex) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.3.2',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'warning',
      severity: 'minor',
      message: `Interactive object "${obj.name}" has @accessible but no tab_index for sequencing`,
      suggestedFix: 'Add tab_index property to define the focus order',
      missingProperties: ['tab_index'],
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.3.2',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'major',
    message: `Interactive object "${obj.name}" has no @accessible trait for meaningful sequence`,
    suggestedFix: 'Add @accessible { tab_index: N } to define focus order',
    missingTrait: '@accessible',
  };
}

/**
 * 1.4.3 Contrast (Minimum): Objects should have @high_contrast support.
 */
function checkContrastMinimum(obj: HoloObject): AuditCheckResult | null {
  if (!obj.hasVisualContent && !obj.isInteractive) return null;

  if (obj.traits.includes('@high_contrast')) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.4.3',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" supports high contrast mode`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.4.3',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: obj.isInteractive ? 'fail' : 'warning',
    severity: obj.isInteractive ? 'major' : 'minor',
    message: `Object "${obj.name}" has no @high_contrast trait for minimum contrast support`,
    suggestedFix: 'Add @high_contrast { mode: "auto", outline_width: 2 }',
    missingTrait: '@high_contrast',
  };
}

/**
 * 1.4.4 Resize Text: Scene needs global accessibility block with font_scale.
 */
function checkResizeText(
  obj: HoloObject,
  parsedFile: ParsedHoloFile,
): AuditCheckResult | null {
  if (!obj.hasVisualContent) return null;

  if (parsedFile.hasAccessibilityBlock) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.4.4',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Scene has global accessibility block supporting text resize`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.4.4',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'warning',
    severity: 'minor',
    message: `Scene has no global accessibility { font_scale: 1.0 } block for text resize`,
    suggestedFix: 'Add a top-level accessibility { font_scale: 1.0 } block in the composition',
  };
}

/**
 * 1.4.11 Non-text Contrast: UI components need @high_contrast.
 */
function checkNonTextContrast(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  if (obj.traits.includes('@high_contrast')) {
    return {
      id: createAuditCheckId(),
      criterionId: '1.4.11',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Interactive object "${obj.name}" has @high_contrast for non-text contrast`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '1.4.11',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'major',
    message: `Interactive object "${obj.name}" missing @high_contrast for non-text contrast`,
    suggestedFix: 'Add @high_contrast { mode: "auto", outline_width: 2, outline_color: "#FFFF00" }',
    missingTrait: '@high_contrast',
  };
}

/**
 * 2.1.1 Keyboard: Interactive objects need @accessible with keyboard support.
 */
function checkKeyboard(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  const hasAccessible = obj.traits.includes('@accessible');
  const hasKeyboard = obj.accessibleProps.keyboardShortcut !== undefined
    || obj.accessibleProps.tabIndex !== undefined;

  if (hasAccessible && hasKeyboard) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.1.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Interactive object "${obj.name}" is keyboard accessible`,
    };
  }

  if (hasAccessible && !hasKeyboard) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.1.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'warning',
      severity: 'minor',
      message: `Object "${obj.name}" has @accessible but no keyboard_shortcut or tab_index`,
      suggestedFix: 'Add keyboard_shortcut or tab_index for keyboard accessibility',
      missingProperties: ['keyboard_shortcut', 'tab_index'],
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.1.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'critical',
    message: `Interactive object "${obj.name}" has no keyboard access (@accessible trait missing)`,
    suggestedFix: 'Add @accessible { role: "button", tab_index: N, keyboard_shortcut: "key" }',
    missingTrait: '@accessible',
  };
}

/**
 * 2.3.1 Three Flashes: Animated objects need @motion_reduced.
 */
function checkThreeFlashes(obj: HoloObject): AuditCheckResult | null {
  if (!obj.hasAnimation) return null;

  if (obj.traits.includes('@motion_reduced')) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.3.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Animated object "${obj.name}" has @motion_reduced for vestibular safety`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.3.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'critical',
    message: `Animated object "${obj.name}" has no @motion_reduced trait (vestibular risk)`,
    suggestedFix: 'Add @motion_reduced { reduce_animations: true, fade_transitions: true }',
    missingTrait: '@motion_reduced',
  };
}

/**
 * 2.4.1 Bypass Blocks: Scene should have skip-navigation or landmark regions.
 */
function checkBypassBlocks(
  obj: HoloObject,
  parsedFile: ParsedHoloFile,
): AuditCheckResult | null {
  // Only check this for the first interactive object in the file
  const firstInteractive = parsedFile.objects.find((o) => o.isInteractive && o.type !== 'template');
  if (!firstInteractive || obj.name !== firstInteractive.name) return null;

  const hasSkipNav = parsedFile.objects.some(
    (o) =>
      o.accessibleProps.role === 'link'
      && (o.accessibleProps.label?.toLowerCase().includes('skip') ?? false),
  );

  if (hasSkipNav) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.4.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: 'Scene has a skip navigation mechanism',
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.4.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'warning',
    severity: 'major',
    message: 'Scene has no skip navigation mechanism for bypassing repeated content',
    suggestedFix: 'Add a "SkipNav" object with @accessible { role: "link", label: "Skip to main content" }',
  };
}

/**
 * 2.4.3 Focus Order: Interactive objects need tab_index.
 */
function checkFocusOrder(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  if (obj.accessibleProps.tabIndex !== undefined) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.4.3',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has focus order (tab_index: ${obj.accessibleProps.tabIndex})`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.4.3',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: obj.traits.includes('@accessible') ? 'warning' : 'fail',
    severity: 'major',
    message: `Interactive object "${obj.name}" has no tab_index for focus order`,
    suggestedFix: 'Add tab_index property to @accessible trait to define focus order',
    missingProperties: ['tab_index'],
  };
}

/**
 * 2.4.6 Headings and Labels: Interactive objects need descriptive labels.
 */
function checkHeadingsLabels(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  const hasLabel = obj.accessibleProps.label && obj.accessibleProps.label.length > 0;

  if (hasLabel) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.4.6',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has label: "${obj.accessibleProps.label}"`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.4.6',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'major',
    message: `Interactive object "${obj.name}" has no descriptive label`,
    suggestedFix: 'Add label property to @accessible trait: label: "Descriptive label"',
    missingTrait: obj.traits.includes('@accessible') ? undefined : '@accessible',
    missingProperties: obj.traits.includes('@accessible') ? ['label'] : undefined,
  };
}

/**
 * 2.4.7 Focus Visible: Interactive objects need visible focus indicators.
 */
function checkFocusVisible(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  if (obj.accessibleProps.focusVisible === true) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.4.7',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has visible focus indicator`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.4.7',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'major',
    message: `Interactive object "${obj.name}" has no visible focus indicator`,
    suggestedFix: 'Set focus_visible: true in @accessible trait',
    missingTrait: obj.traits.includes('@accessible') ? undefined : '@accessible',
    missingProperties: obj.traits.includes('@accessible') ? ['focus_visible'] : undefined,
  };
}

/**
 * 2.5.1 Pointer Gestures: Scene needs @voice_input for alternative input.
 */
function checkPointerGestures(
  obj: HoloObject,
  parsedFile: ParsedHoloFile,
): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  // Only check once per file (for the first interactive object)
  const firstInteractive = parsedFile.objects.find((o) => o.isInteractive && o.type !== 'template');
  if (!firstInteractive || obj.name !== firstInteractive.name) return null;

  const hasVoiceInput = parsedFile.objects.some((o) => o.traits.includes('@voice_input'));

  if (hasVoiceInput) {
    return {
      id: createAuditCheckId(),
      criterionId: '2.5.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: 'Scene has @voice_input for pointer gesture alternatives',
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '2.5.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'warning',
    severity: 'major',
    message: 'Scene has no @voice_input for alternative pointer gestures',
    suggestedFix: 'Add a VoiceController object with @voice_input for hands-free navigation',
    missingTrait: '@voice_input',
  };
}

/**
 * 3.1.1 Language of Page: Scene needs locale set.
 */
function checkLanguageOfPage(
  obj: HoloObject,
  parsedFile: ParsedHoloFile,
): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  // Only check once per file
  const firstInteractive = parsedFile.objects.find((o) => o.isInteractive && o.type !== 'template');
  if (!firstInteractive || obj.name !== firstInteractive.name) return null;

  if (parsedFile.locale) {
    return {
      id: createAuditCheckId(),
      criterionId: '3.1.1',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Scene language is set to "${parsedFile.locale}"`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '3.1.1',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'warning',
    severity: 'minor',
    message: 'Scene has no locale set in accessibility block',
    suggestedFix: 'Add locale: "en-US" in the accessibility block',
  };
}

/**
 * 3.3.2 Labels or Instructions: Interactive objects need description.
 */
function checkLabelsInstructions(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  const hasDesc = obj.accessibleProps.description && obj.accessibleProps.description.length > 0;

  if (hasDesc) {
    return {
      id: createAuditCheckId(),
      criterionId: '3.3.2',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has instructions/description`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '3.3.2',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'warning',
    severity: 'minor',
    message: `Interactive object "${obj.name}" has no description for user guidance`,
    suggestedFix: 'Add description property to @accessible trait',
    missingProperties: ['description'],
  };
}

/**
 * 4.1.2 Name, Role, Value: Interactive objects need role and label.
 */
function checkNameRoleValue(obj: HoloObject): AuditCheckResult | null {
  if (!obj.isInteractive) return null;

  const hasRole = obj.accessibleProps.role && obj.accessibleProps.role.length > 0;
  const hasLabel = obj.accessibleProps.label && obj.accessibleProps.label.length > 0;

  if (hasRole && hasLabel) {
    return {
      id: createAuditCheckId(),
      criterionId: '4.1.2',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has role="${obj.accessibleProps.role}" and label`,
    };
  }

  const missing: string[] = [];
  if (!hasRole) missing.push('role');
  if (!hasLabel) missing.push('label');

  return {
    id: createAuditCheckId(),
    criterionId: '4.1.2',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'fail',
    severity: 'critical',
    message: `Interactive object "${obj.name}" missing ${missing.join(' and ')} in @accessible`,
    suggestedFix: `Add ${missing.join(' and ')} to @accessible: { role: "button", label: "..." }`,
    missingTrait: obj.traits.includes('@accessible') ? undefined : '@accessible',
    missingProperties: obj.traits.includes('@accessible') ? missing : undefined,
  };
}

/**
 * 4.1.3 Status Messages: Objects with live_region provide status messages.
 */
function checkStatusMessages(obj: HoloObject): AuditCheckResult | null {
  // Only check objects that announce changes or have status-like roles
  const isStatusLike = obj.accessibleProps.role === 'region'
    || obj.accessibleProps.role === 'status'
    || obj.accessibleProps.role === 'log'
    || obj.screenReaderProps.announceChanges === true;

  if (!isStatusLike) return null;

  if (obj.accessibleProps.liveRegion) {
    return {
      id: createAuditCheckId(),
      criterionId: '4.1.3',
      objectName: obj.name,
      lineNumber: obj.lineNumber,
      status: 'pass',
      severity: 'info',
      message: `Object "${obj.name}" has live_region: "${obj.accessibleProps.liveRegion}"`,
    };
  }

  return {
    id: createAuditCheckId(),
    criterionId: '4.1.3',
    objectName: obj.name,
    lineNumber: obj.lineNumber,
    status: 'warning',
    severity: 'minor',
    message: `Status-like object "${obj.name}" has no live_region for status message announcements`,
    suggestedFix: 'Add live_region: "polite" or "assertive" to @accessible trait',
    missingProperties: ['live_region'],
  };
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Calculate the overall compliance score (0-100).
 */
function calculateComplianceScore(checks: AuditCheckResult[]): number {
  if (checks.length === 0) return 100;

  const weights: Record<AuditCheckStatus, number> = {
    pass: 1.0,
    warning: 0.5,
    fail: 0.0,
    not_applicable: 1.0,
  };

  const severityWeights: Record<AuditSeverity, number> = {
    critical: 3.0,
    major: 2.0,
    minor: 1.0,
    info: 0.5,
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const check of checks) {
    const w = severityWeights[check.severity];
    totalWeight += w;
    weightedScore += weights[check.status] * w;
  }

  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 100;
}

/**
 * Build trait coverage map.
 */
function buildTraitCoverage(objects: HoloObject[]): Record<HoloAccessibilityTrait, number> {
  const coverage: Record<string, number> = {};
  for (const trait of ALL_TRAITS) {
    coverage[trait] = 0;
  }

  for (const obj of objects) {
    if (obj.type === 'template') continue;
    for (const trait of obj.traits) {
      if (trait in coverage) {
        coverage[trait]++;
      }
    }
  }

  return coverage as Record<HoloAccessibilityTrait, number>;
}

/**
 * Build per-principle pass rate scores.
 */
function buildPrincipleScores(
  criterionResults: CriterionAuditResult[],
): Record<WCAGPrinciple, number> {
  const principles: WCAGPrinciple[] = ['perceivable', 'operable', 'understandable', 'robust'];
  const scores: Record<string, number> = {};

  for (const principle of principles) {
    const results = criterionResults.filter((cr) => cr.criterion.principle === principle);
    if (results.length === 0) {
      scores[principle] = 100;
      continue;
    }

    const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
    const passedChecks = results.reduce((sum, r) => sum + r.passCount, 0);
    scores[principle] = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
  }

  return scores as Record<WCAGPrinciple, number>;
}

/**
 * Run a full accessibility audit on one or more .holo files.
 */
export function runAccessibilityAudit(
  files: Array<{ fileName: string; filePath: string; source: string }>,
): AccessibilityAuditReport {
  // Parse and resolve all files
  const parsedFiles = files.map((f) => {
    const parsed = parseHoloFile(f.fileName, f.filePath, f.source);
    return resolveTemplates(parsed);
  });

  // Collect all audit checks
  const allChecks: AuditCheckResult[] = [];

  for (const parsedFile of parsedFiles) {
    for (const obj of parsedFile.objects) {
      const objChecks = auditObject(obj, parsedFile);
      allChecks.push(...objChecks);
    }
  }

  // Aggregate by criterion
  const criterionResults: CriterionAuditResult[] = WCAG_CRITERIA.map((criterion) => {
    const checks = allChecks.filter((c) => c.criterionId === criterion.id);
    const passCount = checks.filter((c) => c.status === 'pass').length;
    const failCount = checks.filter((c) => c.status === 'fail').length;
    const warningCount = checks.filter((c) => c.status === 'warning').length;

    let status: AuditCheckStatus;
    if (checks.length === 0) {
      status = 'not_applicable';
    } else if (failCount > 0) {
      status = 'fail';
    } else if (warningCount > 0) {
      status = 'warning';
    } else {
      status = 'pass';
    }

    return {
      criterion,
      status,
      checks,
      passCount,
      failCount,
      warningCount,
    };
  });

  // Build summary
  const allObjects = parsedFiles.flatMap((f) => f.objects.filter((o) => o.type !== 'template'));

  const summary: AuditSummary = {
    totalObjects: allObjects.length,
    interactiveObjects: allObjects.filter((o) => o.isInteractive).length,
    visualObjects: allObjects.filter((o) => o.hasVisualContent).length,
    audioObjects: allObjects.filter((o) => o.hasAudioContent).length,
    animatedObjects: allObjects.filter((o) => o.hasAnimation).length,
    totalCriteria: WCAG_CRITERIA.length,
    criteriaPassed: criterionResults.filter((r) => r.status === 'pass').length,
    criteriaFailed: criterionResults.filter((r) => r.status === 'fail').length,
    criteriaWarning: criterionResults.filter((r) => r.status === 'warning').length,
    criteriaNotApplicable: criterionResults.filter((r) => r.status === 'not_applicable').length,
    totalChecks: allChecks.length,
    passedChecks: allChecks.filter((c) => c.status === 'pass').length,
    failedChecks: allChecks.filter((c) => c.status === 'fail').length,
    warningChecks: allChecks.filter((c) => c.status === 'warning').length,
    traitCoverage: buildTraitCoverage(allObjects),
    principleScores: buildPrincipleScores(criterionResults),
  };

  const complianceScore = calculateComplianceScore(allChecks);

  // Check Level AA pass: no critical/major fails
  const criticalFails = allChecks.filter(
    (c) => c.status === 'fail' && (c.severity === 'critical' || c.severity === 'major'),
  );
  const passesLevelAA = criticalFails.length === 0;

  return {
    id: createReportId(),
    timestamp: Date.now(),
    files: parsedFiles,
    criterionResults,
    allChecks,
    summary,
    complianceScore,
    passesLevelAA,
  };
}
