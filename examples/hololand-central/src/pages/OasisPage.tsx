import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { HoloScriptRenderer } from '../components/HoloScriptRenderer';
import { SpatialFeedRenderer } from '@holoscript/r3f-renderer';

import { DialogOverlay } from '../components/DialogOverlay';
import { DialogManager } from '@hololand/world';

export function OasisPage() {
  const navigate = useNavigate();
  const [holoScript, setHoloScript] = useState<string>('');
  const [dialogManager, setDialogManager] = useState<DialogManager | null>(null);

  useEffect(() => {
    // Phase 2C: Load BOTH planet script and NPC "Central_NPCs" script
    const loadScripts = async () => {
        try {
            const [planetRes, guideRes] = await Promise.all([
                fetch('/assets/hololand_planet.hsplus'),
                fetch('/assets/Central_NPCs.hsplus')
            ]);

            if (!planetRes.ok) throw new Error('Failed to load planet script');
            
            const planetScript = await planetRes.text();
            let finalScript = planetScript;

            if (guideRes.ok) {
                const guideScript = await guideRes.text();
                // append guide content
                finalScript += '\n' + guideScript;
            } else {
                console.warn("Guide script not found, proceeding without NPCs");
            }
            
            setHoloScript(finalScript);
        } catch (err) {
            console.error('Failed to load scripts:', err);
        } finally {
            const loading = document.getElementById('loading');
            if (loading) loading.classList.add('hidden');
        }
    };

    loadScripts();

    // Listen for systems ready event to grab dialog manager
    const handleSystemsReady = (e: CustomEvent) => {
        if (e.detail && e.detail.dialogManager) {
            setDialogManager(e.detail.dialogManager);
        }
    };
    window.addEventListener('hololand:systems-ready', handleSystemsReady as EventListener);

    // Listen for HoloScript updates (from DevTools or MCP)
    const unsubscribeScript = window.__HOLOLAND_CENTRAL__?.onHoloScriptUpdate((script) => {
        console.log('[OasisPage] HoloScript update received');
        setHoloScript(script);
    });
    
    return () => {
        window.removeEventListener('hololand:systems-ready', handleSystemsReady as EventListener);
        if (unsubscribeScript) unsubscribeScript();
    };
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
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 50 }}
        className="w-full h-full"
        shadows
      >
        <HoloScriptRenderer 
          scriptContent={holoScript}
        />
        
        {/* A2A Gossip Mesh / Spatial Feed Layer */}
        <SpatialFeedRenderer 
          worldStatePath="./.holomesh/worldstate.crdt"
        />

        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          minDistance={5}
          maxDistance={50}
          autoRotate={false}
        />
      </Canvas>
      
      {/* HUD & Overlays */}
      {dialogManager && <DialogOverlay manager={dialogManager} />}
    </div>
  );
}
