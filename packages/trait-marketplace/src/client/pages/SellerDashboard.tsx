import React, { useState } from 'react';
import { trpc } from '../App';
import { Editor } from '@monaco-editor/react';

export function SellerDashboard() {
  const { data: stats, isLoading } = trpc.getSellerStats.useQuery();
  const createTraitMutation = trpc.createTrait.useMutation();
  const updateTraitMutation = trpc.updateTrait.useMutation();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '@',
    displayName: '',
    description: '',
    longDescription: '',
    category: 'ANIMATION',
    tags: [] as string[],
    code: '',
    price: 0,
    license: 'PERSONAL' as 'PERSONAL' | 'COMMERCIAL' | 'UNLIMITED' | 'OPEN_SOURCE',
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTraitMutation.mutateAsync(formData);
      alert('Trait created successfully! It will be reviewed before going live.');
      setIsCreating(false);
      setFormData({
        name: '@',
        displayName: '',
        description: '',
        longDescription: '',
        category: 'ANIMATION',
        tags: [],
        code: '',
        price: 0,
        license: 'PERSONAL',
      });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const addTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput] });
      setTagInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="seller-dashboard">
        <div className="not-seller-message">
          <h2>Become a Seller</h2>
          <p>You need to register as a seller to create and sell traits.</p>
          <button className="primary-button">Register as Seller</button>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="dashboard-header">
        <h1>Seller Dashboard</h1>
        <button onClick={() => setIsCreating(!isCreating)} className="create-trait-button">
          {isCreating ? '← Back to Dashboard' : '+ Create New Trait'}
        </button>
      </div>

      {isCreating ? (
        <div className="create-trait-form">
          <h2>Create New Trait</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Trait Name (must start with @)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="@myAwesomeTrait"
                  pattern="^@[a-zA-Z_][a-zA-Z0-9_]*$"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="My Awesome Trait"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group full-width">
                <label>Short Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A brief description of what your trait does"
                  minLength={10}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group full-width">
                <label>Long Description (Optional)</label>
                <textarea
                  value={formData.longDescription}
                  onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  placeholder="Detailed description, usage examples, etc."
                  rows={4}
                  className="form-textarea"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-select"
                >
                  <option value="VISUAL">Visual</option>
                  <option value="ANIMATION">Animation</option>
                  <option value="PHYSICS">Physics</option>
                  <option value="INTERACTION">Interaction</option>
                  <option value="AUDIO">Audio</option>
                  <option value="NETWORKING">Networking</option>
                  <option value="VR">VR</option>
                  <option value="GAMEPLAY">Gameplay</option>
                  <option value="UI">UI</option>
                  <option value="PERFORMANCE">Performance</option>
                  <option value="WEATHER">Weather</option>
                  <option value="SOCIAL">Social</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price (USD)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>License</label>
                <select
                  value={formData.license}
                  onChange={(e) => setFormData({ ...formData, license: e.target.value as any })}
                  className="form-select"
                >
                  <option value="PERSONAL">Personal Use Only</option>
                  <option value="COMMERCIAL">Commercial Use</option>
                  <option value="UNLIMITED">Unlimited Use</option>
                  <option value="OPEN_SOURCE">Open Source</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tag-input-container">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                    className="form-input"
                  />
                  <button type="button" onClick={addTag} className="add-tag-button">
                    Add
                  </button>
                </div>
                <div className="tags-display">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })}
                        className="remove-tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group full-width">
                <label>Implementation Code</label>
                <div className="code-editor-container">
                  <Editor
                    height="400px"
                    defaultLanguage="typescript"
                    value={formData.code}
                    onChange={(value) => setFormData({ ...formData, code: value || '' })}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setIsCreating(false)} className="secondary-button">
                Cancel
              </button>
              <button type="submit" disabled={createTraitMutation.isLoading} className="primary-button">
                {createTraitMutation.isLoading ? 'Creating...' : 'Create Trait'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-label">Total Traits</div>
                <div className="stat-number">{stats.totalTraits}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-number">${stats.totalRevenue.toFixed(2)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <div className="stat-label">Total Sales</div>
                <div className="stat-number">{stats.totalSales}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">↓</div>
              <div className="stat-content">
                <div className="stat-label">Total Downloads</div>
                <div className="stat-number">{stats.totalDownloads}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👁</div>
              <div className="stat-content">
                <div className="stat-label">Total Views</div>
                <div className="stat-number">{stats.totalViews}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-label">Avg Rating</div>
                <div className="stat-number">{stats.avgRating.toFixed(1)}</div>
              </div>
            </div>

            <div className="stat-card seller-tier">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <div className="stat-label">Seller Tier</div>
                <div className="stat-number">{stats.sellerTier}</div>
              </div>
            </div>
          </div>

          {/* Traits Table */}
          <div className="traits-table-container">
            <h2>Your Traits</h2>
            <table className="traits-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Downloads</th>
                  <th>Views</th>
                  <th>Rating</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.traits.map((trait) => (
                  <tr key={trait.id}>
                    <td className="trait-name-cell">{trait.name}</td>
                    <td>{trait.downloads}</td>
                    <td>{trait.views}</td>
                    <td>⭐ {trait.rating.toFixed(1)}</td>
                    <td>${trait.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
