import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { OasisPlanet } from './components/OasisPlanet';
import { HoloScriptRenderer } from './components/HoloScriptRenderer';
import { MainPlaza } from './worlds/MainPlaza';
import { HololandCasino } from './worlds/HololandCasino';
import { SocialLounge } from './worlds/SocialLounge';
import { BuilderShop } from './worlds/BuilderShop';
import { InfinityShop } from './worlds/InfinityShop';
import './styles.css';

// World types for navigation
type WorldView = 'landing' | 'oasis' | 'central' | 'plaza' | 'casino' | 'lounge' | 'builder' | 'arcade' | 'infinity';

// Building configuration with HoloScript zones
const BUILDINGS = [
  { id: 'casino', name: 'Casino', icon: '🎰', description: 'Try your luck with Brian at the slots!', color: 'purple', holoZone: 'casino_interior.hsplus' },
  { id: 'infinity', name: 'Infinity Shop', icon: '∞', description: 'Meet Brittney - Your AI Assistant', color: 'cyan', holoZone: null },
  { id: 'lounge', name: 'Social Lounge', icon: '👥', description: 'Connect with other explorers', color: 'pink', holoZone: null },
  { id: 'builder', name: 'Builder Shop', icon: '🛠️', description: 'Create worlds with HoloScript', color: 'green', holoZone: null },
  { id: 'arcade', name: 'Arcade District', icon: '🎮', description: "Brian's Gym & Games", color: 'yellow', holoZone: 'arcade_district.hsplus' },
  { id: 'pinball', name: 'Pinball Plus', icon: '🕹️', description: "Native Logic Demo", color: 'pink', holoZone: 'Pinball_Plus.hsplus' },
  { id: 'plaza', name: 'Main Plaza', icon: '🏛️', description: 'Central gathering place', color: 'blue', holoZone: 'central_plaza.hsplus' },
];

function App() {
  const [currentView, setCurrentView] = useState<WorldView>('oasis');
  const [showMenu, setShowMenu] = useState(true);
  const [holoScript, setHoloScript] = useState<string>('');
  const [loadingWorld, setLoadingWorld] = useState(false);

  useEffect(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
      }, 1000);
    }
  }, []);

  // Load HoloScript zone file
  const loadHoloZone = async (zoneName: string) => {
    try {
      setLoadingWorld(true);
      const response = await fetch(`/zones/${zoneName}`);
      if (!response.ok) throw new Error(`Failed to load ${zoneName}`);
      const script = await response.text();
      setHoloScript(script);
      setLoadingWorld(false);
    } catch (err) {
      console.error('Failed to load zone:', err);
      setHoloScript('');
      setLoadingWorld(false);
    }
  };

  const handleEnterWorld = async (worldId: string) => {
    const building = BUILDINGS.find(b => b.id === worldId);
    if (building?.holoZone) {
      await loadHoloZone(building.holoZone);
    }
    setCurrentView(worldId as WorldView);
  };

  const handleBackToCentral = () => {
    setCurrentView('central');
    setHoloScript('');
  };

  const handleBackToOasis = () => {
    setCurrentView('oasis');
    setHoloScript('');
  };

  // Oasis View - The Planet
  if (currentView === 'oasis') {
    return (
      <div className="fixed inset-0 bg-black">
        <Canvas 
          camera={{ position: [0, 0, 15], fov: 50 }}
          className="w-full h-full"
        >
          <ambientLight intensity={0.3} />
          <pointLight position={[20, 20, 20]} intensity={2} color="#ffffff" />
          <pointLight position={[-20, -20, -20]} intensity={0.5} color="#3b82f6" />
          
          <Stars radius={100} depth={50} count={10000} factor={4} saturation={0} fade speed={1} />
          
          <OasisPlanet onClick={() => setCurrentView('central')} />
          
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            minDistance={8}
            maxDistance={30}
            autoRotate
            autoRotateSpeed={0.3}
          />
        </Canvas>

        {showMenu && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
            <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-8 text-center">
              <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-3">
                Hololand
              </h1>
              <p className="text-xl text-slate-300 mb-6">A Living World in the Metaverse</p>
              
              <button
                onClick={() => setCurrentView('central')}
                className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl text-xl hover:scale-105 transition-transform shadow-2xl shadow-cyan-500/50"
              >
                Enter Hololand Central
              </button>
              
              <p className="text-sm text-slate-400 mt-4">
                Downtown hub with buildings, shops, and experiences
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-4 right-4 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors z-20"
        >
          {showMenu ? 'Hide' : 'Show'} Menu
        </button>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
          <p className="text-slate-400 text-sm">
            🌍 Click planet to enter • Scroll to zoom • Drag to rotate
          </p>
        </div>
      </div>
    );
  }

  // 3D World Views (HoloScript-powered or React components)
  if (['plaza', 'casino', 'lounge', 'builder', 'arcade', 'infinity'].includes(currentView)) {
    const building = BUILDINGS.find(b => b.id === currentView);
    
    return (
      <div className="fixed inset-0 bg-black">
        {loadingWorld && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 text-xl">Loading {building?.name}...</p>
            </div>
          </div>
        )}
        
        <Canvas
          camera={{ position: [0, 5, 15], fov: 60 }}
          shadows
        >
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          {/* Render HoloScript world if we have a script */}
          {holoScript ? (
            <HoloScriptRenderer 
              scriptContent={holoScript}
              onPortalClick={(dest) => {
                if (dest === 'central') handleBackToCentral();
                else handleEnterWorld(dest);
              }}
            />
          ) : (
            // Render React component world
            <>
              {currentView === 'plaza' && <MainPlaza onPortalClick={handleEnterWorld} />}
              {currentView === 'casino' && <HololandCasino />}
              {currentView === 'lounge' && <SocialLounge />}
              {currentView === 'builder' && <BuilderShop />}
              {currentView === 'infinity' && <InfinityShop />}
            </>
          )}
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            minDistance={3}
            maxDistance={50}
          />
        </Canvas>

        {/* World HUD */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-xl px-4 py-2">
            <span className="text-2xl mr-2">{building?.icon}</span>
            <span className="text-white font-bold">{building?.name}</span>
          </div>
        </div>

        <button
          onClick={handleBackToCentral}
          className="absolute top-4 right-4 px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl border border-white/20 hover:bg-white/20 transition-colors z-10"
        >
          ← Back to Central
        </button>

        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-black/60 backdrop-blur-md border border-green-500/30 rounded-xl px-4 py-2 text-sm">
            <span className="text-green-400">⚡ HoloScript</span>
            <span className="text-slate-400 ml-2">{holoScript ? 'Active' : 'React Mode'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Central View - The City Hub
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-auto">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-6xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
          Hololand Central
        </h1>
        <p className="text-xl text-slate-300 text-center mb-4">
          Downtown Hub • Explore Buildings & Experiences
        </p>
        <p className="text-sm text-center text-green-400 mb-8">
          ⚡ Powered by HoloScript — Built for AI, Developed by AI
        </p>

        {/* Buildings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {BUILDINGS.map((building) => (
            <BuildingCard
              key={building.id}
              name={building.name}
              icon={building.icon}
              description={building.description}
              color={building.color}
              holoEnabled={!!building.holoZone}
              onClick={() => handleEnterWorld(building.id)}
            />
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <button
            onClick={handleBackToOasis}
            className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl border border-white/20 hover:bg-white/20 transition-colors"
          >
            ← Back to Oasis
          </button>
        </div>

        {/* Brian Welcome Message */}
        <div className="max-w-2xl mx-auto mt-12 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/30">
          <div className="flex items-start gap-4">
            <div className="text-5xl">💪</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">BRIAN says:</h3>
              <p className="text-slate-300 italic">
                "UNNGH! WELCOME TO HOLOLAND CENTRAL! BRIAN GLAD YOU HERE! 
                BRIAN WORK OUT IN ARCADE! BRIAN DEAL CARDS IN CASINO! 
                BRIAN EVERYWHERE! YOU EXPLORE! BRIAN FLEX FOR YOU! 💪"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BuildingCardProps {
  name: string;
  icon: string;
  description: string;
  color: string;
  holoEnabled?: boolean;
  onClick: () => void;
}

function BuildingCard({ name, icon, description, color, holoEnabled, onClick }: BuildingCardProps) {
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10',
    yellow: 'border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10',
    pink: 'border-pink-500/30 hover:border-pink-500/50 hover:bg-pink-500/10',
    green: 'border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10',
    blue: 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10',
  };

  return (
    <button 
      onClick={onClick}
      className={`p-6 bg-white/5 backdrop-blur-sm rounded-xl border ${colorClasses[color]} transition-all hover:scale-105 text-left cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div className="text-4xl mb-3">{icon}</div>
        {holoEnabled && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
            HoloScript
          </span>
        )}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </button>
  );
}

export default App;
