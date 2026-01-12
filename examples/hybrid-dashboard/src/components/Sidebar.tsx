/**
 * 2D UI Sidebar Component
 *
 * Provides controls for manipulating the 3D VR scene
 * Built using standard React - will integrate @hololand/ui in Phase 2
 */

import React from 'react';
import { DashboardData } from '../App';

interface SidebarProps {
  data: DashboardData;
  onDataChange: (data: Partial<DashboardData>) => void;
  onEnterVR: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ data, onDataChange, onEnterVR }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>🌐 Hololand</h1>
        <p className="subtitle">Hybrid Dashboard</p>
      </div>

      <div className="control-section">
        <h3>Data Controls</h3>

        <div className="control">
          <label>Data Points: {data.dataPoints}</label>
          <input
            type="range"
            min="5"
            max="50"
            value={data.dataPoints}
            onChange={(e) => onDataChange({ dataPoints: parseInt(e.target.value) })}
            className="slider"
          />
        </div>

        <div className="control">
          <label>Visualization Type</label>
          <select
            value={data.visualization}
            onChange={(e) => onDataChange({ visualization: e.target.value as any })}
            className="select"
          >
            <option value="bars">Bar Chart</option>
            <option value="spheres">Sphere Cloud</option>
            <option value="network">Network Graph</option>
          </select>
        </div>

        <div className="control">
          <label>Color</label>
          <input
            type="color"
            value={data.color}
            onChange={(e) => onDataChange({ color: e.target.value })}
            className="color-picker"
          />
        </div>

        <div className="control checkbox-control">
          <input
            type="checkbox"
            id="animate"
            checked={data.animate}
            onChange={(e) => onDataChange({ animate: e.target.checked })}
          />
          <label htmlFor="animate">Enable Animation</label>
        </div>
      </div>

      <div className="control-section">
        <h3>Rendering Mode</h3>

        <button className="vr-button" onClick={onEnterVR}>
          🥽 Enter VR Mode
        </button>

        <p className="help-text">
          Switch to immersive VR mode to explore your data in 3D space
        </p>
      </div>

      <div className="info-section">
        <h3>About</h3>
        <p className="info-text">
          This hybrid app demonstrates Hololand's universal platform:
        </p>
        <ul className="info-list">
          <li>✅ Works on desktop</li>
          <li>✅ Works on mobile</li>
          <li>✅ Works in VR</li>
          <li>✅ 2D + 3D in one app</li>
        </ul>
      </div>

      <div className="footer">
        <p>Built with @hololand/core</p>
        <p className="version">v1.0.0-alpha.1</p>
      </div>
    </div>
  );
};

export default Sidebar;
