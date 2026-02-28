import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../App';

const CATEGORIES = [
  'All',
  'Visual',
  'Animation',
  'Physics',
  'Interaction',
  'Audio',
  'Networking',
  'VR',
  'Gameplay',
  'UI',
  'Performance',
  'Weather',
  'Social',
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
] as const;

export function MarketplaceBrowser() {
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<'popular' | 'recent' | 'rating' | 'price-low' | 'price-high'>('popular');

  const { data, isLoading, fetchNextPage, hasNextPage } = trpc.getTraits.useInfiniteQuery(
    {
      category: category === 'All' ? undefined : category,
      search: search || undefined,
      sort,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const { data: featured } = trpc.getFeatured.useQuery();

  const allTraits = data?.pages.flatMap((page) => page.traits) ?? [];

  return (
    <div className="marketplace-browser">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">Discover Amazing Traits</h1>
        <p className="hero-subtitle">
          Enhance your HoloScript projects with powerful, reusable traits
        </p>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search traits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button className="search-button">Search</button>
        </div>
      </section>

      {/* Featured Traits */}
      {featured && featured.length > 0 && (
        <section className="featured-section">
          <h2 className="section-title">Featured Traits</h2>
          <div className="featured-grid">
            {featured.map((trait) => (
              <Link key={trait.id} to={`/trait/${trait.id}`} className="featured-card">
                <div className="trait-badge">Featured</div>
                <div className="trait-icon">@{trait.name.replace('@', '')}</div>
                <h3 className="trait-name">{trait.displayName}</h3>
                <p className="trait-description">{trait.description}</p>
                <div className="trait-meta">
                  <span className="trait-price">${trait.price}</span>
                  <span className="trait-rating">⭐ {trait.rating.toFixed(1)}</span>
                  <span className="trait-downloads">↓ {trait.downloads}</span>
                </div>
                <div className="creator-info">
                  <img src={trait.creator.avatar || '/default-avatar.png'} alt="" className="creator-avatar" />
                  <span className="creator-name">{trait.creator.username}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filters & Browse */}
      <section className="browse-section">
        <div className="filters-bar">
          <div className="category-filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat === 'All' ? '' : cat)}
                className={`category-chip ${category === cat || (!category && cat === 'All') ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="sort-select"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading traits...</p>
          </div>
        ) : allTraits.length === 0 ? (
          <div className="empty-state">
            <p>No traits found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="traits-grid">
              {allTraits.map((trait) => (
                <Link key={trait.id} to={`/trait/${trait.id}`} className="trait-card">
                  {trait.isNFT && <div className="nft-badge">NFT</div>}
                  <div className="trait-header">
                    <div className="trait-icon-small">@{trait.name.replace('@', '')}</div>
                    <span className="trait-category">{trait.category}</span>
                  </div>
                  <h3 className="trait-title">{trait.displayName}</h3>
                  <p className="trait-desc">{trait.description.slice(0, 100)}...</p>
                  <div className="trait-stats">
                    <span className="stat">⭐ {trait.rating.toFixed(1)}</span>
                    <span className="stat">💬 {trait._count.reviews}</span>
                    <span className="stat">❤️ {trait._count.favorites}</span>
                  </div>
                  <div className="trait-footer">
                    <div className="creator">
                      <img src={trait.creator.avatar || '/default-avatar.png'} alt="" className="creator-avatar-small" />
                      <span>{trait.creator.username}</span>
                    </div>
                    <span className="price">${trait.price}</span>
                  </div>
                </Link>
              ))}
            </div>

            {hasNextPage && (
              <div className="load-more">
                <button onClick={() => fetchNextPage()} className="load-more-button">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
