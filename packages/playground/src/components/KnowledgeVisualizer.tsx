import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Mock Data Structure (matching SpatialKnowledgeGraph)
interface MemoryNode {
  id: string;
  type: 'interaction' | 'movement' | 'generation';
  position: [number, number, number];
  content: string;
  timestamp: number;
}

const MOCK_MEMORIES: MemoryNode[] = [
  { id: 'm1', type: 'interaction', position: [0, 0, 0], content: "Greeted Mayor", timestamp: Date.now() },
  { id: 'm2', type: 'movement', position: [2, 0, 1], content: "Explored Square", timestamp: Date.now() - 1000 },
  { id: 'm3', type: 'generation', position: [-2, 1, 0], content: "Built Lamp", timestamp: Date.now() - 2000 },
  { id: 'm4', type: 'movement', position: [0, 0, 3], content: "Patrol Route", timestamp: Date.now() - 3000 },
];

function Node({ node, onHover }: { node: MemoryNode; onHover: (n: MemoryNode | null) => void }) {
  const color = useMemo(() => {
    switch (node.type) {
      case 'interaction': return '#4ade80'; // Green
      case 'movement': return '#60a5fa';    // Blue
      case 'generation': return '#f87171'; // Red
      default: return '#9ca3af';
    }
  }, [node.type]);

  return (
    <mesh position={node.position} 
          onPointerOver={() => onHover(node)}
          onPointerOut={() => onHover(null)}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

function Connection({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    geo.setFromPoints(points);
    return geo;
  }, [start, end]);
  
  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2 }))} />
  );
}

export const KnowledgeVisualizer: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null);

  // In a real implementation, this would fetch from RelayService
  const memories = MOCK_MEMORIES;

  return (
    <div className="h-full w-full bg-slate-900 relative">
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded text-xs text-white">
        <h3 className="font-bold mb-1">🧠 Spatial Knowledge Graph</h3>
        <div className="flex gap-2 items-center"><span className="w-2 h-2 rounded-full bg-green-400"></span> Interaction</div>
        <div className="flex gap-2 items-center"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Movement</div>
        <div className="flex gap-2 items-center"><span className="w-2 h-2 rounded-full bg-red-400"></span> Generation</div>
      </div>

      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-slate-800 p-4 rounded border border-slate-700 text-white max-w-xs transition-opacity shadow-xl">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{hoveredNode.type}</div>
          <div className="font-medium text-lg mb-2">{hoveredNode.content}</div>
          <div className="text-xs text-slate-500 font-mono">
             POS: [{hoveredNode.position.map(n => n.toFixed(1)).join(', ')}]
          </div>
        </div>
      )}

      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <group>
          {memories.map(m => (
            <Node key={m.id} node={m} onHover={setHoveredNode} />
          ))}
          
          {/* Draw connections between sequential memories for MVP */}
          {memories.map((m, i) => {
            if (i === 0) return null;
            const prev = memories[i-1];
            return <Connection key={`c-${i}`} start={prev.position} end={m.position} />;
          })}
        </group>

        <OrbitControls autoRotate autoRotateSpeed={0.5} />
        <gridHelper args={[20, 20, 0x334155, 0x1e293b]} />
      </Canvas>
    </div>
  );
};
