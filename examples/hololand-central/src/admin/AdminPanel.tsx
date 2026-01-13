import React, { useState } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { THEMES, THEME_NAMES } from '../themes/themes';

interface AdminPanelProps {
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentTheme, onThemeChange }) => {
  const { adminUser, disconnect } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'themes' | 'portals' | 'analytics'>('themes');

  if (!adminUser) return null;

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-title">
            <span className="admin-icon">🔐</span>
            <h2>Admin Control Center</h2>
          </div>
          <div className="admin-user">
            <span className="wallet-badge">{adminUser.shortAddress}</span>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            🎨 Themes
          </button>
          <button
            className={`tab ${activeTab === 'portals' ? 'active' : ''}`}
            onClick={() => setActiveTab('portals')}
          >
            🚪 Portals
          </button>
          <button
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {/* Content */}
        <div className="admin-content">
          {activeTab === 'themes' && (
            <div className="admin-section">
              <h3>Theme Management</h3>
              <p className="section-description">
                Select and preview themes. Changes apply immediately to all users.
              </p>

              <div className="theme-grid">
                {THEME_NAMES.map((themeName) => {
                  const theme = THEMES[themeName];
                  const isActive = currentTheme === themeName;

                  return (
                    <div
                      key={themeName}
                      className={`theme-card ${isActive ? 'active' : ''}`}
                      onClick={() => onThemeChange(themeName)}
                    >
                      <div className="theme-icon">{theme.icon}</div>
                      <div className="theme-name">{theme.displayName}</div>
                      <div className="theme-desc">{theme.description}</div>
                      {isActive && <div className="active-badge">ACTIVE</div>}
                    </div>
                  );
                })}
              </div>

              <div className="theme-schedule">
                <h4>Theme Schedule (Coming Soon)</h4>
                <p>Automatically rotate themes based on dates and events</p>
              </div>
            </div>
          )}

          {activeTab === 'portals' && (
            <div className="admin-section">
              <h3>Portal Configuration</h3>
              <p className="section-description">
                Manage portal visibility and destinations
              </p>

              <div className="portal-list">
                <div className="portal-item">
                  <span className="portal-icon">☕</span>
                  <span className="portal-label">Demo Shop</span>
                  <span className="portal-status enabled">Enabled</span>
                </div>
                <div className="portal-item">
                  <span className="portal-icon">👥</span>
                  <span className="portal-label">Social Lounge</span>
                  <span className="portal-status enabled">Enabled</span>
                </div>
                <div className="portal-item">
                  <span className="portal-icon">🎮</span>
                  <span className="portal-label">Physics Playground</span>
                  <span className="portal-status enabled">Enabled</span>
                </div>
                <div className="portal-item">
                  <span className="portal-icon">🎨</span>
                  <span className="portal-label">Art Gallery</span>
                  <span className="portal-status coming-soon">Coming Soon</span>
                </div>
                <div className="portal-item">
                  <span className="portal-icon">✨</span>
                  <span className="portal-label">Infinity Shop</span>
                  <span className="portal-status coming-soon">Coming Soon</span>
                </div>
              </div>

              <div className="portal-actions">
                <button className="btn-secondary">Add New Portal</button>
                <button className="btn-secondary">Configure Positions</button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="admin-section">
              <h3>Analytics Dashboard</h3>
              <p className="section-description">
                Real-time metrics and visitor statistics
              </p>

              <div className="analytics-grid">
                <div className="metric-card">
                  <div className="metric-label">Active Users</div>
                  <div className="metric-value">1</div>
                  <div className="metric-change">+0% from yesterday</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Visits Today</div>
                  <div className="metric-value">12</div>
                  <div className="metric-change">+25% from yesterday</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">VR Sessions</div>
                  <div className="metric-value">3</div>
                  <div className="metric-change">+50% from yesterday</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Avg. Session Time</div>
                  <div className="metric-value">4m 32s</div>
                  <div className="metric-change">+12% from yesterday</div>
                </div>
              </div>

              <div className="analytics-chart">
                <h4>Visitor Trends (Last 7 Days)</h4>
                <div className="chart-placeholder">
                  📈 Chart coming soon - integrate analytics service
                </div>
              </div>

              <div className="popular-worlds">
                <h4>Most Popular Worlds</h4>
                <ol>
                  <li>Physics Playground - 45 visits</li>
                  <li>Demo Shop - 32 visits</li>
                  <li>Social Lounge - 28 visits</li>
                  <li>Main Plaza - 120 visits</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="admin-footer">
          <button className="btn-danger" onClick={disconnect}>
            🔓 Disconnect Wallet
          </button>
          <div className="admin-info">
            Admin access granted • Hololand Central v1.0
          </div>
        </div>
      </div>

      <style>{`
        .admin-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        .admin-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid #667eea;
          border-radius: 16px;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          background: rgba(102, 126, 234, 0.1);
          border-bottom: 1px solid #667eea;
        }

        .admin-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-icon {
          font-size: 24px;
        }

        .admin-title h2 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
        }

        .admin-user {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .wallet-badge {
          background: rgba(102, 126, 234, 0.2);
          padding: 8px 16px;
          border-radius: 8px;
          color: #667eea;
          font-family: monospace;
          font-size: 14px;
        }

        .btn-close {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .btn-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .admin-tabs {
          display: flex;
          gap: 4px;
          padding: 0 30px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(102, 126, 234, 0.3);
        }

        .tab {
          background: none;
          border: none;
          color: #aaaaaa;
          padding: 16px 24px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
        }

        .tab:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .admin-content {
          flex: 1;
          overflow-y: auto;
          padding: 30px;
        }

        .admin-section h3 {
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 8px;
        }

        .section-description {
          color: #aaaaaa;
          margin-bottom: 24px;
        }

        .theme-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .theme-card {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          position: relative;
        }

        .theme-card:hover {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          transform: translateY(-2px);
        }

        .theme-card.active {
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
        }

        .theme-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .theme-name {
          color: #ffffff;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .theme-desc {
          color: #aaaaaa;
          font-size: 14px;
        }

        .active-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #ffd700;
          color: #000000;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        }

        .portal-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .portal-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }

        .portal-icon {
          font-size: 24px;
        }

        .portal-label {
          flex: 1;
          color: #ffffff;
          font-size: 16px;
        }

        .portal-status {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
        }

        .portal-status.enabled {
          background: rgba(0, 255, 0, 0.2);
          color: #00ff00;
        }

        .portal-status.coming-soon {
          background: rgba(255, 215, 0, 0.2);
          color: #ffd700;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 20px;
        }

        .metric-label {
          color: #aaaaaa;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .metric-value {
          color: #ffffff;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .metric-change {
          color: #00ff00;
          font-size: 14px;
        }

        .analytics-chart, .popular-worlds, .theme-schedule {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .analytics-chart h4, .popular-worlds h4, .theme-schedule h4 {
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 16px;
        }

        .chart-placeholder {
          text-align: center;
          padding: 40px;
          color: #aaaaaa;
          font-size: 18px;
        }

        .popular-worlds ol {
          color: #aaaaaa;
          margin: 0;
          padding-left: 24px;
        }

        .popular-worlds li {
          margin-bottom: 8px;
        }

        .admin-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(102, 126, 234, 0.3);
        }

        .btn-danger {
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff0000;
          color: #ff0000;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background: rgba(255, 0, 0, 0.3);
        }

        .btn-secondary {
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid #667eea;
          color: #667eea;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          margin-right: 12px;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: rgba(102, 126, 234, 0.3);
        }

        .admin-info {
          color: #aaaaaa;
          font-size: 14px;
        }

        .portal-actions {
          margin-top: 16px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
