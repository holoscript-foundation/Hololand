import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

export const DemoShop: React.FC = () => {
  const coffeeRef = useRef<Mesh>(null);
  const steamRef1 = useRef<Mesh>(null);
  const steamRef2 = useRef<Mesh>(null);

  // Animate coffee steam
  useFrame((state) => {
    if (steamRef1.current && steamRef2.current) {
      steamRef1.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime) * 0.2;
      steamRef2.current.position.y = 1.8 + Math.sin(state.clock.elapsedTime + 1) * 0.2;
      steamRef1.current.scale.setScalar(0.3 + Math.sin(state.clock.elapsedTime) * 0.1);
      steamRef2.current.scale.setScalar(0.2 + Math.sin(state.clock.elapsedTime + 1) * 0.1);
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 3, 0]} intensity={0.5} color={0xffa500} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x8b4513} roughness={0.8} />
      </mesh>

      {/* Shop walls */}
      {/* Back wall */}
      <mesh position={[0, 2, -4]} castShadow receiveShadow>
        <boxGeometry args={[12, 4, 0.2]} />
        <meshStandardMaterial color={0xd4a574} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-6, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 4, 8]} />
        <meshStandardMaterial color={0xd4a574} />
      </mesh>

      {/* Right wall */}
      <mesh position={[6, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 4, 8]} />
        <meshStandardMaterial color={0xd4a574} />
      </mesh>

      {/* Counter */}
      <mesh position={[0, 1, -2]} castShadow>
        <boxGeometry args={[6, 1, 2]} />
        <meshStandardMaterial color={0x654321} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Counter top (marble effect) */}
      <mesh position={[0, 1.51, -2]} castShadow>
        <boxGeometry args={[6.2, 0.1, 2.2]} />
        <meshStandardMaterial color={0xe0e0e0} metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Menu board */}
      <mesh position={[0, 3, -3.9]} castShadow>
        <boxGeometry args={[5, 2, 0.1]} />
        <meshStandardMaterial color={0x222222} emissive={0x444444} emissiveIntensity={0.2} />
      </mesh>

      {/* Menu text (simulated with planes) */}
      <mesh position={[0, 3.5, -3.85]}>
        <planeGeometry args={[4.5, 0.3]} />
        <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={0.5} />
      </mesh>

      {/* Coffee machine */}
      <mesh position={[-2, 1.6, -2.8]} castShadow>
        <boxGeometry args={[1, 1, 0.8]} />
        <meshStandardMaterial color={0x333333} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Coffee machine details */}
      <mesh position={[-2, 2.3, -2.5]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
        <meshStandardMaterial color={0x111111} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Coffee cups on counter */}
      {[-2, 0, 2].map((x, i) => (
        <group key={i} position={[x, 1.6, -1.5]}>
          {/* Cup */}
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.12, 0.25, 16]} />
            <meshStandardMaterial color={0xffffff} />
          </mesh>
          {/* Coffee inside */}
          <mesh position={[0, 0.1, 0]} ref={i === 1 ? coffeeRef : undefined}>
            <cylinderGeometry args={[0.14, 0.11, 0.2, 16]} />
            <meshStandardMaterial color={0x3e2723} />
          </mesh>
          {/* Steam */}
          {i === 1 && (
            <>
              <mesh ref={steamRef1} position={[0.05, 1.5, 0]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial
                  color={0xffffff}
                  transparent
                  opacity={0.3}
                  emissive={0xffffff}
                  emissiveIntensity={0.5}
                />
              </mesh>
              <mesh ref={steamRef2} position={[-0.05, 1.8, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial
                  color={0xffffff}
                  transparent
                  opacity={0.2}
                  emissive={0xffffff}
                  emissiveIntensity={0.5}
                />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Bar stools */}
      {[-2, 0, 2].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* Seat */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
            <meshStandardMaterial color={0x8b4513} />
          </mesh>
          {/* Leg */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 16]} />
            <meshStandardMaterial color={0x333333} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Decorative plants */}
      {[-4, 4].map((x, i) => (
        <group key={i} position={[x, 0, -3]}>
          {/* Pot */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.25, 0.6, 16]} />
            <meshStandardMaterial color={0x8b4513} />
          </mesh>
          {/* Plant */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color={0x2d5016} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Overhead lights */}
      {[-2, 0, 2].map((x, i) => (
        <group key={i} position={[x, 3.5, -1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.3, 0.3, 16]} />
            <meshStandardMaterial
              color={0xffffff}
              emissive={0xffa500}
              emissiveIntensity={0.5}
            />
          </mesh>
          <pointLight position={[0, -0.3, 0]} intensity={0.8} color={0xffa500} distance={5} />
        </group>
      ))}

      {/* Window (simulated) */}
      <mesh position={[5.9, 2.5, -1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3, 2.5]} />
        <meshStandardMaterial
          color={0x87ceeb}
          transparent
          opacity={0.3}
          emissive={0x87ceeb}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Sign above door */}
      <mesh position={[0, 3.5, 3.9]}>
        <boxGeometry args={[3, 0.5, 0.1]} />
        <meshStandardMaterial
          color={0xd4a574}
          emissive={0xffa500}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* "Open" sign */}
      <mesh position={[0, 2, 3.9]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshStandardMaterial
          color={0x00ff00}
          emissive={0x00ff00}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Ambient fog */}
      <fog attach="fog" args={[0x8b4513, 10, 25]} />
    </>
  );
};
