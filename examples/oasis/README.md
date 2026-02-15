# Hololand Oasis

The official Hololand metaverse app - a World Hub/Launcher for discovering, creating, and sharing VR/AR experiences.

## Features

- **Launcher/Home** - Browse featured worlds, quick actions, friends online
- **World Browser** - Discover new experiences with search and filters
- **Social Suite** - Friends, parties, voice chat, notifications
- **Creator Studio** - Build worlds with Brittney AI assistance
- **Hololand Central** - Downtown hub with Plaza, Casino, Arcade, and more

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Three.js + React Three Fiber
- Zustand (state management)
- React Router v6

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Railway Deployment

This project uses the **Training Monkey repo pattern** for Railway deployment.

### Quick Deploy

1. Connect your GitHub repo to Railway
2. Railway auto-detects the Dockerfile
3. Environment variables are configured via Railway dashboard

### Manual Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Required variables for production:
- `VITE_API_URL` - Backend API endpoint
- `VITE_WS_URL` - WebSocket server for multiplayer
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Project Structure

```
src/
├── components/     # Shared UI components
├── features/       # Feature-specific components
│   ├── launcher/   # World cards, carousel, etc.
│   ├── social/     # Friends, parties, chat
│   └── creator/    # World editor, AI assistant
├── layouts/        # Page layouts
├── pages/          # Route pages
├── stores/         # Zustand state stores
├── styles/         # Global CSS
└── config/         # App configuration
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Integration with Hololand Packages

This app integrates with the Hololand ecosystem:

- `@hololand/auth` - Authentication via Supabase
- `@hololand/social` - Friends, parties, presence
- `@hololand/network` - Multiplayer WebSocket
- `@hololand/ai-bridge` - Brittney AI integration

## License

MIT - Hololand
