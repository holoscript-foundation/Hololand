import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import worldRegistrySrc from '../worlds/WorldRegistry.hsplus?raw';

interface Building {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  zone: string | null;
}

function parseWorldRegistry(src: string): Building[] {
  const buildings: Building[] = [];
  const buildingRegex = /building\s+"([^"]+)"\s*\{([^}]*?)\}/g;
  let match;
  while ((match = buildingRegex.exec(src)) !== null) {
    const id = match[1];
    const body = match[2];
    const name = body.match(/name:\s*"([^"]*)"/)?.[1] ?? id;
    const icon = body.match(/icon:\s*"([^"]*)"/)?.[1] ?? '🏢';
    const description = body.match(/description:\s*"([^"]*)"/)?.[1] ?? '';
    const color = body.match(/color:\s*"([^"]*)"/)?.[1] ?? 'blue';
    const zoneMatch = body.match(/zone:\s*("([^"]*)"|null)/);
    const zone = zoneMatch ? (zoneMatch[2] ?? null) : null;
    buildings.push({ id, name, icon, description, color, zone });
  }
  return buildings;
}

export function CentralPage() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);

  // Enable MCP/DevTools injection
  useEffect(() => {
    const unsubscribe = window.__HOLOLAND_CENTRAL__?.onHoloScriptUpdate((script) => {
        console.log('[CentralPage] HoloScript update received:', script.slice(0, 50));
    });
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, []);

  // Load building registry from HoloScript source of truth
  useEffect(() => {
    try {
      const parsed = parseWorldRegistry(worldRegistrySrc);
      setBuildings(parsed);
    } catch (err) {
      console.error('[CentralPage] Failed to parse WorldRegistry.hsplus:', err);
      setBuildings([]);
    }
  }, []);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-6xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
          Hololand Central
        </h1>
        <p className="text-xl text-slate-300 text-center mb-12">
          Downtown Hub • Explore Buildings &amp; Experiences
        </p>

        {/* Buildings Grid — rendered from HoloScript registry */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {buildings.map((building) => (
            <BuildingCard
              key={building.id}
              name={building.name}
              icon={building.icon}
              description={building.description}
              color={building.color}
              zone={building.zone}
            />
          ))}
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

interface BuildingCardProps {
  name: string;
  icon: string;
  description: string;
  color: string;
  zone: string | null;
}

function BuildingCard({ name, icon, description, color, zone }: BuildingCardProps) {
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10',
    yellow: 'border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10',
    pink: 'border-pink-500/30 hover:border-pink-500/50 hover:bg-pink-500/10',
    green: 'border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10',
    blue: 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10',
    orange: 'border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/10',
    teal: 'border-teal-500/30 hover:border-teal-500/50 hover:bg-teal-500/10',
  };

  return (
    <button className={`p-6 bg-white/5 backdrop-blur-sm rounded-xl border ${colorClasses[color] || colorClasses.blue} transition-all hover:scale-105 text-left`}>
      <div className="flex items-start justify-between">
        <div className="text-4xl mb-3">{icon}</div>
        {zone && (
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
