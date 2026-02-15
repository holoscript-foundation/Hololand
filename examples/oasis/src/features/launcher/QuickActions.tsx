import { Link } from 'react-router-dom';

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <QuickActionCard
        to="/central"
        icon={<CentralIcon />}
        title="Enter Central"
        description="Join the downtown hub"
        gradient="from-meadow-grass to-meadow-grass-light"
        shadowColor="shadow-grass"
        highlight
      />
      <QuickActionCard
        to="/browse"
        icon={<BrowseIcon />}
        title="Browse Worlds"
        description="Discover new experiences"
        gradient="from-meadow-sky to-meadow-sky-light"
        shadowColor="shadow-md"
      />
      <QuickActionCard
        to="/create"
        icon={<CreateIcon />}
        title="Create World"
        description="Build with AI"
        gradient="from-meadow-terracotta to-meadow-terracotta-light"
        shadowColor="shadow-md"
      />
      <QuickActionCard
        to="/social"
        icon={<SocialIcon />}
        title="Social Hub"
        description="Friends & parties"
        gradient="from-meadow-golden to-meadow-sunlight"
        shadowColor="shadow-md"
      />
    </div>
  );
}

interface QuickActionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  shadowColor?: string;
  highlight?: boolean;
}

function QuickActionCard({
  to,
  icon,
  title,
  description,
  gradient,
  shadowColor = 'shadow-md',
  highlight,
}: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className={`
        card p-5 flex flex-col items-center text-center
        hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300
        ${highlight ? 'ring-2 ring-meadow-grass/40 bg-meadow-grass/5' : ''}
      `}
    >
      <div
        className={`
          w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient}
          flex items-center justify-center mb-4
          ${shadowColor}
          group-hover:scale-110 transition-transform
        `}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-meadow-text text-lg">{title}</h3>
      <p className="text-sm text-meadow-text-muted mt-1">{description}</p>

      {highlight && (
        <span className="mt-3 badge-grass">
          Popular
        </span>
      )}
    </Link>
  );
}

function CentralIcon() {
  return (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}
