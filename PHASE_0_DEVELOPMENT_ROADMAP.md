# Hololand Phase 0 Development Roadmap

**Status**: Week 1 Bootstrap (Jan 15-21, 2026)

---

## 🎯 Parallel Workstreams

### Backend (Week 1)
- [x] Database schema (Supabase/PostgreSQL)
- [x] Core API client (auth, creators, worlds, analytics)
- [ ] Stripe integration (test mode)
- [ ] JWT middleware + rate limiting
- [ ] Creator program rules (70/30 split)
- [ ] Email service setup

**Owner**: Backend Team (2 devs)  
**Deliverable**: Running API, Postman collection

---

### Frontend (Week 1-2)
- [x] Auth UI (signup, login, password reset)
- [x] Dashboard layout (stats, worlds, earnings, analytics, profile)
- [ ] World builder shell (canvas, asset panel, inspector)
- [ ] Template picker (using HoloScript worlds)
- [ ] Responsive design + accessibility

**Owner**: Frontend Team (2 devs)  
**Deliverable**: Full auth flow + dashboard navigation

---

### HoloScript Tooling (Week 1-2)
- [x] Language spec (docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
- [x] Integration guide (docs/HOLOSCRIPT_INTEGRATION_GUIDE.md)
- [x] Lexer (tokenizer)
- [x] Parser (AST builder)
- [ ] R3F Compiler (generate React components)
- [ ] CLI tool (build command)
- [ ] Hot reload

**Owner**: Frontend Team (1 dev, part-time)  
**Deliverable**: Compile .hs → .tsx automatically

---

### Example Worlds (Week 1-2)
- [x] Phase 0 HoloScript definitions (7 zones)
  - Welcome Plaza
  - Casino
  - Builder Shop
  - Arcade
  - Central Park
  - Gym
  - B2B Hub
- [ ] Asset requirements (model list)
- [ ] Placeholder assets (low-poly stand-ins)

**Owner**: Design Team (0.5 dev)  
**Deliverable**: Functional HoloScript worlds

---

### Documentation (Week 1-2)
- [x] HoloScript Language Spec
- [x] HoloScript Integration Guide
- [x] API Schema
- [ ] Developer Quickstart
- [ ] Creator Onboarding Guide
- [ ] Deployment Checklist

**Owner**: Tech Lead  
**Deliverable**: Complete dev + creator docs

---

## 📋 Week-by-Week Deliverables

### End of Week 1 (Jan 21)
- ✅ Database schema live on Supabase
- ✅ API client working (auth, CRUD)
- ✅ Auth UI functional (signup/login works)
- ✅ Dashboard layout built
- ✅ HoloScript lexer + parser complete
- ✅ Phase 0 worlds defined in HoloScript

### End of Week 2 (Jan 28)
- ✅ Stripe test mode integration
- ✅ World builder shell (basic canvas)
- ✅ Template picker wired to HoloScript worlds
- ✅ HoloScript → R3F compiler working
- ✅ CLI tool (`npm run holoscript:build`)
- ✅ >50% test coverage

### End of Week 3 (Feb 4)
- ✅ Payment flow end-to-end
- ✅ Analytics tracking
- ✅ Social features (follow, review, rate)
- ✅ Onboarding flow
- ✅ Email service (welcome, verify, reset, publish)

### End of Week 4 (Feb 11)
- ✅ >70% test coverage
- ✅ Performance targets (<3s load, <500ms API p95)
- ✅ Monitoring + alerting
- ✅ Founder program setup (100 invites, $100 credit)
- ✅ Go-live runbook ready

---

## 🔗 Key Dependencies

```
┌─────────────────────────────────────┐
│ Backend API (PostgreSQL + JWT)      │
│ • Auth endpoints                    │
│ • CRUD worlds                       │
│ • Creator program                   │
└────────────┬────────────────────────┘
             │ (REST/GraphQL)
             ▼
┌─────────────────────────────────────┐
│ Frontend (Next.js + React)          │
│ • Dashboard                         │
│ • World Builder                     │
│ • Auth pages                        │
└────────────┬────────────────────────┘
             │ (HoloScript files)
             ▼
┌─────────────────────────────────────┐
│ HoloScript Compiler                 │
│ • Lexer → Parser → R3F AST          │
│ • Generate TSX components           │
└────────────┬────────────────────────┘
             │ (R3F components)
             ▼
┌─────────────────────────────────────┐
│ Canvas (React Three Fiber)          │
│ • Render worlds                     │
│ • Interact with objects             │
└─────────────────────────────────────┘
```

---

## 🚀 Critical Path (Week 1 → 2)

1. **Day 1-2**: Database + API running
2. **Day 3-4**: Auth flow complete (signup/login working)
3. **Day 5**: Dashboard dashboard navigation
4. **Day 6-7**: HoloScript compiler working (first world compiles to React)

**Week 2**: Polish UI, add payment, expand features

---

## ✅ Success Criteria (Phase 0 Complete)

- [ ] 100 founders signed up
- [ ] 20+ published worlds
- [ ] $200K Month 1 GMV
- [ ] <3s page load time
- [ ] <0.5% error rate
- [ ] >70% test coverage
- [ ] NPS >50

---

## 📊 Current Status

**Status**: Bootstrap Phase 1  
**Progress**: Database + API stubs ready  
**Next**: Connect to frontend (Jan 16-17)

---

## 🔄 Continuous

- Daily standup 9am (15 min)
- Weekly stakeholder update Fri (30 min)
- Founder update every 3 days (email)
- Performance monitoring (daily)

---

**Owner**: Tech Lead  
**Last Updated**: Jan 15, 2026
