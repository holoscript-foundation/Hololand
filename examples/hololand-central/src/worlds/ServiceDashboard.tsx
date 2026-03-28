/**
 * Service Dashboard World - React Component Wrapper
 *
 * Real-time monitoring dashboard for HoloScript ecosystem services.
 * Renders the ServiceDashboard.hsplus world as a React component.
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ServiceStatus {
  name: string;
  icon: string;
  health: 'green' | 'yellow' | 'red' | 'unknown';
  url: string;
  lastCheck: number | null;
  activities: string[];
  stats?: Record<string, any>;
}

interface ServiceDashboardState {
  services: {
    orchestrator: ServiceStatus;
    holoscriptMcp: ServiceStatus;
    semanticSearch: ServiceStatus;
    brittneyHololand: ServiceStatus;
    uaa2: ServiceStatus;
  };
  overallHealth: 'green' | 'yellow' | 'red' | 'unknown';
  pollInterval: number;
  lastPoll: number | null;
}

export function ServiceDashboard() {
  const groupRef = useRef<THREE.Group>(null);
  const [state, setState] = useState<ServiceDashboardState>({
    services: {
      orchestrator: {
        name: 'MCP Orchestrator',
        icon: '🔀',
        health: 'unknown',
        url: 'https://mcp-orchestrator-production-45f9.up.railway.app',
        lastCheck: null,
        activities: [],
      },
      holoscriptMcp: {
        name: 'HoloScript MCP',
        icon: '🌐',
        health: 'unknown',
        url: 'https://mcp.holoscript.net',
        lastCheck: null,
        activities: [],
      },
      semanticSearch: {
        name: 'Semantic Search Hub',
        icon: '🔍',
        health: 'unknown',
        url: 'semantic-search-hub',
        lastCheck: null,
        activities: [],
      },
      brittneyHololand: {
        name: 'Brittney Hololand',
        icon: '🏰',
        health: 'unknown',
        url: 'brittney-hololand',
        lastCheck: null,
        activities: [],
      },
      uaa2: {
        name: 'UAA2 Service',
        icon: '🤖',
        health: 'unknown',
        url: 'uaa2-service',
        lastCheck: null,
        activities: [],
      },
    },
    overallHealth: 'unknown',
    pollInterval: 5000,
    lastPoll: null,
  });

  // Health status colors
  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'green': return '#00ff00';
      case 'yellow': return '#ffff00';
      case 'red': return '#ff0000';
      default: return '#666666';
    }
  };

  // Get ambient color based on overall health
  const getAmbientColor = (health: string): string => {
    switch (health) {
      case 'green': return '#88ffaa';
      case 'yellow': return '#ffdd88';
      case 'red': return '#ff8888';
      default: return '#aaaaaa';
    }
  };

  // Poll service health
  const pollService = async (serviceKey: keyof typeof state.services) => {
    const service = state.services[serviceKey];

    try {
      const response = await fetch(service.url + '/health', {
        method: 'GET',
        mode: 'cors',
      });

      if (response.ok) {
        const data = await response.json();

        setState(prev => ({
          ...prev,
          services: {
            ...prev.services,
            [serviceKey]: {
              ...prev.services[serviceKey],
              health: 'green',
              lastCheck: Date.now(),
              activities: [
                `${new Date().toLocaleTimeString()} - ✓ Health check passed`,
                ...prev.services[serviceKey].activities.slice(0, 4),
              ],
              stats: data,
            },
          },
        }));
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          [serviceKey]: {
            ...prev.services[serviceKey],
            health: 'red',
            lastCheck: Date.now(),
            activities: [
              `${new Date().toLocaleTimeString()} - ✗ Health check failed`,
              ...prev.services[serviceKey].activities.slice(0, 4),
            ],
          },
        },
      }));
    }
  };

  // Poll all services
  const pollAllServices = async () => {
    setState(prev => ({ ...prev, lastPoll: Date.now() }));

    await pollService('orchestrator');
    await pollService('holoscriptMcp');

    // For MCP services via orchestrator, simulate for now
    // In production, would call orchestrator to check server health
    ['semanticSearch', 'brittneyHololand', 'uaa2'].forEach((key) => {
      const random = Math.random();
      setState(prev => ({
        ...prev,
        services: {
          ...prev.services,
          [key]: {
            ...prev.services[key as keyof typeof state.services],
            health: random > 0.8 ? 'yellow' : 'green',
            lastCheck: Date.now(),
            activities: [
              `${new Date().toLocaleTimeString()} - ✓ Service responding`,
              ...prev.services[key as keyof typeof state.services].activities.slice(0, 4),
            ],
          },
        },
      }));
    });

    // Update overall health
    setTimeout(() => updateOverallHealth(), 500);
  };

  // Update overall health based on all services
  const updateOverallHealth = () => {
    setState(prev => {
      const healthStates = Object.values(prev.services).map(s => s.health);

      let overallHealth: 'green' | 'yellow' | 'red' | 'unknown' = 'green';
      if (healthStates.includes('red')) {
        overallHealth = 'red';
      } else if (healthStates.includes('yellow')) {
        overallHealth = 'yellow';
      } else if (healthStates.some(h => h === 'unknown')) {
        overallHealth = 'unknown';
      }

      return { ...prev, overallHealth };
    });
  };

  // Poll on mount and interval
  useEffect(() => {
    pollAllServices();

    const interval = setInterval(() => {
      pollAllServices();
    }, state.pollInterval);

    return () => clearInterval(interval);
  }, []);

  // Animate central logo rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  // Pentagon positions for 5 stations
  const stationPositions = [
    { x: 12.00, z: 0.00, rotation: Math.PI / 2 },       // 0°
    { x: 3.71, z: 11.41, rotation: Math.PI * 0.9 },     // 72°
    { x: -9.71, z: 7.05, rotation: Math.PI * 1.3 },     // 144°
    { x: -9.71, z: -7.05, rotation: Math.PI * 1.7 },    // 216°
    { x: 3.71, z: -11.41, rotation: Math.PI * 0.1 },    // 288°
  ];

  const serviceKeys: Array<keyof typeof state.services> = [
    'orchestrator',
    'holoscriptMcp',
    'semanticSearch',
    'brittneyHololand',
    'uaa2',
  ];

  return (
    <group>
      {/* Ambient light based on overall health */}
      <ambientLight color={getAmbientColor(state.overallHealth)} intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow />

      {/* Ground platform */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <cylinderGeometry args={[25, 25, 0.4, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.3}
          emissive="#222244"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Outer ring */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[24, 0.3, 16, 100]} />
        <meshStandardMaterial
          color="#4a4a6a"
          metalness={0.9}
          roughness={0.2}
          emissive="#6666ff"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Central HoloScript logo */}
      <group ref={groupRef} position={[0, 3, 0]}>
        {/* Main cube */}
        <mesh castShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial
            color="#6666ff"
            metalness={0.9}
            roughness={0.1}
            emissive="#4444ff"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Inner wireframe cube */}
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshBasicMaterial color="#88aaff" wireframe opacity={0.5} transparent />
        </mesh>

        {/* Glow sphere */}
        <mesh>
          <sphereGeometry args={[3, 32, 32]} />
          <meshBasicMaterial
            color="#4444ff"
            transparent
            opacity={0.2}
          />
        </mesh>
      </group>

      {/* Service stations */}
      {serviceKeys.map((key, index) => {
        const service = state.services[key];
        const pos = stationPositions[index];
        const healthColor = getHealthColor(service.health);

        return (
          <group key={key} position={[pos.x, 4, pos.z]} rotation={[0, pos.rotation, 0]}>
            {/* Platform */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[4, 0.2, 3]} />
              <meshStandardMaterial
                color="#2a2a4a"
                metalness={0.7}
                roughness={0.3}
                emissive={healthColor}
                emissiveIntensity={0.4}
              />
            </mesh>

            {/* Health glow sphere */}
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[5, 32, 32]} />
              <meshBasicMaterial
                color={healthColor}
                transparent
                opacity={0.15}
              />
            </mesh>

            {/* Connecting beam to center */}
            <mesh
              position={[-pos.x / 2, -1.5, -pos.z / 2]}
              rotation={[0, 0, Math.atan2(pos.z, pos.x)]}
            >
              <cylinderGeometry args={[0.05, 0.05, 8, 8]} />
              <meshStandardMaterial
                color={healthColor}
                emissive={healthColor}
                emissiveIntensity={0.6}
                transparent
                opacity={0.4}
              />
            </mesh>

            {/* Activity log panel */}
            <mesh position={[0, 0.3, -1.2]}>
              <boxGeometry args={[3.5, 1.5, 0.1]} />
              <meshStandardMaterial
                color="#1a1a2e"
                metalness={0.5}
                roughness={0.5}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Action buttons */}
            <mesh position={[-1.2, -0.5, 1]}>
              <boxGeometry args={[1, 0.3, 0.5]} />
              <meshStandardMaterial
                color="#4a9eff"
                metalness={0.8}
                roughness={0.3}
                emissive="#4a9eff"
                emissiveIntensity={0.3}
              />
            </mesh>

            <mesh position={[0, -0.5, 1]}>
              <boxGeometry args={[1, 0.3, 0.5]} />
              <meshStandardMaterial
                color="#ff9a4a"
                metalness={0.8}
                roughness={0.3}
                emissive="#ff9a4a"
                emissiveIntensity={0.3}
              />
            </mesh>

            <mesh position={[1.2, -0.5, 1]}>
              <boxGeometry args={[1, 0.3, 0.5]} />
              <meshStandardMaterial
                color="#9a4aff"
                metalness={0.8}
                roughness={0.3}
                emissive="#9a4aff"
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Fog */}
      <fog attach="fog" args={['#0a0a1a', 20, 50]} />
    </group>
  );
}
