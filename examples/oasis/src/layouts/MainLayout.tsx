import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-meadow-cream-light relative overflow-hidden">
      {/* Sky gradient overlay - top section */}
      <div
        className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(135, 206, 235, 0.15) 0%, transparent 100%)',
        }}
      />

      {/* Sunlight glow in top-right */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none animate-sunbeam"
        style={{
          background:
            'radial-gradient(circle at 70% 30%, rgba(255, 213, 79, 0.2) 0%, transparent 60%)',
        }}
      />

      {/* Decorative clouds */}
      <div className="absolute top-8 left-1/4 w-32 h-12 bg-white/40 rounded-full blur-sm animate-cloud-drift" />
      <div
        className="absolute top-16 left-1/2 w-48 h-14 bg-white/30 rounded-full blur-sm animate-cloud-drift-slow"
        style={{ animationDelay: '-20s' }}
      />
      <div
        className="absolute top-6 right-1/3 w-24 h-8 bg-white/35 rounded-full blur-sm animate-cloud-drift"
        style={{ animationDelay: '-40s' }}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
