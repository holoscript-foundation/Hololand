# Phase 0 Architecture Decision Records (ADR)

## ADR-001: Database Design - PostgreSQL with Supabase

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Backend Team

### Context
Hololand Phase 0 needs a scalable, reliable database for creator profiles, worlds, transactions, and analytics.

### Decision
Use PostgreSQL via Supabase with Row Level Security (RLS) and Real-time subscriptions.

### Rationale
- ✅ **Strong Consistency**: ACID transactions for payment processing
- ✅ **Scalability**: Handles 100+ concurrent creators, 1000+ worlds
- ✅ **Real-time**: Supabase subscriptions for live analytics updates
- ✅ **Security**: RLS policies prevent unauthorized data access
- ✅ **Cost**: Free tier suitable for Phase 0 (<500GB)

### Alternatives Considered
1. Firebase Firestore - Rejected (weak consistency for payments)
2. MongoDB - Rejected (no ACID transactions)
3. DynamoDB - Rejected (high cost, vendor lock-in)

### Consequences
- ✅ Type-safe queries with Supabase SDK
- ✅ Built-in authentication + JWT
- ⚠️ SQL knowledge required for complex queries
- ⚠️ Cold starts on Supabase free tier (first request slow)

### Mitigation
- Use connection pooling (PgBouncer via Supabase)
- Cache frequently accessed data (Redis in Phase 1)

---

## ADR-002: API Architecture - REST with NextJS

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Backend Team

### Decision
Use Next.js API routes (REST) for Phase 0, with migration path to GraphQL in Phase 1.

### Rationale
- ✅ **Speed to Market**: REST endpoints faster to implement
- ✅ **Simplicity**: Easy to test and reason about
- ✅ **Caching**: Standard HTTP caching (Etag, Cache-Control)
- ✅ **Framework Alignment**: Frontend already uses Next.js

### API Design Pattern
```
POST   /api/auth/signup           → Create account
POST   /api/auth/login            → Authenticate
GET    /api/creators/profile      → Creator info
PUT    /api/creators/profile      → Update profile
POST   /api/worlds                → Create world
GET    /api/worlds/:id            → Get world
PUT    /api/worlds/:id            → Update world
DELETE /api/worlds/:id            → Delete world
POST   /api/worlds/:id/publish    → Publish
GET    /api/analytics/worlds/:id  → Analytics
```

### Alternatives Considered
1. GraphQL - Deferred to Phase 1 (learning curve, over-engineered for MVP)
2. gRPC - Rejected (client-side complexity, no web support)

### Migration Path
Phase 1 will add GraphQL layer alongside REST for advanced clients.

---

## ADR-003: Authentication - JWT with Supabase Auth

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Security Team

### Decision
Use JWT tokens issued by Supabase Auth with 24-hour expiry and 7-day refresh tokens.

### Token Structure
```
Access Token (24h):
{
  "sub": "user_uuid",
  "email": "creator@example.com",
  "aud": "authenticated",
  "exp": 1705305600
}

Refresh Token (7d):
Stored in httpOnly cookie, never exposed to JS
```

### Security Measures
- ✅ Access tokens short-lived (24h)
- ✅ Refresh tokens in httpOnly cookies (CSRF-protected)
- ✅ Rate limiting on auth endpoints (5 attempts/minute)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Email verification required

### Rationale
- Stateless: No session database needed
- Scalable: No server-side state
- Standard: Works with all devices/APIs
- Supabase handles key rotation

---

## ADR-004: Payment Processing - Stripe Test Mode

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Payments Team

### Decision
Use Stripe in test mode for Phase 0, switch to production keys post-Week 3 testing.

### Payment Flow
```
1. Creator sets world price ($0.99 - $99.99)
2. Visitor clicks "Buy" → Create Stripe Checkout Session
3. Stripe processes payment (test mode = no real charges)
4. Webhook updates transaction status (pending → completed)
5. Creator earnings credited (70% of sale price)
6. Email sent to creator with payout info
```

### Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### 70/30 Split Logic
```
Sale Price: $10.00 (1000 cents)
Stripe Fee: ~$0.30 (3%)
Hololand Platform Fee: $3.00 (30% of sale)
Creator Earnings: $7.00 (70% of sale)

Stored in transactions table:
  total_amount: 1000
  platform_amount: 300
  creator_amount: 700
```

### Consequences
- ✅ Real payment processing (even if test mode)
- ✅ Creators experience production workflow
- ⚠️ Manual payout testing required
- ⚠️ Webhook testing needs Stripe CLI

---

## ADR-005: Frontend Architecture - Next.js 14 with React 18

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Frontend Team

### Decision
Use Next.js 14 (App Router) with React 18, TypeScript, and Tailwind CSS.

### Project Structure
```
apps/hololand-frontend/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/          # Main dashboard
│   │   └── worlds/             # World management
│   ├── (public)/
│   │   ├── worlds/[id]         # Public world view
│   │   └── creators/[id]       # Creator profiles
│   └── api/                    # API routes (auth, webhooks)
├── components/
│   ├── dashboard/              # Dashboard components
│   ├── builder/                # World builder UI
│   ├── common/                 # Shared components
│   └── layout/                 # Layout components
├── lib/
│   ├── api.ts                  # API client
│   ├── hooks/                  # Custom hooks
│   └── utils/                  # Utilities
└── styles/                     # Global styles
```

### Rationale
- ✅ **App Router**: Server components + streaming
- ✅ **Type Safety**: Full TypeScript
- ✅ **Performance**: Automatic code splitting, image optimization
- ✅ **DX**: Built-in dev server, fast refresh

### Performance Targets
- **Page Load**: <3 seconds (Lighthouse >80)
- **FCP**: <1 second (First Contentful Paint)
- **LCP**: <2.5 seconds (Largest Contentful Paint)
- **CLS**: <0.1 (Cumulative Layout Shift)

### State Management
- React Context for auth + global state
- Zustand for complex client state (optional Phase 1)
- SWR for data fetching + caching

---

## ADR-006: Real-time Features - Supabase Realtime

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Backend Team

### Decision
Use Supabase Realtime (PostgreSQL Change Data Capture) for:
- Analytics dashboards (live visit counters)
- Leaderboard updates
- Notification system

### Example: Live Analytics
```typescript
// Subscribe to visit events
supabase
  .channel(`world:${worldId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'analytics_events',
      filter: `world_id=eq.${worldId}`
    },
    (payload) => {
      updateVisitCount(payload.new);
    }
  )
  .subscribe();
```

### Benefits
- ✅ No additional infrastructure (built into Supabase)
- ✅ Real-time dashboards without polling
- ✅ Multiplayer-ready foundation (Phase 1)

### Limitations
- ⚠️ 250 concurrent connections per Supabase project
- ⚠️ 1MB message size limit
- Mitigation: Upgrade plan if needed, switch to WebSocket server in Phase 1

---

## ADR-007: Testing Strategy - Vitest + Playwright

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: QA Team

### Decision
- **Unit/Integration**: Vitest (70% coverage target)
- **E2E**: Playwright (critical user journeys)
- **Performance**: Lighthouse + Web Vitals monitoring

### Test Coverage by Module
```
Backend:
  - API routes: 80%+
  - Services: 75%+
  - Database: 60%+

Frontend:
  - Components: 70%+
  - Pages: 60%+
  - Hooks: 75%+

Overall Target: >70%
```

### Test Categories
1. **Unit Tests** (Vitest)
   - Individual functions, components
   - Mocked dependencies
   - <500ms per test

2. **Integration Tests** (Vitest)
   - API + Database
   - Service interactions
   - <1s per test

3. **E2E Tests** (Playwright)
   - Full user journeys
   - Critical paths (signup → publish → monetize)
   - Scheduled daily

4. **Performance Tests** (Lighthouse)
   - Page load time <3s
   - Cumulative Layout Shift <0.1
   - Scheduled weekly

### CI/CD Integration
```
GitHub Actions:
1. Unit tests: ~2 minutes
2. Integration tests: ~5 minutes
3. Build check: ~3 minutes
4. E2E tests (nightly): ~20 minutes
```

---

## ADR-008: Deployment & Infrastructure

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: DevOps Team

### Decision
- **Frontend**: Vercel (Next.js native, auto-deployments)
- **Backend**: Vercel Functions OR Railway (containers)
- **Database**: Supabase (managed PostgreSQL)
- **Storage**: Supabase Storage (file uploads)
- **CDN**: Vercel + Cloudflare (caching)

### Deployment Flow
```
Push to main branch
  ↓
GitHub Actions: Tests + Build
  ↓
If passing: Auto-deploy to staging
  ↓
Manual approval → Deploy to production
  ↓
Sentry + Datadog monitoring
  ↓
Alert on errors >0.1%
```

### Rollback Plan
```
If production critical error:
1. Revert to last stable commit
2. Trigger manual production deployment
3. Post-mortem meeting within 2 hours
4. Root cause analysis + fix
5. Re-deploy with verification
```

### Cost Estimation (Phase 0)
```
Vercel (Frontend): $0-20/month (free tier + overages)
Railway (Backend): ~$50-100/month (2GB RAM + DB)
Supabase: ~$25/month (free tier + extensions)
Cloudflare: $0 (free tier)
---
Total: ~$100/month
```

---

## ADR-009: Monitoring & Observability

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: DevOps + Backend Team

### Decision
Use open-source stack for cost-efficiency:
- **Error Tracking**: Sentry (free tier for Phase 0)
- **Logging**: Structured logs to Cloudwatch
- **Metrics**: StatsD + Prometheus (Phase 1)
- **APM**: Coming Phase 1

### SLO Targets
```
Uptime: 99.5% (30 minutes downtime allowed/month)
Error Rate: <0.1% (1 error per 1000 requests)
API Latency p95: <500ms
Page Load p95: <3 seconds
```

### Alerts
```
🚨 Critical:
  - 5xx error rate >1%
  - API latency p95 >1s
  - Database connection pool exhausted
  - Out of disk space

⚠️ Warning:
  - 4xx error rate spike
  - Slow queries (>1s)
  - Database CPU >80%
```

---

## ADR-010: Content Moderation & Safety

**Status**: Accepted  
**Date**: 2026-01-15  
**Authors**: Safety + Legal Team

### Decision
Phase 0 uses **community reporting + manual review**.

### Policy
- Users can report inappropriate worlds/reviews
- Manual review by moderation team within 24 hours
- Violating content removed + creator notified
- Repeated violations: Account suspension (3 strikes)

### Prohibited Content
- Explicit sexual content
- Violence or gore
- Hate speech or discrimination
- Copyright infringement
- Scams or deceptive content

### Automation (Phase 1)
- AI-powered content screening
- Auto-filter profanity
- Automated copyright detection

---

## ADR Revision History

| ADR | Status | Last Updated | Revision |
|-----|--------|--------------|----------|
| 001 | Accepted | 2026-01-15 | 1.0 |
| 002 | Accepted | 2026-01-15 | 1.0 |
| 003 | Accepted | 2026-01-15 | 1.0 |
| 004 | Accepted | 2026-01-15 | 1.0 |
| 005 | Accepted | 2026-01-15 | 1.0 |
| 006 | Accepted | 2026-01-15 | 1.0 |
| 007 | Accepted | 2026-01-15 | 1.0 |
| 008 | Accepted | 2026-01-15 | 1.0 |
| 009 | Accepted | 2026-01-15 | 1.0 |
| 010 | Accepted | 2026-01-15 | 1.0 |

---

**Next**: Each team reviews their ADRs. Propose Phase 1 ADRs by Feb 12.
