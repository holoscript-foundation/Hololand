import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorldStore } from '@/stores/worldStore';
import { useSocialStore } from '@/stores/socialStore';
import WorldCard from '@/features/launcher/WorldCard';
import FeaturedCarousel from '@/features/launcher/FeaturedCarousel';
import QuickActions from '@/features/launcher/QuickActions';
import FriendsOnline from '@/features/launcher/FriendsOnline';

export default function LauncherPage() {
  const { featuredWorlds, recentWorlds, fetchFeaturedWorlds } = useWorldStore();
  const { friends } = useSocialStore();

  useEffect(() => {
    fetchFeaturedWorlds();
  }, [fetchFeaturedWorlds]);

  const onlineFriends = friends.filter((f) => f.status !== 'offline');

  return (
    <div className="space-y-8 animate-in">
      {/* Hero / Quick Actions */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-oasis-text">Welcome to Oasis</h1>
            <p className="text-oasis-text-muted mt-1">
              Discover worlds, connect with friends, and create experiences
            </p>
          </div>
        </div>
        <QuickActions />
      </section>

      {/* Featured Worlds */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-oasis-text">Featured Worlds</h2>
          <Link to="/browse" className="text-sm text-oasis-primary hover:text-oasis-primary-light transition-colors">
            View all →
          </Link>
        </div>
        <FeaturedCarousel worlds={featuredWorlds} />
      </section>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content - Recent & Popular */}
        <div className="lg:col-span-2 space-y-8">
          {/* Continue Playing */}
          {recentWorlds.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-oasis-text mb-4">Continue Playing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentWorlds.slice(0, 4).map((world) => (
                  <WorldCard key={world.id} world={world} />
                ))}
              </div>
            </section>
          )}

          {/* Popular Worlds */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-oasis-text">Popular Worlds</h2>
              <Link to="/browse?sort=popular" className="text-sm text-oasis-primary hover:text-oasis-primary-light transition-colors">
                See more →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredWorlds.map((world) => (
                <WorldCard key={world.id} world={world} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar - Friends & Activity */}
        <div className="space-y-6">
          {/* Friends Online */}
          <FriendsOnline friends={onlineFriends} />

          {/* Quick Create */}
          <div className="card p-6">
            <h3 className="font-semibold text-oasis-text mb-2">Create with AI</h3>
            <p className="text-sm text-oasis-text-muted mb-4">
              Describe your world and let Brittney build it for you
            </p>
            <Link to="/create" className="btn-primary w-full text-center block">
              Start Creating
            </Link>
          </div>

          {/* Enter Central CTA */}
          <div className="card p-6 bg-gradient-to-br from-oasis-primary/20 to-oasis-secondary/20 border-oasis-primary/30">
            <h3 className="font-semibold text-oasis-text mb-2">Hololand Central</h3>
            <p className="text-sm text-oasis-text-muted mb-4">
              Visit the downtown hub - Casino, Arcade, Social Lounge, and more!
            </p>
            <div className="flex items-center justify-between text-sm text-oasis-text-muted mb-4">
              <span>42 players online</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-oasis-success rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <Link to="/central" className="btn bg-gradient-to-r from-oasis-primary to-oasis-secondary hover:opacity-90 text-white w-full text-center block">
              Enter Central
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
