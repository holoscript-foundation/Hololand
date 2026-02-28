/**
 * Scene Renderer
 *
 * Renders all objects from a parsed HoloScript scene
 * Handles portals, NPCs, meshes, and reactive properties
 */

import { useMemo } from 'react';
import type { SceneConfig } from '../holoscript';
import { Portal } from './objects/Portal';
import { NPC } from './objects/NPC';
import { SceneMesh } from './objects/SceneMesh';

interface SceneRendererProps {
  scene: SceneConfig;
  debug?: boolean;
}

export function SceneRenderer({ scene, debug = false }: SceneRendererProps) {
  // Categorize objects by type
  const categorized = useMemo(() => {
    const portals: any[] = [];
    const npcs: any[] = [];
    const meshes: any[] = [];
    const others: any[] = [];

    function categorize(objects: any[]) {
      for (const obj of objects) {
        switch (obj.type) {
          case 'portal':
            portals.push(obj);
            break;
          case 'npc':
            npcs.push(obj);
            break;
          case 'mesh':
            meshes.push(obj);
            break;
          default:
            others.push(obj);
        }

        // Recursively categorize children
        if (obj.children) {
          categorize(obj.children);
        }
      }
    }

    categorize(scene.objects);

    return { portals, npcs, meshes, others };
  }, [scene.objects]);

  if (debug) {
    console.log('[SceneRenderer] Rendering scene:', {
      name: scene.name,
      portals: categorized.portals.length,
      npcs: categorized.npcs.length,
      meshes: categorized.meshes.length,
      others: categorized.others.length,
    });
  }

  return (
    <group name="scene-root">
      {/* Render Portals */}
      {categorized.portals.map(portal => (
        <Portal
          key={portal.name}
          object={portal}
          scene={scene}
          debug={debug}
        />
      ))}

      {/* Render NPCs */}
      {categorized.npcs.map(npc => (
        <NPC
          key={npc.name}
          object={npc}
          scene={scene}
          debug={debug}
        />
      ))}

      {/* Render Regular Meshes */}
      {categorized.meshes.map(mesh => (
        <SceneMesh
          key={mesh.name}
          object={mesh}
          scene={scene}
          debug={debug}
        />
      ))}

      {/* Render Other Objects */}
      {categorized.others.map(obj => (
        <SceneMesh
          key={obj.name}
          object={obj}
          scene={scene}
          debug={debug}
        />
      ))}
    </group>
  );
}
