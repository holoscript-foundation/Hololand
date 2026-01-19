import { useNavigate } from 'react-router-dom';

export function CentralPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
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
            onClick={() => navigate('/oasis')}
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
