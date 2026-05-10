import { useEffect, useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface SpatialFeedRendererProps {
  worldStatePath: string;
}

interface SpatialFeedSnapshot {
  source: string;
  status: 'pending' | 'ready' | 'unavailable';
  entries: number;
  updatedAt: number;
}

function summarizeWorldState(source: string, body: string): SpatialFeedSnapshot {
  const nonEmptyLines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    source,
    status: 'ready',
    entries: nonEmptyLines.length,
    updatedAt: Date.now(),
  };
}

export function SpatialFeedRenderer({ worldStatePath }: SpatialFeedRendererProps) {
  const [snapshot, setSnapshot] = useState<SpatialFeedSnapshot>({
    source: worldStatePath,
    status: 'pending',
    entries: 0,
    updatedAt: Date.now(),
  });

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      try {
        const response = await fetch(worldStatePath, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Feed unavailable: HTTP ${response.status}`);
        }

        const body = await response.text();
        if (!cancelled) {
          setSnapshot(summarizeWorldState(worldStatePath, body));
        }
      } catch {
        if (!cancelled) {
          setSnapshot({
            source: worldStatePath,
            status: 'unavailable',
            entries: 0,
            updatedAt: Date.now(),
          });
        }
      }
    };

    loadSnapshot();
    const interval = window.setInterval(loadSnapshot, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [worldStatePath]);

  const statusColor = useMemo(() => {
    if (snapshot.status === 'ready') return '#00f5d4';
    if (snapshot.status === 'pending') return '#ffd166';
    return '#ff6b6b';
  }, [snapshot.status]);

  return (
    <group name="spatial-feed-bridge" position={[0, -4.5, 0]}>
      <mesh>
        <boxGeometry args={[3.4, 0.12, 0.12]} />
        <meshBasicMaterial color={new THREE.Color(statusColor)} transparent opacity={0.45} />
      </mesh>
      <Html transform center position={[0, 0.35, 0]}>
        <div
          style={{
            width: '280px',
            border: `1px solid ${statusColor}`,
            borderRadius: '8px',
            background: 'rgba(4, 8, 18, 0.82)',
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '10px 12px',
            textAlign: 'center',
            boxShadow: `0 0 24px ${statusColor}55`,
          }}
        >
          <div style={{ color: statusColor, fontSize: '11px', letterSpacing: '0.12em' }}>
            HOLOMESH FEED
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            {snapshot.status === 'ready'
              ? `${snapshot.entries} CRDT entries`
              : snapshot.status === 'pending'
                ? 'syncing'
                : 'feed offline'}
          </div>
        </div>
      </Html>
    </group>
  );
}
