'use client';

export function DualPath() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
          Two Paths to <span className="gradient-text">Creating</span>
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Whether you have a VR headset or not, you can build amazing experiences
        </p>
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Path A: No VR Headset */}
        <div className="card hover:border-purple-500/50 transition-all">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">💻</div>
            <h3 className="text-3xl font-display font-bold mb-2">
              No VR Headset?
            </h3>
            <p className="text-gray-400">Start building in 2D, export to VR</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <span className="text-2xl mr-3">🆓</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Infinity Builder</h4>
                <p className="text-sm text-gray-300">
                  FREE browser-based 2D creator tool
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">🎨</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Drag & Drop</h4>
                <p className="text-sm text-gray-300">
                  Visual interface - no coding required
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">🤖</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">AI Assistant</h4>
                <p className="text-sm text-gray-300">
                  "Create a coffee shop with 5 tables" → Done
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">📱</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Any Device</h4>
                <p className="text-sm text-gray-300">
                  Desktop, mobile, tablet - works everywhere
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">🚀</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Export to Hololand</h4>
                <p className="text-sm text-gray-300">
                  One-click publish to VR/AR when ready
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h4 className="font-semibold mb-3 text-center">Perfect for:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Business owners exploring VR
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Creators without VR hardware
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Testing ideas before VR investment
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Anyone new to the metaverse
              </li>
            </ul>
          </div>

          <button className="btn btn-primary w-full mt-6 text-lg">
            Try Infinity Builder (FREE)
          </button>
        </div>

        {/* Path B: Have VR Headset */}
        <div className="card hover:border-blue-500/50 transition-all">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🥽</div>
            <h3 className="text-3xl font-display font-bold mb-2">
              Have a VR Headset?
            </h3>
            <p className="text-gray-400">Build directly in Hololand VR</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <span className="text-2xl mr-3">🎮</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Build in VR</h4>
                <p className="text-sm text-gray-300">
                  Create spaces while immersed in them
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">🗣️</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Voice Commands</h4>
                <p className="text-sm text-gray-300">
                  Speak to create: "Add a table here"
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">✋</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Hand Tracking</h4>
                <p className="text-sm text-gray-300">
                  Grab, move, and scale objects naturally
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">⚡</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Real-time Preview</h4>
                <p className="text-sm text-gray-300">
                  See exactly what visitors will experience
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-3">🔧</span>
              <div>
                <h4 className="font-semibold text-lg mb-1">Visual Tools</h4>
                <p className="text-sm text-gray-300">
                  Built-in 3D editor with templates
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h4 className="font-semibold mb-3 text-center">Perfect for:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center">
                <span className="text-blue-400 mr-2">✓</span>
                VR enthusiasts and early adopters
              </li>
              <li className="flex items-center">
                <span className="text-blue-400 mr-2">✓</span>
                Designers who think in 3D
              </li>
              <li className="flex items-center">
                <span className="text-blue-400 mr-2">✓</span>
                Creators wanting full immersion
              </li>
              <li className="flex items-center">
                <span className="text-blue-400 mr-2">✓</span>
                Building complex spatial experiences
              </li>
            </ul>
          </div>

          <button className="btn btn-primary w-full mt-6 text-lg">
            Enter Hololand Central
          </button>
        </div>
      </div>

      {/* For Developers Section */}
      <div className="mt-16 card max-w-4xl mx-auto border-2 border-primary/30">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👨‍💻</div>
          <h3 className="text-3xl font-display font-bold mb-2">
            For Developers
          </h3>
          <p className="text-gray-400">Full control with code</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl mb-2">⚛️</div>
            <h4 className="font-semibold mb-1">React + Three.js</h4>
            <p className="text-sm text-gray-300">
              Build with familiar tools
            </p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">📦</div>
            <h4 className="font-semibold mb-1">NPM Packages</h4>
            <p className="text-sm text-gray-300">
              @hololand/core, @hololand/world
            </p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">🛠️</div>
            <h4 className="font-semibold mb-1">HoloScript</h4>
            <p className="text-sm text-gray-300">
              React-like spatial language
            </p>
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
          <pre className="text-sm text-gray-300 overflow-x-auto">
            <code>{`import { World, Entity } from '@hololand/core';

<World>
  <Entity position={[0, 0, 0]}>
    <CoffeeShop name="My Shop" />
  </Entity>
</World>`}</code>
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://github.com/brianonbased-dev/Hololand"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            View Documentation
          </a>
          <a
            href="https://github.com/brianonbased-dev/Hololand"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </div>
  );
}
