'use client';

export function CreatorJourney() {
  const steps = [
    {
      icon: '❌',
      title: 'The Problem',
      subtitle: 'Barriers to Building in VR',
      points: [
        "I don't have a VR headset ($300-3,500)",
        "I don't know how to code",
        "I can't visualize 3D spaces",
        "I don't know where to start",
      ],
      color: 'from-red-500 to-red-700',
    },
    {
      icon: '💡',
      title: 'The Solution',
      subtitle: 'Infinity Builder - Start in 2D',
      points: [
        'Free browser-based 2D interface',
        'Drag-and-drop visual creator',
        'AI helps: "Create a coffee shop with 5 tables"',
        'Preview in 2D/3D before publishing',
      ],
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: '🚀',
      title: 'Export to Hololand',
      subtitle: 'Your Space Becomes VR/AR',
      points: [
        'One-click publish to Hololand',
        'Now viewable on Meta Quest, iPhone AR',
        'Share link: hololand.io/mycoffeeshop',
        'Anyone can visit in VR or desktop 3D',
      ],
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: '🎉',
      title: 'Experience & Grow',
      subtitle: 'Your Business in the Metaverse',
      points: [
        '"Wow, this looks amazing in VR!"',
        'Add AI agents (customer service, content creator)',
        'Enable e-commerce, sell products',
        'Earn $BRIAN tokens from visitors',
      ],
      color: 'from-purple-500 to-indigo-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
          The <span className="gradient-text">Creator Journey</span>
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          From &quot;I want to build in VR&quot; to &quot;I have a thriving virtual business&quot; in 4 simple steps
        </p>
      </div>

      {/* Journey Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, index) => (
          <div key={index} className="relative">
            {/* Connector Line (desktop only) */}
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute top-24 left-1/2 w-full h-1 bg-gradient-to-r from-white/20 to-white/5 z-0" />
            )}

            {/* Card */}
            <div className="card relative z-10 h-full">
              {/* Icon with gradient background */}
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-3xl mb-4 mx-auto`}
              >
                {step.icon}
              </div>

              {/* Step Number */}
              <div className="text-center mb-2">
                <span className="text-sm font-semibold text-gray-400">
                  STEP {index + 1}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-display font-bold text-center mb-2">
                {step.title}
              </h3>

              {/* Subtitle */}
              <p className="text-sm text-gray-400 text-center mb-4">
                {step.subtitle}
              </p>

              {/* Points */}
              <ul className="space-y-2">
                {step.points.map((point, pointIndex) => (
                  <li
                    key={pointIndex}
                    className="text-sm text-gray-300 flex items-start"
                  >
                    <span className="mr-2 text-primary flex-shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <div className="inline-block glass rounded-2xl p-8">
          <h3 className="text-2xl font-display font-bold mb-4">
            Ready to Start Your Journey?
          </h3>
          <p className="text-gray-300 mb-6 max-w-2xl">
            No VR headset required. No coding experience needed. Start building your virtual space in 2D today, and watch it come alive in VR tomorrow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn btn-primary text-lg px-8 py-4">
              Try Infinity Builder (FREE)
            </button>
            <a
              href="https://github.com/brianonbased-dev/Hololand"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-lg px-8 py-4"
            >
              View Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
