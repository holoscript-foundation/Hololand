import { useEffect, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, Cloud } from '@react-three/drei';
import { useWorldStore } from '@/stores/worldStore';
import * as THREE from 'three';

export default function WorldPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { currentWorld, isInWorld, joinWorld, leaveWorld, isLoading } = useWorldStore();

  useEffect(() => {
    if (worldId) {
      joinWorld(worldId);
    }

    return () => {
      leaveWorld();
    };
  }, [worldId, joinWorld, leaveWorld]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-meadow-cream-light flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-12 h-12 text-meadow-grass mx-auto mb-4" />
          <p className="text-meadow-text">Loading world...</p>
        </div>
      </div>
    );
  }

  if (!currentWorld) {
    return (
      <div className="absolute inset-0 bg-meadow-cream-light flex items-center justify-center">
        <div className="text-center">
          <ErrorIcon className="w-16 h-16 text-meadow-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-meadow-text mb-2">World Not Found</h2>
          <p className="text-meadow-text-muted mb-4">
            The world you're looking for doesn't exist or has been removed.
          </p>
          <button onClick={() => navigate('/browse')} className="btn-primary">
            Browse Worlds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }} className="w-full h-full" shadows>
        <Suspense fallback={null}>
          {/* Bright daytime sky */}
          <Sky
            sunPosition={[100, 80, 50]}
            turbidity={8}
            rayleigh={0.5}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
          />

          {/* Park environment for natural reflections */}
          <Environment preset="park" />

          {/* Warm ambient light */}
          <ambientLight intensity={0.7} color="#FFF8E7" />

          {/* Sun directional light - golden */}
          <directionalLight
            position={[50, 80, 30]}
            intensity={1.5}
            color="#FFD54F"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={100}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />

          {/* Sky-ground hemisphere light */}
          <hemisphereLight args={['#87CEEB', '#7CB342', 0.4]} />

          {/* Fluffy clouds */}
          <Cloud position={[-20, 15, -10]} speed={0.2} opacity={0.7} segments={20} />
          <Cloud position={[25, 18, -15]} speed={0.15} opacity={0.6} segments={15} />
          <Cloud position={[0, 20, -25]} speed={0.1} opacity={0.5} segments={25} />

          {/* Green grass ground */}
          <GrassGround />

          {/* Placeholder content with warm colors */}
          <mesh position={[0, 1, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#FFF8E7" roughness={0.8} />
          </mesh>

          <mesh position={[5, 0.5, -3]} castShadow receiveShadow>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="#5DADE2" roughness={0.4} metalness={0.1} />
          </mesh>

          <mesh position={[-4, 1.5, 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.5, 0.5, 3, 32]} />
            <meshStandardMaterial color="#D2691E" roughness={0.7} />
          </mesh>

          {/* Decorative trees (simple) */}
          <SimpleTree position={[-8, 0, -5]} />
          <SimpleTree position={[10, 0, -8]} scale={0.8} />
          <SimpleTree position={[-12, 0, 5]} scale={1.2} />

          <OrbitControls
            enablePan={true}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            minDistance={3}
            maxDistance={30}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay - Warm styling */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {/* World info */}
        <div className="glass rounded-2xl px-4 py-3 shadow-meadow">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-meadow-cream-dark transition-colors"
              title="Leave world"
            >
              <BackIcon className="w-5 h-5 text-meadow-text" />
            </button>
            <div>
              <h1 className="font-bold text-meadow-text">{currentWorld.name}</h1>
              <p className="text-xs text-meadow-text-muted">
                {currentWorld.playerCount} players · by {currentWorld.ownerName}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="glass rounded-xl p-2.5 hover:bg-meadow-cream transition-colors"
            title="Invite friends"
          >
            <InviteIcon className="w-5 h-5 text-meadow-text-muted" />
          </button>
          <button
            className="glass rounded-xl p-2.5 hover:bg-meadow-cream transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-meadow-text-muted" />
          </button>
          <button className="btn-sky">Enter VR</button>
        </div>
      </div>

      {/* Player list */}
      <div className="absolute top-20 right-4 w-56">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-meadow-text mb-3">
            Players ({currentWorld.playerCount})
          </h3>
          <div className="space-y-2">
            {['You', 'Player2', 'Player3']
              .slice(0, currentWorld.playerCount || 1)
              .map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-meadow-grass to-meadow-sky flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-medium">{name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-meadow-text">{name}</span>
                  {i === 0 && <span className="badge-grass">You</span>}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="absolute bottom-4 left-4 w-80">
        <div className="card overflow-hidden">
          <div className="h-32 p-3 overflow-y-auto text-sm space-y-1 bg-meadow-cream/50">
            <p className="text-meadow-text-muted">
              <span className="text-meadow-grass font-medium">System:</span> Welcome to{' '}
              {currentWorld.name}!
            </p>
          </div>
          <div className="p-2 border-t border-meadow-text/10">
            <input type="text" placeholder="Type a message..." className="input text-sm py-2" />
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4">
        <div className="glass rounded-xl px-4 py-2 text-xs text-meadow-text-muted">
          <p>WASD - Move · Mouse - Look · Space - Jump</p>
        </div>
      </div>
    </div>
  );
}

// Grass ground component
function GrassGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#7CB342" roughness={0.9} metalness={0} />
    </mesh>
  );
}

// Simple stylized tree
function SimpleTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 3, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 4, 0]} castShadow>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial color="#558B2F" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Icons
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function InviteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
