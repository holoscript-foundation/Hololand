'use client';

/**
 * LandingPage
 *
 * Marketing landing page for the HoloLand platform public launch.
 * Responsive design with dark theme matching platform aesthetic.
 *
 * Sections:
 *   1. Hero section with tagline and CTA
 *   2. Featured worlds carousel (3 worlds from WorldPublishingService)
 *   3. Feature highlights (4 cards: Create, Collaborate, Trade, Explore)
 *   4. Creator spotlight (top 3 creators)
 *   5. Testimonials (3 quotes)
 *   6. Pricing section (Free/Pro/Enterprise tiers with feature comparison)
 *   7. Footer with navigation links
 *
 * @module pages/LandingPage
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FeaturedWorld {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  livePlayerCount: number;
  avgRating: number;
  category: string;
}

export interface CreatorSpotlight {
  id: string;
  name: string;
  avatarUrl?: string;
  worldCount: number;
  bio?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatarUrl?: string;
}

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export interface LandingPageProps {
  /** Featured worlds data. If not provided, uses placeholder data. */
  featuredWorlds?: FeaturedWorld[];
  /** Creator spotlight data. If not provided, uses placeholder data. */
  creators?: CreatorSpotlight[];
  /** Signup URL. Default: '/signup'. */
  signupUrl?: string;
  /** API base URL for fetching dynamic data. */
  apiBaseUrl?: string;
}

// =============================================================================
// Placeholder Data
// =============================================================================

const PLACEHOLDER_WORLDS: FeaturedWorld[] = [
  {
    id: 'world-1',
    title: 'Neon Nexus',
    description: 'A cyberpunk metropolis with interactive holographic billboards and flying vehicles.',
    thumbnailUrl: undefined,
    creatorName: 'CyberArtist',
    livePlayerCount: 42,
    avgRating: 4.8,
    category: 'games',
  },
  {
    id: 'world-2',
    title: 'Crystal Caverns',
    description: 'Explore underground crystal formations with dynamic lighting and spatial audio.',
    thumbnailUrl: undefined,
    creatorName: 'GeoCreator',
    livePlayerCount: 28,
    avgRating: 4.6,
    category: 'art',
  },
  {
    id: 'world-3',
    title: 'Zero-G Academy',
    description: 'A floating educational campus where physics lessons come alive in zero gravity.',
    thumbnailUrl: undefined,
    creatorName: 'EduVR',
    livePlayerCount: 15,
    avgRating: 4.9,
    category: 'education',
  },
];

const PLACEHOLDER_CREATORS: CreatorSpotlight[] = [
  { id: 'c1', name: 'CyberArtist', worldCount: 12, bio: 'Building the future of spatial entertainment' },
  { id: 'c2', name: 'GeoCreator', worldCount: 8, bio: 'Sculpting VR landscapes from real geological data' },
  { id: 'c3', name: 'EduVR', worldCount: 15, bio: 'Making education immersive and unforgettable' },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'HoloLand changed how our team collaborates. Virtual brainstorms are now our most productive meetings.',
    author: 'Sarah Chen',
    role: 'Head of Product, TechCorp',
  },
  {
    quote: 'I went from zero VR experience to publishing my first world in under a week. The tools are incredibly intuitive.',
    author: 'Marcus Rivera',
    role: 'Independent Creator',
  },
  {
    quote: 'Our students retention improved 40% after we moved hands-on labs into HoloLand spatial environments.',
    author: 'Dr. Aiko Tanaka',
    role: 'Professor, Stanford VR Lab',
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    title: 'Create',
    description: 'Build immersive 3D worlds with HoloScript, our spatial programming language. No game engine required.',
    icon: 'create',
  },
  {
    title: 'Collaborate',
    description: 'Work together in real-time with spatial voice, shared workspaces, and multi-user editing.',
    icon: 'collaborate',
  },
  {
    title: 'Trade',
    description: 'Publish and monetize your worlds and assets on the HoloLand marketplace. Earn from your creativity.',
    icon: 'trade',
  },
  {
    title: 'Explore',
    description: 'Discover thousands of worlds created by a global community. Games, art, education, and more.',
    icon: 'explore',
  },
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 3 published worlds',
      '50 assets per world',
      'Community support',
      'Basic analytics',
      '500 MB storage',
      'Public world sharing',
    ],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For serious creators',
    features: [
      'Up to 30 published worlds',
      '500 assets per world',
      'Priority support',
      'Advanced analytics',
      '10 GB storage',
      'Custom domains',
      'Marketplace access',
      'Revenue sharing (85%)',
      'Early access features',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and organizations',
    features: [
      'Unlimited worlds',
      'Unlimited assets',
      'Dedicated support',
      'Enterprise analytics',
      'Unlimited storage',
      'Custom branding',
      'SSO & team management',
      'Revenue sharing (90%)',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact Sales',
  },
];

// =============================================================================
// Icon Components
// =============================================================================

function FeatureIcon({ type }: { type: string }) {
  const iconClass = 'w-8 h-8 text-indigo-400';

  switch (type) {
    case 'create':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'collaborate':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'trade':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case 'explore':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <StarIcon key={star} filled={star <= Math.round(rating)} />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function LandingPage({
  featuredWorlds: propWorlds,
  creators: propCreators,
  signupUrl = '/signup',
  apiBaseUrl,
}: LandingPageProps) {
  const [featuredWorlds, setFeaturedWorlds] = useState<FeaturedWorld[]>(propWorlds ?? PLACEHOLDER_WORLDS);
  const [creators, setCreators] = useState<CreatorSpotlight[]>(propCreators ?? PLACEHOLDER_CREATORS);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % featuredWorlds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredWorlds.length]);

  // Fetch dynamic data if apiBaseUrl is provided
  useEffect(() => {
    if (!apiBaseUrl) return;

    (async () => {
      try {
        const [worldsRes, creatorsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/worlds/featured?limit=3`).catch(() => null),
          fetch(`${apiBaseUrl}/creators/top?limit=3`).catch(() => null),
        ]);

        if (worldsRes?.ok) {
          const data = await worldsRes.json();
          if (data.data && data.data.length > 0) {
            setFeaturedWorlds(data.data);
          }
        }

        if (creatorsRes?.ok) {
          const data = await creatorsRes.json();
          if (data.data && data.data.length > 0) {
            setCreators(data.data);
          }
        }
      } catch {
        // Use placeholder data on failure
      }
    })();
  }, [apiBaseUrl]);

  // ============================================================================
  // SECTION 1: Hero
  // ============================================================================

  const heroSection = (
    <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 via-gray-950 to-gray-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
          Build Worlds.{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Share Experiences.
          </span>{' '}
          <br className="hidden sm:block" />
          Go Spatial.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
          HoloLand is the platform for creating, sharing, and monetizing immersive
          spatial experiences. Build VR/AR worlds with code, collaborate in real-time,
          and reach a global audience.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={signupUrl}
            className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
          >
            Start Building Free
          </a>
          <a
            href="#featured-worlds"
            className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 text-white font-semibold text-lg rounded-xl hover:bg-gray-700 transition-colors"
          >
            Explore Worlds
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          No credit card required. Free tier includes 3 published worlds.
        </p>
      </div>
    </section>
  );

  // ============================================================================
  // SECTION 2: Featured Worlds Carousel
  // ============================================================================

  const featuredWorldsSection = (
    <section id="featured-worlds" className="px-4 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Featured Worlds</h2>
          <p className="mt-3 text-gray-400">Discover what creators are building on HoloLand</p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredWorlds.map((world, index) => (
              <div
                key={world.id}
                className={`group bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-indigo-500/30 transition-all duration-300 ${
                  index === carouselIndex ? 'md:ring-2 md:ring-indigo-500/30' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center">
                  {world.thumbnailUrl ? (
                    <img
                      src={world.thumbnailUrl}
                      alt={world.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-indigo-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-400 uppercase tracking-wide">
                      {world.category}
                    </span>
                    <StarRating rating={world.avgRating} />
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                    {world.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {world.description}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                        {world.creatorAvatarUrl ? (
                          <img src={world.creatorAvatarUrl} alt={world.creatorName} className="w-full h-full rounded-full" />
                        ) : (
                          <span className="text-xs text-gray-400">{world.creatorName[0]}</span>
                        )}
                      </div>
                      <span className="text-gray-400">{world.creatorName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs">{world.livePlayerCount} online</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel dots */}
          <div className="flex justify-center gap-2 mt-6 md:hidden">
            {featuredWorlds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === carouselIndex ? 'bg-indigo-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // SECTION 3: Feature Highlights
  // ============================================================================

  const featureHighlightsSection = (
    <section className="px-4 py-20 sm:py-24 bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything you need to go spatial
          </h2>
          <p className="mt-3 text-gray-400 max-w-xl mx-auto">
            From creation to monetization, HoloLand gives you the complete toolkit for immersive experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURE_HIGHLIGHTS.map(feature => (
            <div key={feature.title} className="text-center sm:text-left">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto sm:mx-0 mb-4">
                <FeatureIcon type={feature.icon} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // SECTION 4: Creator Spotlight
  // ============================================================================

  const creatorSpotlightSection = (
    <section className="px-4 py-20 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Creator Spotlight</h2>
          <p className="mt-3 text-gray-400">Meet the builders shaping the spatial web</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {creators.map(creator => (
            <div
              key={creator.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center hover:border-indigo-500/30 transition-colors"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {creator.name[0]}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white">{creator.name}</h3>
              <p className="text-indigo-400 text-sm mb-2">{creator.worldCount} worlds published</p>
              {creator.bio && (
                <p className="text-gray-500 text-sm">{creator.bio}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // SECTION 5: Testimonials
  // ============================================================================

  const testimonialSection = (
    <section className="px-4 py-20 sm:py-24 bg-gray-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">What people are saying</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, idx) => (
            <div
              key={idx}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6"
            >
              {/* Quote mark */}
              <svg className="w-8 h-8 text-indigo-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>

              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{testimonial.author}</p>
                  <p className="text-gray-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // SECTION 6: Pricing
  // ============================================================================

  const pricingSection = (
    <section id="pricing" className="px-4 py-20 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-gray-400">
            Start free, scale when you are ready. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRICING_TIERS.map(tier => (
            <div
              key={tier.name}
              className={`relative bg-gray-900 rounded-xl border p-8 flex flex-col ${
                tier.highlighted
                  ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                  : 'border-gray-800'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{tier.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && (
                    <span className="text-gray-400 text-sm">{tier.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.name === 'Enterprise' ? 'mailto:sales@hololand.io' : signupUrl}
                className={`block text-center py-3 px-4 rounded-lg font-semibold transition-colors ${
                  tier.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ============================================================================
  // SECTION 7: Footer
  // ============================================================================

  const footerSection = (
    <footer className="px-4 py-12 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2">
              <li><a href="/worlds" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Explore Worlds</a></li>
              <li><a href="/marketplace" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Marketplace</a></li>
              <li><a href="#pricing" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Pricing</a></li>
              <li><a href="/changelog" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2">
              <li><a href="/docs" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Documentation</a></li>
              <li><a href="/docs/holoscript" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">HoloScript Guide</a></li>
              <li><a href="/blog" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Blog</a></li>
              <li><a href="/community" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Community</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2">
              <li><a href="/about" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">About</a></li>
              <li><a href="/careers" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Careers</a></li>
              <li><a href="/press" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Press</a></li>
              <li><a href="mailto:hello@hololand.io" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              <li><a href="/terms" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Privacy Policy</a></li>
              <li><a href="/cookies" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Cookie Policy</a></li>
              <li><a href="/security" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              HoloLand
            </span>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} HoloLand. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="https://twitter.com/hololand" className="text-gray-500 hover:text-gray-300 transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
            </a>
            <a href="https://github.com/hololand" className="text-gray-500 hover:text-gray-300 transition-colors" aria-label="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
            <a href="https://discord.gg/hololand" className="text-gray-500 hover:text-gray-300 transition-colors" aria-label="Discord">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );

  // ============================================================================
  // FULL PAGE
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {heroSection}
      {featuredWorldsSection}
      {featureHighlightsSection}
      {creatorSpotlightSection}
      {testimonialSection}
      {pricingSection}
      {footerSection}
    </div>
  );
}

export default LandingPage;
