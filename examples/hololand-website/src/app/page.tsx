'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Hero } from '@/components/Hero';
import { CreatorJourney } from '@/components/CreatorJourney';
import { Features } from '@/components/Features';
import { DualPath} from '@/components/DualPath';
import { EmailSignup } from '@/components/EmailSignup';
import { Stats } from '@/components/Stats';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-3xl">🌐</span>
              <span className="text-xl font-display font-bold gradient-text">
                HOLOLAND
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="hover:text-primary transition">
                Features
              </Link>
              <Link href="#journey" className="hover:text-primary transition">
                How It Works
              </Link>
              <Link
                href="https://github.com/brianonbased-dev/Hololand"
                className="hover:text-primary transition"
                target="_blank"
              >
                Docs
              </Link>
              <Link
                href="https://github.com/brianonbased-dev/Hololand"
                className="hover:text-primary transition"
                target="_blank"
              >
                GitHub
              </Link>
              <button className="btn btn-primary">Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* Creator Journey - THE KEY SECTION */}
      <section id="journey" className="py-20 bg-gray-800/50">
        <CreatorJourney />
      </section>

      {/* Dual Path - Creators vs Developers */}
      <section id="features" className="py-20">
        <DualPath />
      </section>

      {/* Features */}
      <Features />

      {/* Stats */}
      <Stats />

      {/* Email Signup CTA */}
      <section className="py-20 bg-gradient-holographic">
        <EmailSignup />
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
