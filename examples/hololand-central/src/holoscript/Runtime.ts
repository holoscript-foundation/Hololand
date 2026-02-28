/**
 * HoloScript Runtime Integration
 *
 * Executes reactive expressions and event handlers parsed from .holo files
 * Integrates with QuestState and EventBus for state management and events
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useQuestStore } from '../state/QuestStateDB';
import { events } from '../events/EventBus';
import type { SceneConfig, ReactiveBinding, EventBinding } from './Parser';

// ============================================================================
// RUNTIME EXECUTOR
// ============================================================================

export class HoloScriptRuntime {
  /**
   * Evaluate a reactive expression with current state
   */
  static evaluateExpression(expression: string, context: any): any {
    try {
      // Create a safe evaluation context
      const QuestProgress = context.progress || {};
      const state = context.state || {};

      // Simple expression evaluator (can be enhanced with proper parser)
      // This is a basic implementation - in production, use a proper expression parser
      const func = new Function('QuestProgress', 'state', `return ${expression}`);
      return func(QuestProgress, state);
    } catch (error) {
      console.warn(`Error evaluating expression: ${expression}`, error);
      return undefined;
    }
  }

  /**
   * Evaluate a computed property
   */
  static evaluateComputed(expression: string, context: any): any {
    try {
      // For computed properties, we need to handle multi-line code blocks
      const QuestProgress = context.progress || {};
      const state = context.state || {};

      // If it's a code block, execute it
      if (expression.includes('{') && expression.includes('}')) {
        const func = new Function('QuestProgress', 'state', expression);
        return func(QuestProgress, state);
      }

      // Otherwise, treat it as a simple expression
      return this.evaluateExpression(expression, context);
    } catch (error) {
      console.warn(`Error evaluating computed: ${expression}`, error);
      return undefined;
    }
  }

  /**
   * Execute an event handler
   */
  static executeHandler(handler: string, context: any, eventData?: any): void {
    try {
      const QuestProgress = context.progress || {};
      const state = context.state || {};
      const actions = context.actions || {};

      // Create handler function
      const func = new Function('QuestProgress', 'state', 'actions', 'eventData', 'events', handler);
      func(QuestProgress, state, actions, eventData, events);
    } catch (error) {
      console.error(`Error executing handler: ${handler}`, error);
    }
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to use reactive bindings from a parsed scene
 */
export function useReactiveBinding(binding: ReactiveBinding) {
  const progress = useQuestStore(state => state.progress);

  return useMemo(() => {
    return HoloScriptRuntime.evaluateExpression(binding.expression, { progress });
  }, [binding.expression, progress, ...binding.dependencies]);
}

/**
 * Hook to use all reactive bindings for an object
 */
export function useReactiveBindings(objectName: string, scene: SceneConfig) {
  const progress = useQuestStore(state => state.progress);

  // Find all reactive bindings for this object
  const bindings = useMemo(() => {
    const objectBindings: Record<string, any> = {};

    // Check scene-level reactive bindings
    for (const binding of scene.state.reactiveBindings) {
      if (binding.objectName === objectName) {
        objectBindings[binding.property] = binding;
      }
    }

    // Check object-level reactive bindings
    const object = findObject(scene.objects, objectName);
    if (object?.reactive) {
      for (const binding of object.reactive) {
        objectBindings[binding.property] = binding;
      }
    }

    return objectBindings;
  }, [objectName, scene]);

  // Evaluate all bindings
  return useMemo(() => {
    const evaluated: Record<string, any> = {};

    for (const [property, binding] of Object.entries(bindings)) {
      evaluated[property] = HoloScriptRuntime.evaluateExpression(
        (binding as ReactiveBinding).expression,
        { progress }
      );
    }

    return evaluated;
  }, [bindings, progress]);
}

/**
 * Hook to register event handlers for an object
 */
export function useEventBindings(objectName: string, scene: SceneConfig) {
  const progress = useQuestStore(state => state.progress);
  const actions = useQuestStore(state => ({
    unlockPortal: state.unlockPortal,
    increaseSkill: state.increaseSkill,
    startQuest: state.startQuest,
    completeQuest: state.completeQuest,
  }));

  // Find all event bindings for this object
  const bindings = useMemo(() => {
    const objectBindings: EventBinding[] = [];

    // Check scene-level event bindings
    for (const binding of scene.state.eventBindings) {
      if (binding.objectName === objectName) {
        objectBindings.push(binding);
      }
    }

    // Check object-level event bindings
    const object = findObject(scene.objects, objectName);
    if (object?.events) {
      objectBindings.push(...object.events);
    }

    return objectBindings;
  }, [objectName, scene]);

  // Create event handlers
  return useMemo(() => {
    const handlers: Record<string, (eventData?: any) => void> = {};

    for (const binding of bindings) {
      handlers[binding.eventType] = (eventData?: any) => {
        // Execute the handler
        HoloScriptRuntime.executeHandler(binding.handler, { progress, actions }, eventData);

        // Emit event if specified
        if (binding.emitsEvent) {
          events.emit(binding.emitsEvent as any, eventData);
        }
      };
    }

    return handlers;
  }, [bindings, progress, actions]);
}

/**
 * Hook to use the complete scene with reactive state
 */
export function useHoloScene(scene: SceneConfig) {
  const progress = useQuestStore(state => state.progress);

  // Subscribe to relevant events
  useEffect(() => {
    // Set up event listeners based on scene configuration
    const unsubscribers: (() => void)[] = [];

    for (const binding of scene.state.eventBindings) {
      if (binding.emitsEvent) {
        const unsub = events.on(binding.emitsEvent as any, (payload) => {
          console.log(`[HoloScene] Event: ${binding.emitsEvent}`, payload);
        });
        unsubscribers.push(unsub);
      }
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [scene]);

  return {
    scene,
    progress,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Find an object in the scene by name (recursively)
 */
function findObject(objects: any[], name: string): any {
  for (const obj of objects) {
    if (obj.name === name) {
      return obj;
    }

    if (obj.children) {
      const found = findObject(obj.children, name);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * Get all objects from the scene (flattened)
 */
export function getAllObjects(scene: SceneConfig): any[] {
  const result: any[] = [];

  function traverse(objects: any[]) {
    for (const obj of objects) {
      result.push(obj);
      if (obj.children) {
        traverse(obj.children);
      }
    }
  }

  traverse(scene.objects);
  return result;
}

/**
 * Get objects by trait
 */
export function getObjectsByTrait(scene: SceneConfig, trait: string): any[] {
  const allObjects = getAllObjects(scene);
  return allObjects.filter(obj => obj.traits.includes(trait));
}

/**
 * Get portals from the scene
 */
export function getPortals(scene: SceneConfig): any[] {
  return getAllObjects(scene).filter(obj => obj.type === 'portal');
}

/**
 * Get NPCs from the scene
 */
export function getNPCs(scene: SceneConfig): any[] {
  return getAllObjects(scene).filter(obj => obj.type === 'npc');
}
