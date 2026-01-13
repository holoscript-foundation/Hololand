import React, { useState, useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

interface FallingObject {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: number;
  size: number;
  type: 'sphere' | 'box';
}

export const PhysicsPlayground: React.FC = () => {
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const objectIdRef = useRef(0);
  const platformRef = useRef<Mesh>(null);

  // Simple physics simulation
  useFrame(() => {
    setObjects((prevObjects) => {
      return prevObjects
        .map((obj) => {
          // Apply gravity
          const newVelocity: [number, number, number] = [
            obj.velocity[0],
            obj.velocity[1] - 0.01,
            obj.velocity[2],
          ];

          // Update position
          const newPosition: [number, number, number] = [
            obj.position[0] + newVelocity[0],
            obj.position[1] + newVelocity[1],
            obj.position[2] + newVelocity[2],
          ];

          // Bounce on ground
          if (newPosition[1] <= obj.size / 2) {
            newPosition[1] = obj.size / 2;
            newVelocity[1] = -newVelocity[1] * 0.7; // Bounce with energy loss
          }

          // Bounce on walls
          const wallLimit = 8;
          if (Math.abs(newPosition[0]) > wallLimit) {
            newPosition[0] = Math.sign(newPosition[0]) * wallLimit;
            newVelocity[0] = -newVelocity[0] * 0.5;
          }
          if (Math.abs(newPosition[2]) > wallLimit) {
            newPosition[2] = Math.sign(newPosition[2]) * wallLimit;
            newVelocity[2] = -newVelocity[2] * 0.5;
          }

          // Remove objects that fall too low or are nearly stopped
          if (newPosition[1] < -5 || (Math.abs(newVelocity[1]) < 0.01 && newPosition[1] <= obj.size / 2 + 0.01)) {
            return null;
          }

          return {
            ...obj,
            position: newPosition,
            velocity: newVelocity,
          };
        })
        .filter((obj): obj is FallingObject => obj !== null);
    });
  });

  // Spawn new object
  const spawnObject = (type: 'sphere' | 'box') => {
    const newObject: FallingObject = {
      id: objectIdRef.current++,
      position: [
        (Math.random() - 0.5) * 4,
        8 + Math.random() * 2,
        (Math.random() - 0.5) * 4,
      ],
      velocity: [
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1,
      ],
      color: Math.random() * 0xffffff,
      size: 0.5 + Math.random() * 0.5,
      type,
    };
    setObjects((prev) => [...prev, newObject]);
  };

  // Animate platform
  useFrame((state) => {
    if (platformRef.current) {
      platformRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} color={0x4facfe} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.7} />
      </mesh>

      {/* Grid pattern on ground */}
      {[...Array(9)].map((_, i) => {
        const pos = (i - 4) * 2;
        return (
          <React.Fragment key={i}>
            {/* Horizontal lines */}
            <mesh position={[pos, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.05, 20]} />
              <meshStandardMaterial color={0x667eea} emissive={0x667eea} emissiveIntensity={0.2} />
            </mesh>
            {/* Vertical lines */}
            <mesh position={[0, 0.01, pos]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[20, 0.05]} />
              <meshStandardMaterial color={0x667eea} emissive={0x667eea} emissiveIntensity={0.2} />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Central platform */}
      <mesh ref={platformRef} position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[4, 4, 1, 32]} />
        <meshStandardMaterial
          color={0x0f3460}
          metalness={0.6}
          roughness={0.4}
          emissive={0x4facfe}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Spawn zones */}
      {[
        { pos: [-6, 1.5, -6], color: 0xff6b6b, label: 'Spheres' },
        { pos: [6, 1.5, -6], color: 0x4facfe, label: 'Boxes' },
      ].map((zone, i) => (
        <group key={i} position={zone.pos as [number, number, number]}>
          {/* Platform */}
          <mesh position={[0, -0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 2]} />
            <meshStandardMaterial
              color={zone.color}
              emissive={zone.color}
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
          {/* Interactive button */}
          <mesh
            position={[0, 0.5, 0]}
            onClick={() => spawnObject(i === 0 ? 'sphere' : 'box')}
            castShadow
          >
            <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
            <meshStandardMaterial
              color={zone.color}
              emissive={zone.color}
              emissiveIntensity={0.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* Glow effect */}
          <pointLight position={[0, 0.5, 0]} intensity={0.5} color={zone.color} distance={5} />
        </group>
      ))}

      {/* Falling objects */}
      {objects.map((obj) => (
        <mesh key={obj.id} position={obj.position} castShadow>
          {obj.type === 'sphere' ? (
            <sphereGeometry args={[obj.size, 16, 16]} />
          ) : (
            <boxGeometry args={[obj.size, obj.size, obj.size]} />
          )}
          <meshStandardMaterial
            color={obj.color}
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Decorative floating rings */}
      {[...Array(4)].map((_, i) => {
        const height = 5 + i * 2;
        const radius = 6 + i;
        return (
          <group key={i} position={[0, height, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius, 0.1, 16, 50]} />
              <meshStandardMaterial
                color={0x4facfe}
                emissive={0x4facfe}
                emissiveIntensity={0.3}
                transparent
                opacity={0.3 - i * 0.05}
              />
            </mesh>
          </group>
        );
      })}

      {/* Walls (invisible boundaries) */}
      {[
        { pos: [10, 5, 0], rot: [0, Math.PI / 2, 0], size: [20, 10, 0.2] },
        { pos: [-10, 5, 0], rot: [0, Math.PI / 2, 0], size: [20, 10, 0.2] },
        { pos: [0, 5, 10], rot: [0, 0, 0], size: [20, 10, 0.2] },
        { pos: [0, 5, -10], rot: [0, 0, 0], size: [20, 10, 0.2] },
      ].map((wall, i) => (
        <mesh
          key={i}
          position={wall.pos as [number, number, number]}
          rotation={wall.rot as [number, number, number]}
        >
          <boxGeometry args={wall.size as [number, number, number]} />
          <meshStandardMaterial
            color={0x667eea}
            transparent
            opacity={0.1}
            emissive={0x667eea}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}

      {/* Particle effects */}
      {[...Array(30)].map((_, i) => {
        const angle = (i / 30) * Math.PI * 2;
        const radius = 12 + Math.random() * 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.random() * 10 + 2;

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color={0x4facfe}
              emissive={0x4facfe}
              emissiveIntensity={Math.random() * 0.5 + 0.5}
            />
          </mesh>
        );
      })}

      {/* Fog */}
      <fog attach="fog" args={[0x0a0a0a, 20, 40]} />
    </>
  );
};
