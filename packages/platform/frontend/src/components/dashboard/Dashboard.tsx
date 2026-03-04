'use client';

import { useEffect, useState } from 'react';
import { worldsAPI, creatorAPI, analyticsAPI } from '@/lib/api';
import { useVRDashboardAgent } from '../../ag-ui/hooks';
import { AgentOverlay, AgentThinkingIndicator, AgentNotificationBar } from '../../ag-ui/components';

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  const [worlds, setWorlds] = useState<any[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [stats, setStats] = useState({ worlds: 0, earnings: 0, visitors: 0 });
  const [activeTab, setActiveTab] = useState('home');

  // AG-UI: Agent interaction for the creator dashboard
  const {
    isThinking,
    notifications,
    suggestions,
    highlights,
    reportActivity,
    navigateToPanel,
    agentState,
  } = useVRDashboardAgent();

  useEffect(() => {
    loadDashboard();
  }, [userId]);

  // AG-UI: Report tab navigation to the agent
  useEffect(() => {
    reportActivity('dashboard_navigation', { panel: activeTab, dashboardType: 'creator' });
  }, [activeTab, reportActivity]);

  // AG-UI: Respond to agent-driven navigation
  useEffect(() => {
    if (agentState.activePanel && agentState.activePanel !== activeTab) {
      setActiveTab(agentState.activePanel);
    }
  }, [agentState.activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    // Load creator profile
    const { data: creatorData } = await creatorAPI.getProfile(userId);
    setCreator(creatorData);

    if (creatorData) {
      // Load worlds
      const { data: worldsData } = await worldsAPI.list({ creatorId: creatorData.id });
      setWorlds(worldsData || []);

      // Load earnings
      const { total: earnings } = await creatorAPI.getEarnings(creatorData.id);

      // Calculate stats
      const totalVisits = worldsData?.reduce((sum, w) => sum + (w.visits || 0), 0) || 0;
      setStats({
        worlds: worldsData?.length || 0,
        earnings: earnings,
        visitors: totalVisits,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ position: 'relative' }}>
      {/* AG-UI: Agent notification bar */}
      <AgentNotificationBar style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Creator Dashboard</h1>
              <p className="text-gray-600">Manage your worlds and track earnings</p>
            </div>
            {/* AG-UI: Agent thinking indicator in header */}
            <AgentThinkingIndicator />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {['home', 'worlds', 'earnings', 'analytics', 'profile'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Worlds" value={stats.worlds} icon="🌍" />
              <StatCard title="Total Earnings" value={`$${stats.earnings.toFixed(2)}`} icon="💰" />
              <StatCard title="Total Visits" value={stats.visitors} icon="👁️" />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ActionCard
                title="Create New World"
                description="Build a new VR experience"
                action="Create"
                onClick={() => console.log('Create new world')}
              />
              <ActionCard
                title="View Performance"
                description="See analytics and reviews"
                action="View"
                onClick={() => setActiveTab('analytics')}
              />
            </div>
          </div>
        )}

        {activeTab === 'worlds' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Your Worlds</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Create World
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {worlds.map((world) => (
                <div key={world.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="bg-gray-200 h-40 flex items-center justify-center">
                    {world.thumbnail_url ? (
                      <img src={world.thumbnail_url} alt={world.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400">No thumbnail</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{world.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{world.description}</p>
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                      <span>👁️ {world.visits || 0} visits</span>
                      <span>⭐ {world.rating || 0}</span>
                    </div>
                    {world.price_usd > 0 && (
                      <div className="mb-4 text-lg font-bold text-green-600">${world.price_usd}</div>
                    )}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-blue-100 text-blue-600 py-2 rounded hover:bg-blue-200">
                        Edit
                      </button>
                      <button className="flex-1 bg-gray-100 text-gray-600 py-2 rounded hover:bg-gray-200">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {worlds.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">You haven't created any worlds yet</p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                  Create Your First World
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Earnings & Transactions</h2>
            <p className="text-gray-600">Coming soon - transaction history and payout management</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Analytics</h2>
            <p className="text-gray-600">Coming soon - detailed analytics and insights</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Creator Profile</h2>
            {creator && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue={creator.display_name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    defaultValue={creator.description}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                  />
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* AG-UI: Agent overlay with chat, suggestions, and notifications */}
      <AgentOverlay position="bottom-right" showChat={true} showSuggestions={true} />
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, action, onClick }: any) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer" onClick={onClick}>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <button className="text-blue-600 font-medium hover:text-blue-700">{action} →</button>
    </div>
  );
}
