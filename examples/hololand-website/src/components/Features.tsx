'use client';

export function Features() {
  const features = [
    {
      icon: '🌐',
      title: 'Universal Platform',
      description: 'Build once, deploy to VR headsets, AR glasses, desktop, and mobile. True cross-platform metaverse.',
    },
    {
      icon: '⚛️',
      title: 'React + Three.js',
      description: 'Use familiar web technologies. React components meet spatial computing. No game engine required.',
    },
    {
      icon: '🗣️',
      title: 'Natural Language',
      description: '"Create a coffee shop with 5 tables" → Done. AI-powered creation for non-coders.',
    },
    {
      icon: '🎨',
      title: 'Visual Builder',
      description: 'Drag-and-drop 2D interface (Infinity Builder) or build in VR. Choose your creative flow.',
    },
    {
      icon: '📍',
      title: 'Geolocated Ownership',
      description: 'Tie creations to real places so worlds can unlock local utility, access, events, and ownership.',
    },
    {
      icon: '🧬',
      title: 'HoloScript Native',
      description: 'Consumes the MIT-licensed HoloScript source layer without claiming HoloLand itself is MIT.',
    },
  ];

  return (
    <section className="py-20 bg-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Why <span className="gradient-text">Hololand</span>?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            The most accessible way to build for the metaverse
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card group hover:border-primary/50 transition-all"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-display font-bold mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="glass rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-display font-bold mb-4">
              Powered by $BRIAN Token on Based Chain
            </h3>
            <p className="text-gray-300 mb-6">
              Hololand&apos;s native ecosystem currency. Pay for AI agents, claim property rights, buy/sell content, and participate in platform governance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="glass rounded-lg px-6 py-3">
                <div className="text-sm text-gray-400 mb-1">Contract Address</div>
                <code className="text-xs text-primary font-mono">
                  0x3ecced5b416e58664f04a39dD18935eB71D33B15
                </code>
              </div>
              <button className="btn btn-secondary">
                View on Based Scan
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
