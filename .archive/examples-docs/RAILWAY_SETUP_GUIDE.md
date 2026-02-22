# 🚂 Railway Postgres Setup Guide

Complete guide to setting up Holoverse database on Railway.

---

## Quick Start

### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### 2. Add Postgres Service

```bash
# In Railway dashboard:
1. Click "New" → "Database" → "Add PostgreSQL"
2. Wait for deployment (~30 seconds)
3. Copy the connection string
```

### 3. Configure Environment

```bash
# Copy environment template
cp prisma/.env.example .env.local

# Edit .env.local with Railway connection string
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"
```

### 4. Install Dependencies

```bash
# Install Prisma
pnpm add -D prisma
pnpm add @prisma/client

# Initialize Prisma (already done, but for reference)
# npx prisma init
```

### 5. Push Schema to Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Railway Postgres
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 6. Seed Database (Optional)

```bash
# Run seed script
npx prisma db seed
```

---

## Detailed Setup

### Railway Dashboard Configuration

#### 1. Create Postgres Service

**Steps**:
1. Login to Railway
2. Create new project: "Holoverse"
3. Add Postgres: "New" → "Database" → "PostgreSQL"
4. Service will deploy automatically

#### 2. Get Connection String

**Location**: Railway Dashboard → Postgres Service → "Connect"

**Format**:
```
postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway
```

**Variables**:
- **Public URL**: For external connections (use this one)
- **Private URL**: For internal Railway services
- **Pooled**: For connection pooling (use in production)

#### 3. Environment Variables

Set these in Railway dashboard (Service → Variables):

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# ... etc (see .env.example)
```

### Local Development Setup

#### 1. Environment File

```bash
# Create .env.local (never commit this!)
cp prisma/.env.example .env.local
```

Edit `.env.local`:
```env
# Railway Postgres (from dashboard)
DATABASE_URL="postgresql://postgres:abc123@containers-us-west-123.railway.app:5432/railway"

# Local development
APP_URL="http://localhost:5173"
API_URL="http://localhost:3000"
NODE_ENV="development"

# Secrets (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
```

#### 2. Install Prisma

```bash
pnpm add -D prisma
pnpm add @prisma/client
```

#### 3. Generate Prisma Client

```bash
npx prisma generate
```

This creates the type-safe Prisma client based on `prisma/schema.prisma`.

#### 4. Push Schema to Database

```bash
# Push schema without migrations (good for development)
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate dev --name init
```

#### 5. Verify Database

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Should open http://localhost:5555
# You can browse all tables here
```

### Migration Management

#### Create Migration

```bash
# Create a new migration
npx prisma migrate dev --name add_user_preferences

# This will:
# 1. Generate SQL migration file
# 2. Apply migration to database
# 3. Regenerate Prisma client
```

#### Apply Migrations (Production)

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Use this in CI/CD pipeline
```

#### Reset Database (Development Only!)

```bash
# WARNING: Deletes all data!
npx prisma migrate reset

# This will:
# 1. Drop database
# 2. Recreate database
# 3. Apply all migrations
# 4. Run seed script (if configured)
```

### Seed Database

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const testUser = await prisma.user.create({
    data: {
      email: 'test@holoverse.io',
      subscriptionTier: 'free',
      isVerified: true,
      profile: {
        create: {
          username: 'testuser',
          displayName: 'Test User',
          bio: 'This is a test account',
        }
      }
    }
  });

  console.log('Created test user:', testUser);

  // Unlock adventure portal
  await prisma.portalUnlock.create({
    data: {
      userId: testUser.id,
      portalId: 'adventure',
      unlockedBy: 'initial_grant',
    }
  });

  // Create initial skills
  const skills = ['courage', 'imagination', 'resilience', 'wisdom', 'knowledge'];
  for (const skillName of skills) {
    await prisma.skillLevel.create({
      data: {
        userId: testUser.id,
        skillName,
        level: 0,
        experience: 0,
      }
    });
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Run seed:
```bash
npx prisma db seed
```

---

## Production Deployment

### 1. Railway Service Configuration

**Dockerfile** (optional, Railway auto-detects):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy app source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build app
RUN pnpm build

# Expose port
EXPOSE 3000

# Start app
CMD ["pnpm", "start"]
```

**railway.json**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && npx prisma generate && pnpm build"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Environment Variables (Production)

Set in Railway dashboard:

```bash
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway auto-fills this

# Secrets (generate secure values!)
JWT_SECRET="production-secret-xxxxx"
JWT_REFRESH_SECRET="production-refresh-secret-xxxxx"

# OAuth (production credentials)
GOOGLE_CLIENT_ID="prod-google-client-id"
GOOGLE_CLIENT_SECRET="prod-google-client-secret"

# Stripe (production keys)
STRIPE_SECRET_KEY="sk_live_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"

# URLs
APP_URL="https://holoverse.app"
API_URL="https://api.holoverse.app"
NODE_ENV="production"
```

### 3. Deploy Pipeline

```bash
# 1. Push to GitHub
git push origin main

# 2. Railway auto-deploys from GitHub
# (Set up in Railway dashboard: Settings → Service → GitHub Repo)

# 3. Monitor deployment
# Railway dashboard shows live logs

# 4. Verify deployment
curl https://api.holoverse.app/health
```

### 4. Database Backups

**Automatic Backups** (Railway Pro):
- Daily backups enabled by default
- 7-day retention
- Point-in-time recovery

**Manual Backup**:
```bash
# Backup from Railway
railway db backup

# Or use pg_dump
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Troubleshooting

### Connection Issues

**Problem**: "Can't reach database"
```bash
# Test connection
npx prisma db pull

# If fails, check:
1. DATABASE_URL is correct
2. Railway service is running
3. IP whitelist (if configured)
4. Network/firewall
```

**Problem**: "SSL required"
```bash
# Add to DATABASE_URL
DATABASE_URL="postgresql://...?sslmode=require"
```

### Migration Issues

**Problem**: "Migration failed"
```bash
# Check current state
npx prisma migrate status

# Mark as applied (if already manually applied)
npx prisma migrate resolve --applied 20230101120000_migration_name

# Roll back (development only!)
npx prisma migrate reset
```

### Performance Issues

**Problem**: "Slow queries"
```bash
# Enable query logging
DATABASE_URL="postgresql://...?log_statement=all"

# Check slow queries in Railway logs
# Add indexes if needed (in schema.prisma)
```

**Problem**: "Too many connections"
```bash
# Use connection pooling
DATABASE_URL_POOLED="postgresql://...?pgbouncer=true"

# Or use Prisma's connection pooling
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

---

## Monitoring

### Railway Metrics

**Available in Dashboard**:
- CPU usage
- Memory usage
- Network traffic
- Disk usage
- Active connections

### Custom Monitoring

Add to your app:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn('Slow query:', e.query, `${e.duration}ms`);
  }
});
```

---

## Cost Optimization

### Development

- **Free Tier**: $5/month credit (enough for small projects)
- **Hobby Plan**: $10/month (recommended for dev)

### Production

- **Pro Plan**: $20/month + usage
- **Database**: ~$5-15/month (depends on size)
- **Compute**: ~$10-30/month (depends on traffic)

**Optimization Tips**:
1. Use connection pooling
2. Add indexes to frequent queries
3. Enable query caching
4. Use read replicas for heavy read loads

---

## Security Best Practices

### 1. Environment Variables

```bash
# NEVER commit .env.local to git!
echo ".env.local" >> .gitignore

# Use different secrets for dev/prod
# Generate with: openssl rand -base64 32
```

### 2. Database Access

```bash
# Use Railway's private networking (if available)
DATABASE_URL=${{Postgres.PRIVATE_URL}}

# Limit database permissions
# Create app-specific user (not postgres superuser)
CREATE USER holoverse_app WITH PASSWORD 'xxx';
GRANT CONNECT ON DATABASE railway TO holoverse_app;
GRANT USAGE ON SCHEMA public TO holoverse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO holoverse_app;
```

### 3. Connection Security

```bash
# Require SSL
DATABASE_URL="postgresql://...?sslmode=require"

# Use connection pooling to limit connections
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=10"
```

---

## Next Steps

After database setup:

1. ✅ Database created and schema pushed
2. ⏳ Implement authentication system ([HoloversAuthSystem](./src/auth/))
3. ⏳ Build tRPC API routes ([API docs](./src/server/api/))
4. ⏳ Migrate QuestState to use database
5. ⏳ Add WebSocket for real-time sync
6. ⏳ Test with StoryWeaver demo

---

## Resources

- [Railway Docs](https://docs.railway.app)
- [Prisma Docs](https://www.prisma.io/docs)
- [Postgres Docs](https://www.postgresql.org/docs)
- [Holoverse Architecture](./HOLOVERSE_UNIFIED_ARCHITECTURE.md)

---

**Last Updated**: 2026-02-19
**Status**: Database schema complete, ready to deploy
