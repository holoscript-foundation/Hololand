'use client';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(102,126,234,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(102,126,234,0.05)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center glass rounded-full px-6 py-2 mb-8 animate-float">
          <span className="text-sm font-semibold">
            ✨ Open Source • MIT License • $BRIAN Token
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 leading-tight">
          Build the Open
          <br />
          <span className="gradient-text">Metaverse</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
          Create immersive AR/VR experiences using React and natural language.
        </p>
        <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          <span className="text-green-400 font-semibold">No VR headset required to start.</span> Build once, deploy everywhere.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button className="btn btn-primary text-lg px-8 py-4 glow">
            🆓 Try Infinity Builder (FREE)
          </button>
          <button className="btn btn-secondary text-lg px-8 py-4">
            🥽 Enter Hololand Central
          </button>
          <a
            href="https://github.com/brianonbased-dev/Hololand"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary text-lg px-8 py-4"
          >
            📚 View Docs
          </a>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto glass rounded-2xl p-8">
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              100%
            </div>
            <div className="text-sm text-gray-400">Open Source</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              FREE
            </div>
            <div className="text-sm text-gray-400">To Start Building</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              8+
            </div>
            <div className="text-sm text-gray-400">NPM Packages</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              VR/AR
            </div>
            <div className="text-sm text-gray-400">Desktop/Mobile</div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-16 animate-bounce">
          <svg
            className="w-6 h-6 mx-auto text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  );
}
