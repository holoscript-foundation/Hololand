import React from 'react';
import { Theme, ThemeBuilding } from '../themes/types';

interface ThemedEnvironmentProps {
  theme: Theme;
}

export const ThemedEnvironment: React.FC<ThemedEnvironmentProps> = ({ theme }) => {
  const renderBuilding = (building: ThemeBuilding, index: number) => {
    const {
      type,
      position,
      size,
      color,
      metalness = 0.5,
      roughness = 0.5,
      emissive,
      emissiveIntensity = 0,
      rotation,
    } = building;

    const materialProps = {
      color,
      metalness,
      roughness,
      ...(emissive && { emissive, emissiveIntensity }),
    };

    switch (type) {
      case 'box':
        return (
          <mesh key={`building-${index}`} position={position} rotation={rotation} castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        );
      case 'cylinder':
        return (
          <mesh key={`building-${index}`} position={position} rotation={rotation} castShadow>
            <cylinderGeometry args={size} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        );
      case 'sphere':
        return (
          <mesh key={`building-${index}`} position={position} castShadow>
            <sphereGeometry args={size} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        );
      default:
        return null;
    }
  };

  const renderParticles = (decoration: any, index: number) => {
    if (decoration.type !== 'particle') return null;

    const count = decoration.count || 50;
    const spread = 80;
    const heightRange = 30;
    const heightOffset = decoration.position[1];

    return [...Array(count)].map((_, i) => {
      const x = (Math.random() - 0.5) * spread;
      const y = Math.random() * heightRange + heightOffset;
      const z = (Math.random() - 0.5) * spread;

      return (
        <mesh key={`particle-${index}-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[decoration.size || 0.1, 8, 8]} />
          <meshStandardMaterial
            color={decoration.color || 0xffffff}
            emissive={decoration.color || 0xffffff}
            emissiveIntensity={Math.random() * 0.5 + 0.5}
          />
        </mesh>
      );
    });
  };

  return (
    <>
      {/* Lighting based on theme */}
      <ambientLight intensity={theme.lighting.ambientIntensity} />

      <directionalLight
        position={[10, 10, 5]}
        intensity={theme.lighting.mainLightIntensity}
        color={theme.lighting.mainLightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <directionalLight position={[-5, 5, -5]} intensity={theme.lighting.mainLightIntensity * 0.3} />

      {/* Point lights */}
      {theme.lighting.pointLights.map((light, i) => (
        <pointLight
          key={`light-${i}`}
          position={light.position}
          intensity={light.intensity}
          color={light.color}
          distance={light.distance}
        />
      ))}

      {/* Ground/Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color={theme.colors.floor}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Buildings */}
      {theme.buildings.map((building, i) => renderBuilding(building, i))}

      {/* Decorations */}
      {theme.decorations.map((decoration, i) => renderParticles(decoration, i))}

      {/* Fog */}
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
    </>
  );
};
