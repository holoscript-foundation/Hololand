import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { World } from '@/stores/worldStore';

interface FeaturedCarouselProps {
  worlds: World[];
}

export default function FeaturedCarousel({ worlds }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (worlds.length === 0) {
    return (
      <div className="h-64 card flex items-center justify-center">
        <p className="text-oasis-text-muted">No featured worlds available</p>
      </div>
    );
  }

  const currentWorld = worlds[currentIndex];

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % worlds.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + worlds.length) % worlds.length);
  };

  return (
    <div className="relative group">
      {/* Main carousel item */}
      <Link
        to={`/world/${currentWorld.id}`}
        className="block relative h-64 md:h-80 rounded-xl overflow-hidden"
      >
        {/* Background image */}
        {currentWorld.thumbnailUrl ? (
          <img
            src={currentWorld.thumbnailUrl}
            alt={currentWorld.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-oasis-primary to-oasis-secondary" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            {currentWorld.isFeatured && (
              <span className="bg-oasis-primary text-white text-xs font-medium px-2 py-1 rounded-full">
                Featured
              </span>
            )}
            {currentWorld.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{currentWorld.name}</h2>
          <p className="text-white/80 text-sm md:text-base max-w-2xl line-clamp-2">
            {currentWorld.description}
          </p>

          <div className="flex items-center gap-4 mt-4">
            <span className="btn-primary">Enter World</span>
            <div className="flex items-center gap-2 text-white/80">
              <UsersIcon className="w-4 h-4" />
              <span className="text-sm">{currentWorld.playerCount} playing now</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Navigation arrows */}
      {worlds.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              goToPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            aria-label="Previous world"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            aria-label="Next world"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {worlds.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {worlds.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
