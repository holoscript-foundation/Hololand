/**
 * Scenario Gallery Component
 *
 * Displays a browsable gallery of pre-configured avatar scenarios.
 * Each scenario is a complete combination of:
 * - Background/environment setting
 * - Clothing loadout
 * - Expression preset
 * - Camera angle
 * - Optional pose/animation
 *
 * Users can browse, preview, and apply scenarios to quickly set up their
 * avatar for specific contexts (professional, gaming, fantasy, etc.).
 *
 * Follows the gallery pattern from TemplateGallery in hololand-central
 * and integrates with the AvatarStudio facade for applying changes.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  ClothingSlot,
  AccessorySlot,
  ExpressionPreset,
  StudioViewAngle,
  BodyPreset,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

/** A complete avatar scenario definition */
export interface AvatarScenario {
  /** Unique scenario identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the scenario */
  description: string;
  /** Category for filtering */
  category: ScenarioCategory;
  /** Tags for search */
  tags: string[];
  /** Thumbnail image URL or data URL */
  thumbnailUrl: string;
  /** Background/environment setting to apply */
  background: 'studio-light' | 'studio-dark' | 'outdoor' | 'transparent';
  /** Camera angle to set */
  viewAngle: StudioViewAngle;
  /** Clothing loadout to equip */
  clothing: ClothingSlot[];
  /** Accessories to equip */
  accessories: AccessorySlot[];
  /** Expression to apply */
  expression?: ExpressionPreset;
  /** Suggested body preset */
  bodyPreset?: BodyPreset;
  /** Whether this is a featured/promoted scenario */
  featured: boolean;
  /** Difficulty/complexity rating */
  complexity: 'simple' | 'moderate' | 'detailed';
  /** Author/creator name */
  author: string;
  /** Number of times this scenario has been applied */
  usageCount: number;
  /** Average user rating (0-5) */
  rating: number;
}

export type ScenarioCategory =
  | 'professional'
  | 'casual'
  | 'fantasy'
  | 'scifi'
  | 'gaming'
  | 'social'
  | 'formal'
  | 'seasonal'
  | 'custom';

export interface ScenarioGalleryProps {
  /** Available scenarios to display */
  scenarios: AvatarScenario[];
  /** Callback when a scenario is selected for preview */
  onPreview?: (scenario: AvatarScenario) => void;
  /** Callback when a scenario is applied to the avatar */
  onApply?: (scenario: AvatarScenario) => void;
  /** Currently applied scenario ID (for highlighting) */
  activeScenarioId?: string;
  /** Whether the gallery is in a loading state */
  isLoading?: boolean;
  /** Custom CSS class name for the container */
  className?: string;
}

// =============================================================================
// CATEGORY METADATA
// =============================================================================

const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  professional: 'Professional',
  casual: 'Casual',
  fantasy: 'Fantasy',
  scifi: 'Sci-Fi',
  gaming: 'Gaming',
  social: 'Social',
  formal: 'Formal',
  seasonal: 'Seasonal',
  custom: 'Custom',
};

const CATEGORY_COLORS: Record<ScenarioCategory, string> = {
  professional: '#3B82F6',
  casual: '#10B981',
  fantasy: '#8B5CF6',
  scifi: '#06B6D4',
  gaming: '#EF4444',
  social: '#F59E0B',
  formal: '#1F2937',
  seasonal: '#EC4899',
  custom: '#6B7280',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ScenarioGallery: React.FC<ScenarioGalleryProps> = ({
  scenarios,
  onPreview,
  onApply,
  activeScenarioId,
  isLoading = false,
  className,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');

  // Derive available categories from the scenario data
  const availableCategories = useMemo(() => {
    const cats = new Set<ScenarioCategory>();
    scenarios.forEach((s) => cats.add(s.category));
    return Array.from(cats).sort();
  }, [scenarios]);

  // Filter and sort scenarios
  const filteredScenarios = useMemo(() => {
    let result = scenarios;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        result = [...result].sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'rating':
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        // Featured items first, then by ID (assuming newer IDs are higher)
        result = [...result].sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          return b.id.localeCompare(a.id);
        });
        break;
    }

    return result;
  }, [scenarios, selectedCategory, searchQuery, sortBy]);

  // Featured scenarios (shown at the top)
  const featuredScenarios = useMemo(
    () => filteredScenarios.filter((s) => s.featured),
    [filteredScenarios]
  );

  const handlePreview = useCallback(
    (scenario: AvatarScenario) => {
      onPreview?.(scenario);
    },
    [onPreview]
  );

  const handleApply = useCallback(
    (scenario: AvatarScenario) => {
      onApply?.(scenario);
    },
    [onApply]
  );

  if (isLoading) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Scenario Gallery</h2>
        <p style={styles.subtitle}>Apply pre-configured looks and settings to your avatar</p>
      </div>

      {/* Controls: Search + Category Filters + Sort */}
      <div style={styles.controls}>
        {/* Search */}
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            aria-label="Search scenarios"
          />
        </div>

        {/* Category Filters */}
        <div style={styles.categoryFilters} role="group" aria-label="Category filters">
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              ...styles.categoryButton,
              ...(selectedCategory === 'all' ? styles.categoryButtonActive : {}),
            }}
            aria-pressed={selectedCategory === 'all'}
          >
            All ({scenarios.length})
          </button>
          {availableCategories.map((category) => {
            const count = scenarios.filter((s) => s.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  ...styles.categoryButton,
                  ...(selectedCategory === category
                    ? {
                        ...styles.categoryButtonActive,
                        borderColor: CATEGORY_COLORS[category],
                        backgroundColor: `${CATEGORY_COLORS[category]}22`,
                      }
                    : {}),
                }}
                aria-pressed={selectedCategory === category}
              >
                {CATEGORY_LABELS[category]} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div style={styles.sortControls}>
          <label htmlFor="scenario-sort" style={styles.sortLabel}>
            Sort by:
          </label>
          <select
            id="scenario-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={styles.sortSelect}
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Featured Section */}
      {featuredScenarios.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div style={styles.featuredSection}>
          <h3 style={styles.sectionTitle}>Featured Scenarios</h3>
          <div style={styles.featuredGrid}>
            {featuredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={activeScenarioId === scenario.id}
                isFeatured
                onPreview={handlePreview}
                onApply={handleApply}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={styles.mainSection}>
        {filteredScenarios.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              No scenarios found
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={styles.clearButton}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div style={styles.scenarioGrid}>
            {filteredScenarios
              .filter((s) => !s.featured || selectedCategory !== 'all' || searchQuery)
              .map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isActive={activeScenarioId === scenario.id}
                  isFeatured={false}
                  onPreview={handlePreview}
                  onApply={handleApply}
                />
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          Showing {filteredScenarios.length} of {scenarios.length} scenarios
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// SCENARIO CARD COMPONENT
// =============================================================================

interface ScenarioCardProps {
  scenario: AvatarScenario;
  isActive: boolean;
  isFeatured: boolean;
  onPreview: (scenario: AvatarScenario) => void;
  onApply: (scenario: AvatarScenario) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  isActive,
  isFeatured,
  onPreview,
  onApply,
}) => {
  const categoryColor = CATEGORY_COLORS[scenario.category];

  return (
    <div
      style={{
        ...styles.card,
        ...(isActive ? styles.cardActive : {}),
        ...(isFeatured ? styles.cardFeatured : {}),
      }}
      role="article"
      aria-label={`Scenario: ${scenario.name}`}
    >
      {/* Thumbnail */}
      <div
        style={{
          ...styles.cardThumbnail,
          backgroundImage: `url(${scenario.thumbnailUrl})`,
          borderTopColor: categoryColor,
        }}
      >
        {isActive && <div style={styles.activeBadge}>Active</div>}
        <div style={styles.cardOverlay}>
          <button
            onClick={() => onPreview(scenario)}
            style={styles.previewButton}
            aria-label={`Preview ${scenario.name}`}
          >
            Preview
          </button>
          <button
            onClick={() => onApply(scenario)}
            style={styles.applyButton}
            aria-label={`Apply ${scenario.name}`}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Card Info */}
      <div style={styles.cardInfo}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>{scenario.name}</h4>
          <span
            style={{
              ...styles.categoryBadge,
              backgroundColor: `${categoryColor}22`,
              color: categoryColor,
              borderColor: categoryColor,
            }}
          >
            {CATEGORY_LABELS[scenario.category]}
          </span>
        </div>

        <p style={styles.cardDescription}>{scenario.description}</p>

        <div style={styles.cardMeta}>
          <span style={styles.metaItem}>{scenario.usageCount.toLocaleString()} uses</span>
          <span style={styles.metaItem}>
            {'*'.repeat(Math.round(scenario.rating))} {scenario.rating.toFixed(1)}
          </span>
          <span style={styles.metaItem}>{scenario.complexity}</span>
        </div>

        <div style={styles.cardTags}>
          {scenario.tags.slice(0, 4).map((tag) => (
            <span key={tag} style={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>

        <div style={styles.cardAuthor}>by {scenario.author}</div>
      </div>
    </div>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    color: '#333',
  },

  // Header
  header: {
    marginBottom: '0.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.9rem',
    color: '#666',
  },

  // Controls
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  searchBar: {
    display: 'flex',
  },
  searchInput: {
    flex: 1,
    padding: '0.6rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  categoryFilters: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  categoryButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f5f5f5',
    border: '2px solid transparent',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#555',
    transition: 'all 0.2s',
  },
  categoryButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    color: '#1976d2',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sortLabel: {
    fontSize: '0.85rem',
    color: '#666',
    fontWeight: 600,
  },
  sortSelect: {
    padding: '0.4rem 0.6rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.85rem',
    backgroundColor: 'white',
    cursor: 'pointer',
  },

  // Featured Section
  featuredSection: {
    marginTop: '0.5rem',
  },
  sectionTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },

  // Main Grid
  mainSection: {
    marginTop: '0.5rem',
  },
  scenarioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '1rem',
  },

  // Card
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    cursor: 'default',
  },
  cardActive: {
    borderColor: '#2196f3',
    boxShadow: '0 0 0 2px rgba(33, 150, 243, 0.3)',
  },
  cardFeatured: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  cardThumbnail: {
    width: '100%',
    height: '160px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#f0f0f0',
    borderTop: '3px solid transparent',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOverlay: {
    position: 'absolute' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  activeBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    padding: '0.2rem 0.5rem',
    backgroundColor: '#2196f3',
    color: 'white',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    zIndex: 1,
  },
  previewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  applyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },

  // Card Info
  cardInfo: {
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  categoryBadge: {
    padding: '0.15rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.7rem',
    fontWeight: 600,
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  cardDescription: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#666',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  cardMeta: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    fontSize: '0.75rem',
    color: '#888',
  },
  cardTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.25rem',
  },
  tag: {
    fontSize: '0.7rem',
    color: '#999',
    backgroundColor: '#f5f5f5',
    padding: '0.1rem 0.4rem',
    borderRadius: '3px',
  },
  cardAuthor: {
    fontSize: '0.75rem',
    color: '#aaa',
    fontStyle: 'italic',
  },

  // Empty/Loading States
  loadingState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    gap: '1rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e0e0e0',
    borderTopColor: '#2196f3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#666',
    fontSize: '0.9rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    gap: '1rem',
  },
  emptyText: {
    color: '#666',
    fontSize: '0.9rem',
  },
  clearButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },

  // Footer
  footer: {
    padding: '0.5rem 0',
    borderTop: '1px solid #eee',
  },
  footerText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#999',
    textAlign: 'center' as const,
  },
};

export default ScenarioGallery;
