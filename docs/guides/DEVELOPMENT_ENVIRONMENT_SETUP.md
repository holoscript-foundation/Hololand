# 🏗️ Hololand Development Environment Setup

**Version**: 1.0  
**Created**: January 15, 2026  
**Purpose**: Complete directory structure, config templates, database schema, and development guides

---

## 📌 Sources of Truth
- Execution plan: PHASE_0_IMPLEMENTATION_PLAN.md
- Strategy & roadmap: HOLOLAND_GROWTH_STRATEGY.md
- Marketing & outreach: MARKETING_MATERIALS.md
- Templates: TEMPLATE_WORLDS_SOURCE.ts

This doc is the canonical reference for repo structure, environment, schema, and configs.

---

## 📁 Project Directory Structure

```
hololand/
├── .github/
│   ├── workflows/
│   │   ├── test.yml              # Run tests on PR
│   │   ├── deploy-staging.yml    # Deploy to staging on merge
│   │   └── deploy-production.yml # Production deployment
│   └── PULL_REQUEST_TEMPLATE.md
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── auth/
│   │   │   │   ├── signup/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── refresh/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── creators/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── [id]/worlds/route.ts
│   │   │   │   ├── [id]/earnings/route.ts
│   │   │   │   ├── [id]/tier-upgrade/route.ts
│   │   │   │   └── earnings/leaderboard/route.ts
│   │   │   ├── worlds/
│   │   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   │   ├── [id]/route.ts         # GET (single), PATCH, DELETE
│   │   │   │   ├── [id]/publish/route.ts # POST publish world
│   │   │   │   └── [id]/rate/route.ts    # POST submit rating
│   │   │   ├── payments/
│   │   │   │   ├── create-intent/route.ts
│   │   │   │   ├── webhook/route.ts
│   │   │   │   └── payouts/route.ts
│   │   │   ├── analytics/
│   │   │   │   ├── track/route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── leaderboard/route.ts
│   │   │   ├── reviews/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── follows/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── [id]/unfollow/route.ts
│   │   │   └── assets/
│   │   │       └── route.ts              # GET asset library
│   │   │
│   │   ├── dashboard/               # Creator dashboard pages
│   │   │   ├── page.tsx            # Home tab
│   │   │   ├── worlds/
│   │   │   │   ├── page.tsx        # Worlds tab
│   │   │   │   └── [id]/edit/page.tsx  # World editor
│   │   │   ├── earnings/page.tsx   # Earnings tab
│   │   │   ├── analytics/page.tsx  # Analytics tab
│   │   │   └── profile/page.tsx    # Profile tab
│   │   │
│   │   ├── builder/                 # No-code world builder
│   │   │   ├── page.tsx            # Builder shell
│   │   │   └── [id]/page.tsx       # Edit existing world
│   │   │
│   │   ├── worlds/                  # World discovery & play
│   │   │   ├── page.tsx            # Discovery feed
│   │   │   ├── [id]/page.tsx       # Play world
│   │   │   └── [id]/edit/page.tsx  # Edit world (if owned)
│   │   │
│   │   ├── creators/                # Creator profiles
│   │   │   ├── page.tsx            # Creator directory
│   │   │   └── [username]/page.tsx # Creator profile
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   └── globals.css
│   │
│   ├── components/                  # Reusable React components
│   │   ├── builder/
│   │   │   ├── AssetLibrary.tsx     # Asset search & grid
│   │   │   ├── Canvas3D.tsx         # Three.js canvas
│   │   │   ├── InspectorPanel.tsx   # Property editor
│   │   │   ├── Toolbar.tsx          # Save, preview, help
│   │   │   ├── AssetDragPreview.tsx # Visual feedback
│   │   │   └── gizmo/               # Move/rotate/scale tools
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── EarningsChart.tsx
│   │   │   ├── RecentActivity.tsx
│   │   │   ├── WorldsList.tsx
│   │   │   └── AnalyticsPanel.tsx
│   │   │
│   │   ├── worlds/
│   │   │   ├── WorldCard.tsx
│   │   │   ├── DiscoveryFeed.tsx
│   │   │   ├── WorldPlayer.tsx      # Play world
│   │   │   └── RatingModal.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── Header.tsx           # Nav bar
│   │   │   ├── Sidebar.tsx          # Side navigation
│   │   │   ├── Footer.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── SignupForm.tsx
│   │
│   ├── lib/                         # Utilities & helpers
│   │   ├── api-client.ts           # Fetch wrapper
│   │   ├── auth.ts                 # Auth context & hooks
│   │   ├── hooks.ts                # Custom hooks
│   │   ├── utils.ts                # Helper functions
│   │   ├── constants.ts            # App constants
│   │   └── types.ts                # Global types
│   │
│   ├── services/                    # Backend business logic
│   │   ├── auth.service.ts
│   │   ├── creators.service.ts
│   │   ├── worlds.service.ts
│   │   ├── payments.service.ts
│   │   ├── analytics.service.ts
│   │   ├── reviews.service.ts
│   │   └── email.service.ts
│   │
│   ├── db/                          # Database
│   │   ├── schema.ts               # Database types
│   │   ├── queries.ts              # SQL helpers
│   │   ├── migrations/             # Migration scripts
│   │   │   ├── 001_init.sql
│   │   │   ├── 002_indexes.sql
│   │   │   └── ...
│   │   └── seed.ts                 # Seed data
│   │
│   ├── storage/                     # File storage
│   │   ├── s3.ts                   # AWS S3 integration
│   │   ├── uploads.ts              # Upload handling
│   │   └── validation.ts           # File validation
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── api.ts
│   │   ├── world.ts
│   │   ├── user.ts
│   │   ├── transaction.ts
│   │   └── index.ts
│   │
│   ├── middleware/                  # Express/Next.js middleware
│   │   ├── auth.ts                 # JWT validation
│   │   ├── rate-limit.ts           # Rate limiting
│   │   ├── error-handler.ts        # Error handling
│   │   └── logging.ts              # Request logging
│   │
│   └── config/
│       ├── database.ts             # Database connection
│       └── stripe.ts               # Stripe config
│
├── __tests__/                       # Test files
│   ├── unit/
│   │   ├── auth.test.ts
│   │   ├── creators.test.ts
│   │   ├── payments.test.ts
│   │   └── ...
│   ├── integration/
│   │   ├── auth-flow.test.ts
│   │   ├── world-creation.test.ts
│   │   └── payment-flow.test.ts
│   ├── e2e/
│   │   ├── creator-journey.test.ts
│   │   └── visitor-journey.test.ts
│   └── setup.ts                    # Test configuration
│
├── public/                          # Static assets
│   ├── assets/
│   │   ├── templates/              # Template world previews
│   │   ├── icons/
│   │   └── images/
│   └── favicon.ico
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── SETUP.md                     # Developer setup guide
│   ├── ARCHITECTURE.md              # System architecture
│   ├── DATABASE.md                  # Database schema docs
│   └── DEPLOYMENT.md                # Deployment guide
│
├── scripts/                         # Utility scripts
│   ├── seed-database.ts             # Populate test data
│   ├── run-migrations.ts            # Database migrations
│   ├── generate-types.ts            # Generate TS from DB
│   └── backup-database.sh           # Database backup
│
├── .env.example                     # Environment template
├── .env.local                       # Local config (not in git)
├── .gitignore
├── .eslintrc.json                   # Linting rules
├── .prettierrc                      # Code formatting
├── tsconfig.json                    # TypeScript config
├── next.config.js                   # Next.js config
├── package.json
├── pnpm-lock.yaml
├── docker-compose.yml               # Local dev environment
├── Dockerfile                       # Production image
├── jest.config.js                   # Test configuration
└── README.md
```

---

## 📋 Configuration Files

### `.env.example`

```bash
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hololand
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-here-min-32-characters
JWT_EXPIRES_IN=7d

# Stripe (payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3 (file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=hololand-uploads

# Email (SendGrid)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=noreply@hololand.io

# Analytics
NEXT_PUBLIC_GA_ID=...

# Monitoring (Sentry)
SENTRY_DSN=...

# Third party APIs
OPENAI_API_KEY=...  # For AI NPC features (Phase 2)
```

---

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: hololand
      POSTGRES_PASSWORD: password
      POSTGRES_DB: hololand
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hololand"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

### `package.json`

```json
{
  "name": "hololand",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src --max-warnings 0",
    "format": "prettier --write 'src/**/*.{ts,tsx}'",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "db:migrate": "tsx scripts/run-migrations.ts",
    "db:seed": "tsx scripts/seed-database.ts",
    "db:reset": "tsx scripts/reset-database.ts"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^r150",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "zod": "^3.22.0",
    "stripe": "^13.0.0",
    "postgres": "^3.3.0",
    "redis": "^4.6.0",
    "@sendgrid/mail": "^7.7.0",
    "jsonwebtoken": "^9.1.0",
    "bcrypt": "^5.1.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.50.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0",
    "playwright": "^1.40.0",
    "ts-node": "^10.9.0",
    "tsx": "^4.1.0"
  }
}
```

---

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/services/*": ["./src/services/*"],
      "@/db/*": ["./src/db/*"]
    },
    "outDir": "./.next"
  },
  "include": ["src", "__tests__"],
  "exclude": ["node_modules", ".next"]
}
```

---

## 🗄️ Database Schema

### Core Tables (PostgreSQL)

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Worlds
CREATE TABLE worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(255),
  world_data JSONB NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  views INT DEFAULT 0,
  rating FLOAT DEFAULT 4.5,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_worlds_creator_id ON worlds(creator_id);
CREATE INDEX idx_worlds_published ON worlds(published, published_at DESC);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  world_id UUID REFERENCES worlds(id),
  amount_cents INT NOT NULL,
  creator_share_cents INT NOT NULL,
  platform_share_cents INT NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- More tables in PHASE_0_IMPLEMENTATION_PLAN.md
```

---

## 🚀 Development Setup Guide

### Prerequisites
- Node.js 20+
- pnpm (npm install -g pnpm)
- Docker Desktop
- PostgreSQL 15
- Redis 7

### Step 1: Clone & Install

```bash
git clone https://github.com/hololand/hololand.git
cd hololand
pnpm install
```

### Step 2: Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

### Step 3: Start Services

```bash
docker-compose up -d
```

### Step 4: Database Setup

```bash
pnpm run db:migrate
pnpm run db:seed
```

### Step 5: Start Development Server

```bash
pnpm run dev
```

Visit `http://localhost:3000`

---

## 🧪 Testing Setup

### Unit Tests

```bash
pnpm run test
```

### Test Coverage

```bash
pnpm run test:coverage
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Example Test File

```typescript
// __tests__/unit/creators.service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCreator, getCreator } from '@/services/creators.service';

describe('Creators Service', () => {
  let creatorId: string;

  beforeAll(async () => {
    // Setup test data
  });

  it('should create a creator', async () => {
    const creator = await createCreator({
      userId: 'test-user',
      tier: 'founding',
      revenuShare: 0.7
    });
    creatorId = creator.id;
    expect(creator.id).toBeDefined();
  });

  it('should get creator by id', async () => {
    const creator = await getCreator(creatorId);
    expect(creator.id).toBe(creatorId);
  });

  afterAll(async () => {
    // Cleanup
  });
});
```

---

## 📱 API Response Types

### Standard Success Response

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

### Standard Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // e.g., "INVALID_EMAIL"
    message: string;        // User-friendly message
    details?: unknown;      // Additional info
  };
}
```

### Example API Endpoint

```typescript
// src/app/api/creators/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreator } from '@/services/creators.service';
import { validateAuth } from '@/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creator = await getCreator(params.id);
    
    if (!creator) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Creator not found'
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: creator
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch creator'
        }
      },
      { status: 500 }
    );
  }
}
```

---

## 🔧 Common Development Tasks

### Add a New API Endpoint

1. Create route file: `src/app/api/[resource]/route.ts`
2. Implement handler (GET, POST, PATCH, DELETE)
3. Add to API documentation
4. Write tests in `__tests__/integration/`
5. Test in Postman/Insomnia

### Add a New Component

1. Create file: `src/components/[category]/ComponentName.tsx`
2. Use TypeScript + React best practices
3. Export from `src/components/index.ts`
4. Add to Storybook (optional)
5. Write tests if complex

### Database Migration

1. Create file: `src/db/migrations/NNN_description.sql`
2. Write SQL migration
3. Run: `pnpm run db:migrate`
4. Test: `pnpm run test`

### Add Environment Variable

1. Add to `.env.example`
2. Document in `docs/SETUP.md`
3. Use in code: `process.env.VAR_NAME`
4. Validate in `src/config/`

---

## 📚 Code Style Guide

### TypeScript

```typescript
// Always use interfaces for objects
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Use const assertions for readonly data
const ROLES = ['admin', 'creator', 'user'] as const;

// Use proper error handling
try {
  await action();
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle
  }
  throw new ApplicationError('Message', { cause: error });
}
```

### React Components

```typescript
// Use arrow functions
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  return <div>Component</div>;
};

// Use hooks for state
const [state, setState] = useState<StateType>(initial);

// Use custom hooks to extract logic
const useCustomLogic = () => {
  // Logic here
};
```

### CSS (Tailwind)

```typescript
// Use utility classes
<div className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg shadow">
  {/* Content */}
</div>

// Use @apply for repeated patterns
<style>
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition;
  }
</style>
```

---

## 🐛 Debugging

### Enable Debug Logging

```typescript
// Set environment variable
DEBUG=hololand:* npm run dev

// Or in code
if (process.env.DEBUG) {
  console.log('Debug info', data);
}
```

### Browser DevTools

- React DevTools (inspect component state)
- Redux DevTools (inspect Zustand store)
- Network tab (inspect API calls)
- Console (check for errors)

### Database Debugging

```bash
# Connect to postgres
docker exec -it postgres psql -U hololand -d hololand

# List tables
\dt

# Query data
SELECT * FROM users;
```

---

**Created**: January 15, 2026  
**Version**: 1.0  
**Status**: Ready for development  
**Maintenance**: Update as project evolves
