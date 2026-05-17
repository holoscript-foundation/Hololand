import { Link } from 'react-router-dom';
import type { World } from '@/stores/worldStore';

interface WorldCardProps {
  world: World;
  compact?: boolean;
}

export default function WorldCard({ world, compact = false }: WorldCardProps) {
  return (
    <Link to={`/world/${world.id}`} className="card-hover group overflow-hidden">
      {/* Thumbnail */}
      <div className={`relative ${compact ? 'h-32' : 'h-44'} overflow-hidden`}>
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-meadow-sky-light/40 to-meadow-grass/30 flex items-center justify-center">
            <WorldIcon className="w-14 h-14 text-meadow-text-muted/50" />
          </div>
        )}

        {/* Player count badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
          <UsersIcon className="w-3.5 h-3.5 text-meadow-text-muted" />
          <span className="text-xs font-medium text-meadow-text">
            {world.playerCount}/{world.maxPlayers}
          </span>
        </div>

        {/* Featured badge */}
        {world.isFeatured && (
          <div className="absolute top-3 left-3 bg-meadow-golden/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
            <span className="text-xs text-meadow-text font-semibold flex items-center gap-1">
              <StarIcon className="w-3 h-3" />
              Featured
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-meadow-text/80 via-meadow-text/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <span className="btn-primary text-sm shadow-lg">Join World</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-meadow-text truncate text-lg">{world.name}</h3>
        <p className="text-sm text-meadow-text-muted line-clamp-2 mt-1.5 leading-relaxed">
          {world.description}
        </p>

        {/* Tags */}
        {world.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {world.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge-sky">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Owner */}
        <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-meadow-text/10">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-meadow-grass to-meadow-grass-light shadow-sm" />
          <span className="text-sm text-meadow-text-muted">{world.ownerName}</span>
        </div>
      </div>
    </Link>
  );
}

function WorldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
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

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
