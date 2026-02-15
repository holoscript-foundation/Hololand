import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorldStore } from '@/stores/worldStore';
import WorldCard from '@/features/launcher/WorldCard';

const CATEGORIES = [
  { id: 'all', label: 'All Worlds' },
  { id: 'featured', label: 'Featured' },
  { id: 'popular', label: 'Popular' },
  { id: 'games', label: 'Games' },
  { id: 'social', label: 'Social' },
  { id: 'music', label: 'Music' },
  { id: 'art', label: 'Art' },
  { id: 'education', label: 'Education' },
];

export default function WorldBrowserPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const { worlds, featuredWorlds, searchWorlds, fetchWorlds, isLoading } = useWorldStore();

  const activeCategory = searchParams.get('category') || 'all';
  const sortBy = searchParams.get('sort') || 'popular';

  useEffect(() => {
    fetchWorlds(activeCategory);
  }, [activeCategory, fetchWorlds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchWorlds(searchQuery);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSearchParams({ category, sort: sortBy });
  };

  const displayWorlds = activeCategory === 'featured' ? featuredWorlds : worlds.length > 0 ? worlds : featuredWorlds;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-oasis-text">Browse Worlds</h1>
          <p className="text-oasis-text-muted mt-1">
            Discover new experiences and adventures
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative max-w-sm w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-oasis-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search worlds..."
            className="input pl-10 w-full"
          />
        </form>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${activeCategory === category.id
                ? 'bg-oasis-primary text-white'
                : 'bg-oasis-surface-light text-oasis-text-muted hover:text-oasis-text'
              }
            `}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-oasis-text-muted">
          {displayWorlds.length} worlds found
        </p>
        <select
          value={sortBy}
          onChange={(e) => setSearchParams({ category: activeCategory, sort: e.target.value })}
          className="input py-2 px-3 text-sm"
        >
          <option value="popular">Most Popular</option>
          <option value="recent">Recently Added</option>
          <option value="players">Most Players</option>
          <option value="name">Alphabetical</option>
        </select>
      </div>

      {/* World grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-oasis-surface-light rounded-t-lg" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-oasis-surface-light rounded w-3/4" />
                <div className="h-3 bg-oasis-surface-light rounded w-full" />
                <div className="h-3 bg-oasis-surface-light rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayWorlds.map((world) => (
            <WorldCard key={world.id} world={world} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayWorlds.length === 0 && (
        <div className="text-center py-12">
          <WorldIcon className="w-16 h-16 text-oasis-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-oasis-text mb-2">
            No worlds found
          </h3>
          <p className="text-oasis-text-muted">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function WorldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}
