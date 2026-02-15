import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-oasis-bg flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-oasis-primary/20 via-transparent to-oasis-secondary/20 pointer-events-none" />

      {/* Animated orbs in background */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-oasis-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-oasis-secondary/10 rounded-full blur-3xl animate-pulse-slow" />

      {/* Auth content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient">Hololand Oasis</h1>
          <p className="text-oasis-text-muted mt-2">The Official Metaverse</p>
        </div>

        {/* Auth form container */}
        <div className="glass rounded-2xl p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
