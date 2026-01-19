import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { OasisPlanet } from './components/OasisPlanet';
import './styles.css';

function App() {
  const [currentView, setCurrentView] = useState<'oasis' | 'central'>('oasis');
  const [showMenu, setShowMenu] = useState(true);

  useEffect(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
      }, 1000);
    }
  }, []);

  const handleEnterCentral = () => {
    setCurrentView('central');
  };

  const handleBackToOasis = () => {
    setCurrentView('oasis');
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
          
          <OasisPlanet onClick={handleEnterCentral} />
          
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
                onClick={handleEnterCentral}
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
          className="absolute top-4 right-4 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
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

  // Central View - The City
  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-6xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
          Hololand Central
        </h1>
        <p className="text-xl text-slate-300 text-center mb-12">
          Downtown Hub • Explore Buildings & Experiences
        </p>

        {/* Buildings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <BuildingCard
            name="Casino"
            icon="🎰"
            description="Try your luck at the Hololand Casino"
            color="purple"
          />
          <BuildingCard
            name="Coffee Shop"
            icon="☕"
            description="Relax at the virtual coffee shop"
            color="yellow"
          />
          <BuildingCard
            name="Social Lounge"
            icon="👥"
            description="Meet and connect with others"
            color="pink"
          />
          <BuildingCard
            name="Builder Shop"
            icon="🛠️"
            description="Create and customize your worlds"
            color="green"
          />
          <BuildingCard
            name="Arcade District"
            icon="🎮"
            description="Classic and modern games"
            color="cyan"
          />
          <BuildingCard
            name="Main Plaza"
            icon="🏛️"
            description="Central gathering place"
            color="blue"
          />
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
      </div>
    </div>
  );
}

function BuildingCard({ name, icon, description, color }: { name: string; icon: string; description: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10',
    yellow: 'border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10',
    pink: 'border-pink-500/30 hover:border-pink-500/50 hover:bg-pink-500/10',
    green: 'border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10',
    blue: 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10',
  };

  return (
    <button className={`p-6 bg-white/5 backdrop-blur-sm rounded-xl border ${colorClasses[color]} transition-all hover:scale-105 text-left`}>
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </button>
  );
}

export default App;
