# @hololand/frontend

**The web dashboard for Hololand - where creators build and manage VR worlds.**

## What It Does

- 🎨 **No-code builder** - Drag & drop to create VR scenes
- 📊 **Dashboard** - View your worlds, earnings, and analytics
- 👤 **Profile** - Manage your creator account
- 🛒 **Marketplace** - Browse and sell VR assets

## Quick Start

```bash
# Install
npm install

# Run locally
npm run dev

# Open http://localhost:3000
```

## Pages

| Page | What It Does |
|------|--------------|
| `/` | Home - Featured worlds |
| `/login` | Sign in or create account |
| `/dashboard` | Your stats and worlds |
| `/builder` | Create/edit a world |
| `/worlds/:id` | View a published world |
| `/marketplace` | Buy/sell assets |
| `/profile` | Your public profile |
| `/settings` | Account settings |

## Tech Stack

- **Next.js 15** - React framework
- **TailwindCSS** - Styling
- **React Three Fiber** - 3D rendering
- **Zustand** - State management

## Folder Structure

```
src/
├── app/           # Next.js pages
├── components/    # Reusable UI
├── hooks/         # Custom React hooks
├── lib/           # Utilities
└── styles/        # CSS
```

## For Developers

```bash
# Build for production
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Related Packages

- [@hololand/backend](../backend) - API server
- [@hololand/ui](../ui) - Shared components
- [@hololand/auth](../auth) - Login/signup helpers

## License

MIT
