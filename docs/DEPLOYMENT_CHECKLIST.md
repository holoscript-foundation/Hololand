# Phase 0 Deployment Checklist

## Pre-Launch (Week 4, Jan 29 - Feb 4)

### Database & Infrastructure
- [ ] Supabase project created + migrations run
- [ ] Database backups configured (daily)
- [ ] Redis cache layer deployed (optional for Phase 0)
- [ ] CDN configured for assets (Cloudflare)
- [ ] Environment variables set (all services)
- [ ] SSL/TLS certificates installed

### Backend Services
- [ ] Auth API deployed + JWT tokens working
- [ ] Creator program API deployed (profile, earnings, leaderboard)
- [ ] Worlds API deployed (CRUD, publish/unpublish)
- [ ] Stripe test keys configured (no real charges yet)
- [ ] Webhook handlers deployed (Stripe, email)
- [ ] Rate limiting enabled (100 req/sec per user)
- [ ] Error logging configured (Sentry/DataDog)

### Frontend Application
- [ ] Next.js build optimized (<50MB bundle)
- [ ] Auth UI deployed (signup, login, verify email)
- [ ] Dashboard deployed (5 tabs, all wired to backend)
- [ ] World builder deployed (asset panel, canvas, inspector)
- [ ] Analytics dashboard deployed (charts, leaderboards)
- [ ] Error boundaries + fallback UI in place

### HoloScript Compiler
- [ ] Lexer + parser deployed
- [ ] R3F compiler generating valid components
- [ ] CLI tool working (`holoscript build`)
- [ ] Example worlds compiled successfully
- [ ] Hot reload working in dev environment

### Testing
- [ ] Unit tests run: `npm test` (>50% coverage minimum)
- [ ] Integration tests pass (auth flow, world creation)
- [ ] Smoke tests pass (critical user journeys)
- [ ] E2E tests pass (Playwright or Cypress)
- [ ] Performance tests pass:
  - [ ] Page load <3s (Lighthouse >80)
  - [ ] API p95 <500ms
  - [ ] Database queries <100ms

### Monitoring & Observability
- [ ] Error tracking enabled (Sentry)
- [ ] APM configured (New Relic / DataDog)
- [ ] Log aggregation running (CloudWatch / Loggly)
- [ ] Uptime monitoring configured (PagerDuty)
- [ ] Alerting rules set up:
  - [ ] 5xx errors spike
  - [ ] Database connection pool exhausted
  - [ ] API latency >1s (p95)
  - [ ] Out of memory warnings

### Security
- [ ] CORS configured correctly
- [ ] SQL injection prevention verified (prepared statements)
- [ ] XSS protection enabled (Content-Security-Policy headers)
- [ ] CSRF tokens validated
- [ ] Secrets manager configured (AWS Secrets / Vault)
- [ ] API rate limiting tested
- [ ] JWT token expiry set (24h access, 7d refresh)
- [ ] Password hashing verified (bcrypt or Argon2)
- [ ] No sensitive data in logs
- [ ] Dependency security audit: `npm audit` (zero critical)

### Email Service
- [ ] Transactional email provider set up (SendGrid/AWS SES)
- [ ] Email templates tested (welcome, verify, reset, publish, earnings)
- [ ] Unsubscribe links working
- [ ] Email delivery verified (check spam folder)
- [ ] Welcome email sends on signup
- [ ] Password reset emails send correctly
- [ ] Earnings summary emails scheduled (Fridays 9am PT)

### Documentation
- [ ] API docs published (OpenAPI/Swagger)
- [ ] Developer setup guide written
- [ ] Creator quickstart guide published
- [ ] Deployment runbook documented
- [ ] On-call procedures documented
- [ ] Rollback procedures documented
- [ ] Database schema documentation
- [ ] Environment variables documented (.env.example)

### Creator Program
- [ ] First-world bonus logic verified ($100 credit)
- [ ] Payment split logic verified (70/30)
- [ ] Leaderboard data accurate
- [ ] Creator profile templates ready
- [ ] Featured slot assignments ready (for Week 3)
- [ ] $100 welcome credit applied to all signups

### Marketing & Comms
- [ ] Landing page updated
- [ ] Creator onboarding emails drafted
- [ ] Discord community set up + mods assigned
- [ ] Founder program details finalized (100 slots)
- [ ] Launch announcement drafted
- [ ] Press kit prepared

## Launch Day (Feb 5, 2026)

### 24 Hours Before
- [ ] All systems healthcheck passed
- [ ] Backup taken of production database
- [ ] On-call rotation confirmed
- [ ] Slack incident channel #hololand-incidents created
- [ ] Team briefed on launch procedure

### Launch Procedure (9am PT)
- [ ] VPN connected + SSH keys verified
- [ ] Monitoring dashboards open (4 monitors)
- [ ] Error tracking dashboard open
- [ ] Slack notifications enabled
- [ ] Database connection tested
- [ ] API health endpoint responding
- [ ] Frontend loads without errors
- [ ] First test transaction processed
- [ ] Email verification tested (check spam + inbox)

### During Launch (9am - 12pm)
- [ ] Monitor error rate (<0.1%)
- [ ] Monitor API latency (p95 <500ms)
- [ ] Monitor page load time (<3s)
- [ ] Monitor database connections (not spiking)
- [ ] Monitor memory usage (not above 70%)
- [ ] Monitor disk space (not above 80%)
- [ ] Check Slack for user reports
- [ ] Respond to support emails immediately

### Post-Launch (12pm - 5pm)
- [ ] First 100 signups processed
- [ ] First purchases verified (test with $1 transaction)
- [ ] Email confirmations sent + received
- [ ] Creator profiles populated
- [ ] Worlds created successfully
- [ ] Analytics data flowing
- [ ] Leaderboards showing data
- [ ] No critical errors in logs

### Day 1 Verification
- [ ] All 4 success criteria met:
  - [ ] Signup flow works end-to-end
  - [ ] Payments processed in test mode
  - [ ] Creator dashboard populated
  - [ ] Analytics data accurate

### Rollback Plan (if critical issues)
1. Stop accepting new signups
2. Revert database to backup (pre-launch)
3. Restart API services
4. Notify founders of issue via email
5. Post-mortem meeting 2 hours later

## Week 1 Post-Launch (Feb 6-12)

### Daily (9am PT)
- [ ] Check error rate (target: <0.1%)
- [ ] Check API performance (p95 <500ms)
- [ ] Check database health
- [ ] Review signup/transaction metrics
- [ ] Respond to critical issues

### Weekly Metrics Review (Friday, Feb 12)
- [ ] Signups: 100 founders ✅
- [ ] Worlds created: 20+ ✅
- [ ] Transactions: 5+ ✅
- [ ] Error rate: <0.1% ✅
- [ ] Page load: <3s ✅
- [ ] NPS survey sent to founders

## Handoff to Phase 1 (Feb 13+)

**Preconditions**:
- [ ] All success metrics met
- [ ] Zero Sev0/Sev1 bugs
- [ ] All systems stable 7 days
- [ ] Founder feedback positive (NPS >50)
- [ ] Documentation current

**Phase 1 Kickoff**:
- Asset marketplace
- Multiplayer worlds
- Advanced analytics
- Creator discovery growth
