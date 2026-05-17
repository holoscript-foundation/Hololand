export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-oasis-bg flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo/orb */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-oasis-primary to-oasis-secondary animate-spin"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute inset-2 rounded-full bg-oasis-bg" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-r from-oasis-primary to-oasis-secondary opacity-50 animate-pulse" />
        </div>

        <h2 className="text-xl font-semibold text-oasis-text mb-2">Loading Oasis</h2>
        <p className="text-oasis-text-muted text-sm">Preparing your experience...</p>
      </div>
    </div>
  );
}
