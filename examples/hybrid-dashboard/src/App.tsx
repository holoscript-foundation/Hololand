/**
 * Hybrid Dashboard App
 *
 * Features:
 * - 2D sidebar with controls
 * - 3D VR scene with data visualization
 * - Real-time updates between 2D and 3D
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import VRScene from './components/VRScene';
import './styles.css';

export interface DashboardData {
  dataPoints: number;
  visualization: 'bars' | 'spheres' | 'network';
  animate: boolean;
  color: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    dataPoints: 10,
    visualization: 'bars',
    animate: true,
    color: '#00ffff',
  });

  const [vrMode, setVRMode] = useState<'desktop' | 'vr'>('desktop');

  const handleDataChange = (newData: Partial<DashboardData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const enterVR = async () => {
    // In a real app, this would request WebXR session
    setVRMode('vr');
    console.log('Entering VR mode...');
  };

  const exitVR = () => {
    setVRMode('desktop');
    console.log('Exiting VR mode...');
  };

  return (
    <div className="app">
      {/* 2D UI Sidebar (always visible on desktop, hidden in VR) */}
      {vrMode === 'desktop' && (
        <Sidebar
          data={data}
          onDataChange={handleDataChange}
          onEnterVR={enterVR}
        />
      )}

      {/* 3D VR Scene (main content area) */}
      <VRScene
        data={data}
        vrMode={vrMode}
        onExitVR={exitVR}
      />

      {/* Stats overlay */}
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Mode:</span>
          <span className="stat-value">{vrMode === 'vr' ? 'VR' : 'Desktop'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Data Points:</span>
          <span className="stat-value">{data.dataPoints}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Visualization:</span>
          <span className="stat-value">{data.visualization}</span>
        </div>
      </div>
    </div>
  );
};

export default App;
