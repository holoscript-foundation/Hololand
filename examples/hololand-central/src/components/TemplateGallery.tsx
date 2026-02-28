/**
 * Template Gallery Component
 *
 * Displays the 10 Hero Templates in a browsable grid
 * Allows users to preview and remix templates
 */

import { useState, useMemo } from 'react';
import { trpc } from '../utils/trpc';
import './TemplateGallery.css';

interface TemplateGalleryProps {
  onSelectTemplate?: (templateId: string, holoScript: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  professional: '💼',
  nature: '🌳',
  scifi: '🚀',
  gaming: '🎮',
  entertainment: '🎨',
};

const CATEGORY_COLORS: Record<string, string> = {
  professional: '#3B82F6',
  nature: '#10B981',
  scifi: '#8B5CF6',
  gaming: '#EF4444',
  entertainment: '#F59E0B',
};

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch templates from database
  const { data: templates, isLoading } = trpc.creator.browseWorlds.useQuery({
    limit: 50,
  });

  // Filter templates (only show featured ones marked as templates)
  const heroTemplates = useMemo(() => {
    if (!templates) return [];

    return templates.filter((world) => {
      // Filter by template flag
      const isTemplate = (world.metadata as any)?.isTemplate === true;
      if (!isTemplate) return false;

      // Filter by category
      const category = (world.metadata as any)?.category;
      if (selectedCategory !== 'all' && category !== selectedCategory) {
        return false;
      }

      // Filter by search
      if (searchQuery && !world.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!templates) return [];
    const cats = new Set(
      templates
        .filter((w) => (w.metadata as any)?.isTemplate)
        .map((w) => (w.metadata as any)?.category)
        .filter(Boolean)
    );
    return Array.from(cats);
  }, [templates]);

  const handleRemix = (template: typeof heroTemplates[0]) => {
    if (onSelectTemplate && template.holoscriptSource) {
      onSelectTemplate(template.id, template.holoscriptSource);
    }
  };

  if (isLoading) {
    return (
      <div className="template-gallery">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-gallery">
      {/* Header */}
      <header className="gallery-header">
        <h1>🎨 Hero Templates</h1>
        <p className="subtitle">
          Start creating in seconds - browse, remix, and customize professional templates
        </p>
      </header>

      {/* Search & Filters */}
      <div className="gallery-controls">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filters">
          <button
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All ({heroTemplates.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
              style={{
                borderColor: selectedCategory === category ? CATEGORY_COLORS[category] : 'transparent'
              }}
            >
              {CATEGORY_ICONS[category] || '📦'} {category}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="template-grid">
        {heroTemplates.length === 0 ? (
          <div className="empty-state">
            <p>No templates found matching "{searchQuery}"</p>
            <button onClick={() => setSearchQuery('')}>Clear search</button>
          </div>
        ) : (
          heroTemplates.map((template) => {
            const metadata = template.metadata as any;
            const category = metadata?.category || 'other';
            const difficulty = metadata?.difficulty || 'beginner';
            const estimatedTime = metadata?.estimatedPlayTime || 10;

            return (
              <div key={template.id} className="template-card">
                {/* Thumbnail */}
                <div
                  className="template-thumbnail"
                  style={{
                    backgroundImage: `url(${template.thumbnailUrl})`,
                    borderTopColor: CATEGORY_COLORS[category]
                  }}
                >
                  <div className="template-overlay">
                    <button
                      className="remix-btn"
                      onClick={() => handleRemix(template)}
                    >
                      ✨ Remix
                    </button>
                    <button
                      className="preview-btn"
                      onClick={() => {
                        // TODO: Open preview modal
                        alert(`Preview: ${template.title}`);
                      }}
                    >
                      👁️ Preview
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="template-info">
                  <div className="template-header">
                    <h3>{template.title}</h3>
                    <span
                      className="category-badge"
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    >
                      {CATEGORY_ICONS[category] || '📦'} {category}
                    </span>
                  </div>

                  <p className="template-description">{template.description}</p>

                  <div className="template-meta">
                    <span className="meta-item">
                      ⏱️ ~{estimatedTime} min
                    </span>
                    <span className="meta-item">
                      📊 {difficulty}
                    </span>
                    <span className="meta-item">
                      👁️ {template.totalVisits || 0} views
                    </span>
                  </div>

                  <div className="template-tags">
                    {template.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {heroTemplates.length > 0 && (
        <footer className="gallery-footer">
          <p>
            Showing {heroTemplates.length} template{heroTemplates.length !== 1 ? 's' : ''}
          </p>
          <p className="help-text">
            💡 Click "Remix" to start editing • Click "Preview" to explore in 3D
          </p>
        </footer>
      )}
    </div>
  );
}
