import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { HoloScriptRenderer } from '../components/HoloScriptRenderer';

export function OasisPage() {
  const navigate = useNavigate();
  const [holoScript, setHoloScript] = useState<string>('');

  useEffect(() => {
    // Load the hololand_planet.holo file from public assets
    fetch('/assets/hololand_planet.holo')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load planet script');
        return res.text();
      })
      .then(script => {
        setHoloScript(script);
        // Hide loading screen only after script is loaded
        const loading = document.getElementById('loading');
        if (loading) {
          loading.classList.add('hidden');
        }
      })
      .catch(err => {
        console.error('Failed to load planet script:', err);
        // Ensure we hide loading screen even on error so user isn't stuck
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
      });
  }, []);

  const handlePortalClick = (destination: string) => {
    if (destination === 'central') {
      navigate('/central');
    }
  };

  if (!holoScript) {
    return null; // Loading handled by index.html overlay
  }

  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        className="w-full h-full"
        shadows
      >
        <HoloScriptRenderer 
          scriptContent={holoScript}
          onPortalClick={handlePortalClick}
        />
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={8}
          maxDistance={30}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
