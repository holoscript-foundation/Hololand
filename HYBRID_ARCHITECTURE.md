# Hololand Hybrid Architecture
## B2C VR Platform + B2B Agent Orchestration

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** Phase 1 Production Deployment

---

## 🎯 Executive Summary

Hololand operates as a **dual-purpose platform**:

1. **B2C VR Social Platform** - User-generated VR/AR content metaverse ("Ready Player One meets WoW")
2. **B2B Agent Orchestration Platform** - Enterprise AI agent teams for code review, training, sales, and more

Both use cases share the same infrastructure but serve different markets with different revenue models.

---

## 🏗️ Architecture Overview

### Shared Infrastructure Layer

**Phase 1 Production Stack:**
- **AWS VPC** - Multi-AZ network isolation (10.0.0.0/16)
- **RDS PostgreSQL** - Multi-AZ database (db.t3.medium, 100GB)
- **ElastiCache Redis** - Single-node cache (cache.t3.medium)
- **ECS Fargate** - Serverless containers for backend services
- **Application Load Balancer** - SSL termination, routing
- **AWS Secrets Manager** - Encrypted credential storage
- **CloudWatch** - Logging, metrics, alarms

**Cost:** ~$200/month

### Dual-Purpose Services

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Load Balancer                │
│                   (SSL/TLS Termination)                     │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
    ┌─────────────▼──────────┐  ┌────────▼──────────────────┐
    │   B2C VR Backend       │  │  B2B Agent Orchestration  │
    │   (Hololand Platform)  │  │  (HoloScript Agents)      │
    └─────────────┬──────────┘  └────────┬──────────────────┘
                  │                       │
                  │   ┌───────────────────┴──────────────┐
                  │   │                                   │
    ┌─────────────▼───▼───────────┐  ┌──────────────────▼────┐
    │   PostgreSQL Database       │  │   Redis Cache          │
    │   (Multi-tenant isolation)  │  │   (Session + Pub/Sub)  │
    └─────────────────────────────┘  └───────────────────────┘
```

---

## 🎮 B2C VR Platform

### Target Users
- **Players** - Explore VR worlds, socialize, play games
- **Creators** - Build VR experiences with Brittney AI
- **Professional Users** - Architects, educators, trainers (individual use)

### Features
- User authentication (JWT, Web3, OAuth)
- World management APIs
- Brittney AI builder (GGUF or GPT-4o-mini)
- Multiplayer with Socket.io
- Creator economy (70/30 revenue split)
- Asset marketplace

### Revenue Model
- World entry fees ($0.99 - $9.99)
- In-world purchases (cosmetics, power-ups)
- Asset sales (3D models, textures)
- Creator subscriptions
- **Target:** 100K users Year 1, 5M users Year 3

### Database Schema (B2C)
```sql
-- Users and authentication
users
user_sessions
user_profiles

-- World management
worlds
world_permissions
world_visits

-- Creator economy
transactions
marketplace_items
creator_earnings
```

---

## 🤖 B2B Agent Orchestration

### Target Customers
- **Software Teams** - Automated code review, testing, security scanning
- **Training Companies** - VR training simulations with AI instructors
- **Sales Teams** - Virtual product demos, customer engagement
- **Architecture Firms** - Design validation, client walkthroughs
- **Research Labs** - Data visualization, collaborative analysis

### Features (From HoloScript v3.4)
- **Agent Registry** - Discovery, lifecycle management, trust levels
- **Choreography Engine** - Multi-step workflows with HITL approval
- **Negotiation Protocol** - Multi-agent voting, consensus (PBFT, Raft)
- **Communication** - Encrypted messaging (AES-256-GCM), pub/sub
- **Hierarchy & Delegation** - Task escalation, delegation rules
- **Debug & Telemetry** - OpenTelemetry, breakpoints, replay
- **Marketplace** - Agent handoff, bidding, x402 micropayments

### Revenue Model
- **Enterprise SaaS subscriptions** ($500-$5,000/month per team)
- **x402 micropayments** (agents pay per API call)
- **Agent marketplace fees** (15% commission on agent handoffs)
- **Professional services** (custom agent development)
- **White-label instances** (Phase 8, 2028+)

### Database Schema (B2B)
```sql
-- Agent management
agents
agent_capabilities
agent_manifests
agent_registry

-- Orchestration
choreographies
choreography_steps
negotiation_sessions
consensus_votes

-- Communication
agent_channels
agent_messages
topics
subscriptions

-- Billing
agent_usage
x402_transactions
enterprise_accounts
```

---

## 🔐 Authentication & Authorization

### Dual Auth System

**B2C User Authentication:**
```typescript
// JWT-based user auth
POST /api/auth/login
POST /api/auth/register
POST /api/auth/web3-verify
GET  /api/auth/oauth/google

// Session management
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
```

**B2B Agent Authentication:**
```typescript
// Zero-trust agent auth (RS256/Ed25519)
POST /api/agents/register
POST /api/agents/authenticate
GET  /api/agents/discover
POST /api/agents/heartbeat

// Agent communication
POST /api/agents/message
POST /api/agents/publish
POST /api/agents/subscribe
```

### Trust Levels
- `local` - Same organization, full trust
- `verified` - Verified identity, limited permissions
- `external` - Third-party, restricted access

---

## 📊 Multi-Tenancy Strategy

### Data Isolation

**Schema-per-tenant approach:**
```sql
-- Tenant isolation via foreign keys
enterprises (id, name, plan, settings)
worlds (id, enterprise_id, owner_id, ...)
agents (id, enterprise_id, manifest, ...)

-- RLS policies for security
CREATE POLICY enterprise_isolation ON agents
  USING (enterprise_id = current_setting('app.current_enterprise')::int);
```

### Resource Quotas

**B2C Free Tier:**
- 3 published worlds
- 1GB storage
- 100 world visits/day

**B2C Creator Pro ($9.99/month):**
- Unlimited worlds
- 10GB storage
- Unlimited visits
- Analytics dashboard

**B2B Starter ($500/month):**
- 5 agents
- 10K agent tasks/month
- Basic choreography
- Community support

**B2B Enterprise ($2,500+/month):**
- Unlimited agents
- 100K+ agent tasks/month
- Advanced features (PBFT, marketplace)
- Dedicated support
- SLA guarantees

---

## 🚀 Deployment Strategy

### Phase 1: Hybrid MVP (Current)

**B2C Features:**
- [x] User authentication
- [x] World CRUD operations
- [x] Brittney AI integration (basic)
- [x] Multiplayer foundation (Socket.io)
- [ ] Creator economy (marketplace)

**B2B Features:**
- [ ] Agent registry
- [ ] Basic choreography
- [ ] Direct messaging
- [ ] Pub/sub topics
- [ ] x402 micropayments

**Timeline:** 2-4 weeks
**Cost:** $200/month

### Phase 2-7: B2C Focus (2026-2027)

Focus on creator economy, VR features, user growth while maintaining basic B2B agent infrastructure.

**B2C Priority:**
- Asset marketplace
- Social features
- VR optimizations
- Mobile AR support
- Creator analytics

**B2B Maintenance:**
- Keep agent APIs stable
- Monitor usage
- Gather enterprise feedback

### Phase 8: B2B Enterprise (2028)

When enterprise demand justifies investment:
- White-label instances
- SSO integration
- Private cloud deployments
- Advanced orchestration
- Compliance certifications (SOC 2, HIPAA)

---

## 💰 Cost-Benefit Analysis

### Infrastructure Costs

**Monthly Breakdown:**
- RDS PostgreSQL (db.t3.medium, Multi-AZ): ~$90
- ElastiCache Redis (cache.t3.medium): ~$50
- ECS Fargate (2 vCPU, 4GB RAM): ~$35
- ALB (Application Load Balancer): ~$20
- Data transfer: ~$5
- **Total:** ~$200/month

**Revenue Targets:**

**B2C (Conservative):**
- 1,000 paying creators @ $9.99/month = $9,990/month
- Marketplace fees (5% of $50K GMV) = $2,500/month
- **B2C Total:** ~$12,500/month

**B2B (Conservative):**
- 5 enterprise teams @ $500/month = $2,500/month
- x402 micropayments = $500/month
- **B2B Total:** ~$3,000/month

**Combined Revenue:** ~$15,500/month
**Net Profit:** ~$15,300/month (76x ROI)

---

## 🔍 Technical Trade-offs

### Why Hybrid Instead of Separate?

**Advantages:**
✅ Shared infrastructure reduces cost (1 database vs 2)
✅ Data synergy (agents can operate on VR worlds)
✅ Unified auth layer (users can deploy agents)
✅ Faster development (shared backend services)
✅ Better resource utilization

**Disadvantages:**
⚠️ More complex architecture
⚠️ Potential scaling conflicts
⚠️ Security considerations for multi-tenancy

### Why Not Simpler B2C-Only Stack?

**If B2C-only ($30-50/month):**
- ❌ Misses B2B revenue opportunity (~$3K/month)
- ❌ Can't support HoloScript agent orchestration
- ❌ No path to enterprise (Phase 8)
- ❌ Underutilizes infrastructure (RDS Multi-AZ wasted)

**Why Not B2B-Only?**
- ❌ Misses larger B2C market (100K+ users)
- ❌ No creator economy network effects
- ❌ Hololand becomes just another agent platform
- ❌ Loses "metaverse" positioning

**Hybrid maximizes both markets while sharing costs.**

---

## 📈 Scaling Strategy

### Horizontal Scaling (ECS Fargate)

**Auto-scaling policies:**
```yaml
# B2C VR Backend
min_tasks: 2
max_tasks: 10
scale_up: CPU > 70% OR RequestCount > 1000/min
scale_down: CPU < 30% AND RequestCount < 200/min

# B2B Agent Orchestration
min_tasks: 1
max_tasks: 5
scale_up: ActiveAgents > 50 OR ChoreographyQueue > 10
scale_down: ActiveAgents < 10 AND ChoreographyQueue < 2
```

### Database Scaling

**Vertical scaling path:**
1. Phase 1: db.t3.medium (2 vCPU, 4GB) - $90/month
2. Phase 3: db.t3.large (2 vCPU, 8GB) - $180/month
3. Phase 5: db.m5.xlarge (4 vCPU, 16GB) - $360/month
4. Phase 7: db.m5.2xlarge (8 vCPU, 32GB) - $720/month

**Read replicas:**
- Add when read:write ratio > 10:1
- Cost: +$90/month per replica

---

## 🔒 Security

### Network Isolation

```
Internet → ALB (public subnets)
         → ECS Tasks (private subnets)
         → RDS/Redis (private subnets, isolated security groups)
```

### Agent-to-Agent Security

**From HoloScript Agent API:**
- Encryption: AES-256-GCM
- Message signing: Ed25519/RS256
- Trust levels: local, verified, external
- Zero-trust architecture

### Data Encryption

- **At rest:** RDS encryption, Secrets Manager
- **In transit:** TLS 1.3 (ALB), VPC encryption
- **Agent messages:** End-to-end encryption

---

## 📚 Next Steps

### Immediate (Week 1-2)
- [x] Provision Phase 1 infrastructure (VPC, RDS, Redis, ECS, ALB)
- [ ] Deploy Hololand backend to ECS
- [ ] Implement agent registry endpoints
- [ ] Test B2C user flows
- [ ] Test B2B agent registration

### Short-term (Week 3-4)
- [ ] Launch B2C MVP (100 beta users)
- [ ] Launch B2B pilot (3 enterprise teams)
- [ ] Implement x402 micropayments
- [ ] Set up monitoring and alerts

### Medium-term (Month 2-3)
- [ ] Creator marketplace
- [ ] Agent choreography engine
- [ ] Social features (friends, chat)
- [ ] Advanced agent communication

### Long-term (Phase 8, 2028)
- [ ] White-label instances
- [ ] Enterprise SSO
- [ ] Compliance certifications
- [ ] Global edge deployment

---

## 🤝 Team Responsibilities

### Platform Team (Backend)
- Shared infrastructure management
- Database schema evolution
- API gateway and routing
- Auth and authorization

### VR Team (B2C)
- World management features
- Brittney AI integration
- Creator tools
- Multiplayer systems

### Agent Team (B2B)
- Agent registry
- Choreography engine
- Communication layer
- Marketplace and billing

---

**Document Owners:** Platform Architecture Team
**Review Cycle:** Monthly
**Last Updated:** 2026-02-27

---

## Appendix A: HoloScript Agent Examples

See:
- [Agent Choreography Example](C:/Users/josep/Documents/GitHub/HoloScript/examples/v3.1-agent-choreography.hs)
- [Agent Communication Example](C:/Users/josep/Documents/GitHub/HoloScript/examples/v3.1-agent-communication.hs)
- [Agent API Reference](C:/Users/josep/Documents/GitHub/HoloScript/docs/AGENT_API_REFERENCE.md)

## Appendix B: Infrastructure Resources

```bash
# VPC
vpc-0d538ebbd62cd17ce

# Subnets
subnet-027667200da99a277 (public-1)
subnet-0bdc292700af0644d (public-2)
subnet-0fade8b0bb0361e53 (private-1)
subnet-03d83ed3bb3eb90fb (private-2)

# RDS Database
hololand-phase1-production-db.csfq62yqsude.us-east-1.rds.amazonaws.com

# Redis (provisioning)
hololand-phase1-production-redis

# Secrets
arn:aws:secretsmanager:us-east-1:555968133977:secret:hololand-phase1/production/database/password-VTEupH
```
