import React, { useRef, useState } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Portal } from '../components/Portal';
import { ThemedEnvironment } from '../components/ThemedEnvironment';
import { getTheme, getNextTheme } from '../themes/themes';
import { Theme } from '../themes/types';
import { EasterEggsProximityLayer } from '../easter-eggs/EasterEggsProximityLayer';
import { usePlayerPositionGetter } from '../easter-eggs/usePlayerPosition';

interface ThemedMainPlazaProps {
  onPortalClick: (worldName: string) => void;
  currentTheme?: string;
  onThemeChange?: (themeName: string) => void;
}

export const ThemedMainPlaza: React.FC<ThemedMainPlazaProps> = ({
  onPortalClick,
  currentTheme = 'cyberpunk',
  onThemeChange,
}) => {
  const platformRef = useRef<Mesh>(null);
  const [theme, setTheme] = useState<Theme>(getTheme(currentTheme));
  const getPlayerPosition = usePlayerPositionGetter();

  // Subtle platform animation
  useFrame((state) => {
    if (platformRef.current) {
      platformRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const handleThemeChange = () => {
    const nextTheme = getNextTheme(theme.name);
    setTheme(nextTheme);
    if (onThemeChange) {
      onThemeChange(nextTheme.name);
    }
  };

  return (
    <>
      {/* Themed Environment (lighting, buildings, decorations, fog) */}
      <ThemedEnvironment theme={theme} />

      {/* Central platform - consistent across all themes */}
      <mesh ref={platformRef} position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[15, 15, 0.5, 32]} />
        <meshStandardMaterial
          color={theme.colors.secondary}
          metalness={0.7}
          roughness={0.3}
          emissive={theme.colors.emissive}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Platform edge glow */}
      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[15, 0.2, 16, 50]} />
        <meshStandardMaterial
          color={theme.colors.primary}
          emissive={theme.colors.primary}
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Central pillar with info */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 5, 32]} />
        <meshStandardMaterial
          color={theme.colors.secondary}
          metalness={0.8}
          roughness={0.2}
          emissive={theme.colors.emissive}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Info sphere on top of pillar */}
      <mesh position={[0, 5.5, 0]} castShadow>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color={theme.colors.primary}
          emissive={theme.colors.primary}
          emissiveIntensity={0.5}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Portal 1: Demo Shop */}
      <Portal
        position={[8, 2, 0]}
        color={0xf093fb}
        label="Demo Shop"
        onClick={() => onPortalClick('shop')}
      />

      {/* Portal 2: Social Lounge */}
      <Portal
        position={[-8, 2, 0]}
        color={0x667eea}
        label="Social Lounge"
        onClick={() => onPortalClick('social')}
      />

      {/* Portal 3: Physics Playground */}
      <Portal
        position={[0, 2, -8]}
        color={0x4facfe}
        label="Physics Playground"
        onClick={() => onPortalClick('physics')}
      />

      {/* Portal 4: Gallery (coming soon) */}
      <Portal
        position={[0, 2, 8]}
        color={0x43e97b}
        label="Art Gallery"
        onClick={() => onPortalClick('gallery')}
      />

      {/* Portal 5: Infinity Shop (coming soon) */}
      <Portal
        position={[6, 2, 6]}
        color={0xffd700}
        label="Infinity Shop"
        onClick={() => onPortalClick('infinity-shop')}
      />

      {/* Portal 6: Hololand Casino */}
      <Portal
        position={[-6, 2, -6]}
        color={0xff00ff}
        label="Casino"
        onClick={() => onPortalClick('casino')}
      />

      {/* Portal 7: Builder Shop */}
      <Portal
        position={[6, 2, -6]}
        color={0x4488ff}
        label="Builder Shop"
        onClick={() => onPortalClick('builder-shop')}
      />

      {/* Theme Changer Button (floating cube near pillar) */}
      <group position={[-6, 2, 6]} onClick={handleThemeChange}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial
            color={theme.colors.accent1}
            emissive={theme.colors.accent1}
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Theme icon sphere */}
        <mesh position={[0, 0, 0.8]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={theme.colors.accent2}
            emissive={theme.colors.accent2}
            emissiveIntensity={0.6}
            metalness={1}
            roughness={0}
          />
        </mesh>
      </group>

      {/* Decorative floating cubes orbiting platform */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 3 + Math.sin(i) * 2;

        return (
          <mesh
            key={i}
            position={[x, height, z]}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={theme.colors.primary}
              emissive={theme.colors.primary}
              emissiveIntensity={0.2}
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      })}

      {/* Easter Eggs Proximity Layer */}
      <EasterEggsProximityLayer
        zone="welcome_plaza"
        userId="demo-user"
        themeName={theme.name}
        getPlayerPosition={getPlayerPosition}
        debug={false}
      />
    </>
  );
};
