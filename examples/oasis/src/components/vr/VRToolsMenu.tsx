import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { EntityType } from '@/services/worldSpawnerService';

export type VRTool = 'spawn' | 'delete' | 'move' | 'scale' | 'rotate';

interface VRToolsMenuProps {
  activeTool: VRTool;
  onToolSelect: (tool: VRTool) => void;
  selectedEntityType: EntityType;
  onEntityTypeSelect: (type: EntityType) => void;
  position?: [number, number, number];
  followCamera?: boolean;
}

const TOOLS: { id: VRTool; label: string; icon: string; color: string }[] = [
  { id: 'spawn', label: 'Spawn', icon: '+', color: '#7CB342' },
  { id: 'delete', label: 'Delete', icon: '×', color: '#E53935' },
  { id: 'move', label: 'Move', icon: '↔', color: '#5DADE2' },
  { id: 'scale', label: 'Scale', icon: '⤢', color: '#FFD54F' },
  { id: 'rotate', label: 'Rotate', icon: '↻', color: '#D2691E' },
];

const ENTITY_TYPES: { type: EntityType; label: string }[] = [
  { type: 'box', label: 'Box' },
  { type: 'sphere', label: 'Sphere' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'tree', label: 'Tree' },
  { type: 'rock', label: 'Rock' },
  { type: 'fountain', label: 'Fountain' },
  { type: 'bench', label: 'Bench' },
  { type: 'lamp', label: 'Lamp' },
  { type: 'building', label: 'Building' },
];

/**
 * VR Tools Menu - floating radial menu for god mode tools
 */
export default function VRToolsMenu({
  activeTool,
  onToolSelect,
  selectedEntityType,
  onEntityTypeSelect,
  position = [1.5, 1.5, -2],
  followCamera = true,
}: VRToolsMenuProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [showEntityPalette, setShowEntityPalette] = useState(false);
  const targetPositionRef = useRef(new THREE.Vector3(...position));

  // Smoothly follow camera
  useFrame(({ camera }) => {
    if (!groupRef.current || !followCamera) return;

    // Position to the right of the camera
    const offset = new THREE.Vector3(0.8, 0.2, -1.5);
    offset.applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(offset);

    groupRef.current.position.lerp(targetPositionRef.current, 0.05);
    groupRef.current.lookAt(camera.position);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Main tools panel */}
      <RoundedBox args={[0.5, 0.9, 0.02]} radius={0.03} smoothness={4}>
        <meshStandardMaterial color="#FFF8E7" transparent opacity={0.95} roughness={0.3} />
      </RoundedBox>

      {/* Header */}
      <Text position={[0, 0.38, 0.02]} fontSize={0.05} color="#3D2914" anchorX="center">
        Tools
      </Text>

      {/* Tool buttons */}
      {TOOLS.map((tool, i) => (
        <ToolButton
          key={tool.id}
          position={[0, 0.25 - i * 0.14, 0.02]}
          tool={tool}
          isActive={activeTool === tool.id}
          onClick={() => {
            onToolSelect(tool.id);
            if (tool.id === 'spawn') {
              setShowEntityPalette(!showEntityPalette);
            } else {
              setShowEntityPalette(false);
            }
          }}
        />
      ))}

      {/* Entity palette (shown when spawn tool is active) */}
      {showEntityPalette && activeTool === 'spawn' && (
        <group position={[-0.6, 0, 0]}>
          <EntityPalette
            selectedType={selectedEntityType}
            onSelect={(type) => {
              onEntityTypeSelect(type);
            }}
          />
        </group>
      )}
    </group>
  );
}

interface ToolButtonProps {
  position: [number, number, number];
  tool: (typeof TOOLS)[0];
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ position, tool, isActive, onClick }: ToolButtonProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = hovered ? 1.1 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <RoundedBox args={[0.4, 0.1, 0.01]} radius={0.02} smoothness={4}>
          <meshStandardMaterial
            color={isActive ? tool.color : '#F5E6D3'}
            emissive={isActive ? tool.color : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
          />
        </RoundedBox>
      </mesh>

      {/* Icon */}
      <Text
        position={[-0.12, 0, 0.015]}
        fontSize={0.05}
        color={isActive ? '#FFFFFF' : tool.color}
        anchorX="center"
      >
        {tool.icon}
      </Text>

      {/* Label */}
      <Text
        position={[0.05, 0, 0.015]}
        fontSize={0.03}
        color={isActive ? '#FFFFFF' : '#3D2914'}
        anchorX="left"
      >
        {tool.label}
      </Text>
    </group>
  );
}

interface EntityPaletteProps {
  selectedType: EntityType;
  onSelect: (type: EntityType) => void;
}

function EntityPalette({ selectedType, onSelect }: EntityPaletteProps) {
  return (
    <group>
      {/* Background */}
      <RoundedBox args={[0.45, 1.2, 0.02]} radius={0.03} smoothness={4}>
        <meshStandardMaterial color="#FFF8E7" transparent opacity={0.95} roughness={0.3} />
      </RoundedBox>

      {/* Header */}
      <Text position={[0, 0.52, 0.02]} fontSize={0.04} color="#3D2914">
        Objects
      </Text>

      {/* Entity type buttons */}
      {ENTITY_TYPES.map((entity, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = col === 0 ? -0.1 : 0.1;
        const y = 0.38 - row * 0.12;

        return (
          <EntityTypeButton
            key={entity.type}
            position={[x, y, 0.02]}
            type={entity.type}
            label={entity.label}
            isSelected={selectedType === entity.type}
            onClick={() => onSelect(entity.type)}
          />
        );
      })}
    </group>
  );
}

interface EntityTypeButtonProps {
  position: [number, number, number];
  type: EntityType;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function EntityTypeButton({ position, type, label, isSelected, onClick }: EntityTypeButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <RoundedBox args={[0.18, 0.1, 0.01]} radius={0.015} smoothness={4}>
          <meshStandardMaterial color={isSelected ? '#7CB342' : hovered ? '#9CCC65' : '#F5E6D3'} />
        </RoundedBox>
      </mesh>

      <Text
        position={[0, 0, 0.015]}
        fontSize={0.025}
        color={isSelected ? '#FFFFFF' : '#3D2914'}
        anchorX="center"
      >
        {label}
      </Text>
    </group>
  );
}

/**
 * Crosshair/pointer for aiming in VR
 */
export function VRCrosshair({ visible = true }: { visible?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!meshRef.current || !visible) return;

    // Position crosshair in front of camera
    const direction = new THREE.Vector3(0, 0, -3);
    direction.applyQuaternion(camera.quaternion);
    meshRef.current.position.copy(camera.position).add(direction);
    meshRef.current.lookAt(camera.position);
  });

  if (!visible) return null;

  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[0.01, 0.015, 16]} />
      <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}
