import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Sky, Cloud } from '@react-three/drei';

const ZONES = [
  { id: 'plaza', name: 'Plaza', description: 'Main gathering area', players: 12, position: [0, 0, 0] as [number, number, number], color: '#FFF8E7' },
  { id: 'casino', name: 'Casino', description: 'Try your luck!', players: 8, position: [20, 0, 0] as [number, number, number], color: '#FFD54F' },
  { id: 'arcade', name: 'Arcade', description: 'Retro games', players: 15, position: [-20, 0, 0] as [number, number, number], color: '#7CB342' },
  { id: 'lounge', name: 'Lounge', description: 'Chill & chat', players: 6, position: [0, 0, 20] as [number, number, number], color: '#E8A87C' },
  { id: 'builder', name: 'Builder', description: 'Create together', players: 4, position: [0, 0, -20] as [number, number, number], color: '#5DADE2' },
];

export default function CentralPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showUI, setShowUI] = useState(true);

  return (
    <div className="absolute inset-0">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 15, 35], fov: 55 }}
        className="w-full h-full"
        shadows
      >
        <Suspense fallback={null}>
          {/* Bright Mediterranean sky */}
          <Sky
            sunPosition={[100, 100, 50]}
            turbidity={10}
            rayleigh={0.5}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
          />

          {/* Park environment */}
          <Environment preset="park" />

          {/* Warm ambient light */}
          <ambientLight intensity={0.6} color="#FFF8E7" />

          {/* Golden sun light */}
          <directionalLight
            position={[60, 100, 40]}
            intensity={1.8}
            color="#FFD54F"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={150}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />

          {/* Sky-ground hemisphere */}
          <hemisphereLight args={['#87CEEB', '#7CB342', 0.5]} />

          {/* Fluffy clouds */}
          <Cloud position={[-30, 25, -20]} speed={0.2} opacity={0.6} segments={20} />
          <Cloud position={[35, 30, -25]} speed={0.15} opacity={0.5} segments={18} />
          <Cloud position={[0, 28, -40]} speed={0.1} opacity={0.55} segments={22} />
          <Cloud position={[-40, 22, 10]} speed={0.18} opacity={0.5} segments={15} />

          {/* Rolling grass hills ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#7CB342" roughness={0.9} />
          </mesh>

          {/* Central fountain plaza (stone) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
            <circleGeometry args={[12, 32]} />
            <meshStandardMaterial color="#D4C4B0" roughness={0.8} />
          </mesh>

          {/* Fountain in center */}
          <Fountain position={[0, 0, 0]} />

          {/* Zone buildings */}
          {ZONES.map((zone) => (
            <MediterraneanBuilding
              key={zone.id}
              zone={zone}
              isSelected={selectedZone === zone.id}
              onClick={() => setSelectedZone(zone.id)}
            />
          ))}

          {/* Decorative trees around */}
          <SimpleTree position={[-15, 0, 15]} scale={1.2} />
          <SimpleTree position={[15, 0, 15]} scale={1} />
          <SimpleTree position={[-25, 0, -10]} scale={0.9} />
          <SimpleTree position={[25, 0, -10]} scale={1.1} />
          <SimpleTree position={[-10, 0, -25]} scale={1.3} />
          <SimpleTree position={[10, 0, -25]} scale={0.8} />

          <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.5}
            minDistance={20}
            maxDistance={60}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      {showUI && (
        <>
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="glass rounded-2xl px-5 py-3 shadow-meadow">
              <h1 className="text-lg font-bold text-meadow-text">Hololand Central</h1>
              <p className="text-xs text-meadow-text-muted">42 players online</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUI(false)}
                className="glass rounded-xl p-2.5 hover:bg-meadow-cream transition-colors"
                title="Hide UI"
              >
                <EyeOffIcon className="w-5 h-5 text-meadow-text-muted" />
              </button>
              <button className="glass rounded-xl p-2.5 hover:bg-meadow-cream transition-colors" title="Settings">
                <SettingsIcon className="w-5 h-5 text-meadow-text-muted" />
              </button>
              <button className="btn-sky">Enter VR</button>
            </div>
          </div>

          {/* Zone selector */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="card p-4">
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    className={`
                      flex-shrink-0 p-4 rounded-xl transition-all duration-200 min-w-[120px]
                      ${selectedZone === zone.id
                        ? 'bg-meadow-grass text-white shadow-grass'
                        : 'bg-meadow-cream-dark/50 text-meadow-text hover:bg-meadow-cream-dark'
                      }
                    `}
                  >
                    <p className="font-semibold">{zone.name}</p>
                    <p className="text-xs opacity-80 mt-0.5">{zone.players} players</p>
                  </button>
                ))}
              </div>

              {selectedZone && (
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-meadow-text/10">
                  <div>
                    <h3 className="font-semibold text-meadow-text text-lg">
                      {ZONES.find((z) => z.id === selectedZone)?.name}
                    </h3>
                    <p className="text-sm text-meadow-text-muted">
                      {ZONES.find((z) => z.id === selectedZone)?.description}
                    </p>
                  </div>
                  <button className="btn-primary">
                    Enter Zone
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mini map */}
          <div className="absolute top-20 right-4 w-48 h-48 card p-3 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-meadow-grass/20 to-meadow-sky-light/20 rounded-xl relative">
              {ZONES.map((zone) => (
                <div
                  key={zone.id}
                  className={`
                    absolute w-4 h-4 rounded-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all
                    ${selectedZone === zone.id
                      ? 'bg-meadow-grass scale-125 shadow-grass'
                      : 'bg-meadow-cream-dark hover:bg-meadow-cream'
                    }
                  `}
                  style={{
                    left: `${50 + zone.position[0] * 1.5}%`,
                    top: `${50 + zone.position[2] * 1.5}%`,
                  }}
                  onClick={() => setSelectedZone(zone.id)}
                  title={zone.name}
                />
              ))}
              {/* Player dot */}
              <div className="absolute w-3 h-3 bg-meadow-success rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse shadow-sm" />
            </div>
          </div>
        </>
      )}

      {/* Show UI button when hidden */}
      {!showUI && (
        <button
          onClick={() => setShowUI(true)}
          className="absolute top-4 right-4 glass rounded-xl p-2.5"
        >
          <EyeIcon className="w-5 h-5 text-meadow-text" />
        </button>
      )}
    </div>
  );
}

// Mediterranean-style building
function MediterraneanBuilding({
  zone,
  isSelected,
  onClick,
}: {
  zone: (typeof ZONES)[0];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <group position={zone.position} onClick={onClick}>
      {/* Main building - cream/terracotta walls */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 6, 10]} />
        <meshStandardMaterial
          color={zone.color}
          roughness={0.8}
        />
      </mesh>

      {/* Terracotta roof */}
      <mesh position={[0, 7, 0]} castShadow>
        <coneGeometry args={[7.5, 2.5, 4]} />
        <meshStandardMaterial color="#D2691E" roughness={0.9} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 1.5, 5.01]}>
        <planeGeometry args={[2, 3]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* Windows */}
      <mesh position={[-2.5, 4, 5.01]}>
        <planeGeometry args={[1.5, 2]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[2.5, 4, 5.01]}>
        <planeGeometry args={[1.5, 2]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Label */}
      <Text
        position={[0, 9.5, 0]}
        fontSize={1.2}
        color="#3D2914"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#FFFFFF"
      >
        {zone.name}
      </Text>

      {/* Selection ring - grass green */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[6, 7, 32]} />
          <meshBasicMaterial color="#7CB342" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

// Simple fountain
function Fountain({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3, 3.5, 0.6, 32]} />
        <meshStandardMaterial color="#C9B8A0" roughness={0.7} />
      </mesh>
      {/* Water pool */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 0.3, 32]} />
        <meshStandardMaterial color="#5DADE2" roughness={0.2} metalness={0.3} transparent opacity={0.8} />
      </mesh>
      {/* Center pillar */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 2.5, 16]} />
        <meshStandardMaterial color="#C9B8A0" roughness={0.7} />
      </mesh>
      {/* Top bowl */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.5, 0.4, 16]} />
        <meshStandardMaterial color="#C9B8A0" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Simple stylized tree
function SimpleTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 5, 0]} castShadow>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshStandardMaterial color="#558B2F" roughness={0.85} />
      </mesh>
      <mesh position={[0, 6.5, 0]} castShadow>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshStandardMaterial color="#7CB342" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Icons
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
