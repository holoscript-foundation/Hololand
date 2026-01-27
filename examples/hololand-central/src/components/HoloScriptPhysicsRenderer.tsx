import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { HoloScriptPlusParser, HoloScriptPlusRuntimeImpl } from '@holoscript/core';
import { PhysicsWorld, TraitSystem, GrabbableTrait, ThrowableTrait } from '@holoscript/runtime';
import { ReactHoloRenderer, HoloEntityData } from '../services/HoloPlusRendererBridge';
import { Mesh, Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface HoloScriptPhysicsRendererProps {
  scriptContent: string;
}

export const HoloScriptPhysicsRenderer: React.FC<HoloScriptPhysicsRendererProps> = ({ scriptContent }) => {
  const [entities, setEntities] = useState<HoloEntityData[]>([]);
  const meshRefs = useRef<Map<string, Mesh>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  // Physics & Runtime
  const physicsWorld = useMemo(() => new PhysicsWorld({ gravity: [0, -9.82, 0] }), []);
  const traitSystem = useMemo(() => {
      const ts = new TraitSystem(physicsWorld);
      ts.register(GrabbableTrait);
      ts.register(ThrowableTrait);
      return ts;
  }, [physicsWorld]);
  
  const rendererBridge = useMemo(() => new ReactHoloRenderer(setEntities), []);
  const runtimeRef = useRef<HoloScriptPlusRuntimeImpl | null>(null);

  // Parse & Mount Runtime
  useEffect(() => {
      const parser = new HoloScriptPlusParser({ enableVRTraits: true });
      const result = parser.parse(scriptContent);
      
      if (!result.success) {
          setError(result.errors.map(e => e.message).join('\n'));
          return;
      }
      setError(null);

      const runtime = new HoloScriptPlusRuntimeImpl(result.ast, {
          renderer: rendererBridge,
          vrEnabled: true
      });
      
      runtime.mount(null);
      runtimeRef.current = runtime;
      
      return () => {
          runtime.unmount();
          // physicsWorld.dispose(); // PhysicsWorld doesn't have dispose yet, but GC should handle it
      };
  }, [scriptContent, rendererBridge, physicsWorld]);

  // Sync Entities to Physics
  useEffect(() => {
      entities.forEach(ent => {
          if (!ent.id) return;
          const mesh = meshRefs.current.get(ent.id);
          
          if (mesh) {
              // Add to physics if not exists
              // We check if body exists by trying to remove it? No, hacky.
              // We need hasBody. PhysicsWorld didn't show hasBody in the view above.
              // It has `bodies` map which is private (but maybe accessible in JS?)
              // Or we track it ourselves.
              
              // Simplistic tracking:
              // Re-adding same body might be bad.
              // PhysicsWorld.addBody adds to map. If id exists, it overwrites?
              // The code in PhysicsWorld.ts: this.bodies.set(id, body);
              // It creates NEW body every time.
              
              // We should only add if not present.
              // Since PhysicsWorld doesn't expose hasBody, we can try to rely on state.
              // BUT entities array changes ref on update.
              // We use a separate Set to track added IDs?
          }
      });
  }, [entities, physicsWorld]);
  
  // Track added bodies manually since PhysicsWorld doesn't expose public check
  const addedBodies = useRef<Set<string>>(new Set());

  useEffect(() => {
      entities.forEach(ent => {
          if (!ent.id) return;
          if (addedBodies.current.has(ent.id)) return;
          
          const mesh = meshRefs.current.get(ent.id);
          if (mesh) {
              const type = ent.traits?.includes('static') || ent.type === 'plane' ? 'static' : 'dynamic';
              const shapeType = ent.type === 'plane' ? 'plane' : ent.type === 'sphere' ? 'sphere' : 'box';
              
              const body = physicsWorld.addBody(ent.id, mesh, shapeType, type === 'static' ? 0 : 1);
              
              // If grabbable, we might need extra setup? TraitSystem handles it via runtime events.
              
              addedBodies.current.add(ent.id);
          }
      });
  }, [entities, physicsWorld]);

  // Game Loop
  useFrame((state, delta) => {
      // Step Physics
      physicsWorld.step(delta);
      
      // Update Runtime traits (if using TraitSystem updates)
      // runtimeRef.current?.update(delta); // Runtime handles its own update loop via requestAnimationFrame?
      // HoloScriptPlusRuntimeImpl has startUpdateLoop() internal.
      // But we can also drive key updates here if needed.
  });

  if (error) return <Text color="red">{error}</Text>;

  return (
      <group>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          
          {entities.map(ent => {
              const pos = ent.position || [0,0,0];
              const scale = ent.scale || [1,1,1];
              return (
                  <mesh 
                      key={ent.id} 
                      ref={el => { if (el && ent.id) meshRefs.current.set(ent.id, el); }}
                      position={new Vector3(pos[0], pos[1], pos[2])}
                      scale={new Vector3(scale[0], scale[1], scale[2])}
                  >
                      {ent.type === 'sphere' ? <sphereGeometry args={[0.5, 32, 32]} /> : 
                       ent.type === 'plane' ? <planeGeometry args={[10, 10]} /> :
                       <boxGeometry args={[1, 1, 1]} />}
                      <meshStandardMaterial color={ent.color || 'orange'} />
                  </mesh>
              );
          })}
      </group>
  );
};
