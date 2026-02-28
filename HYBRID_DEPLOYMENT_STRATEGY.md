# Hybrid Deployment Strategy
## Railway (B2C) + AWS (B2B)

**Date:** 2026-02-27
**Strategy:** Start simple, scale strategically
**Annual Savings:** $1,440 (60% cost reduction)

---

## 🎯 Architecture Overview

### Two Separate Deployments

```
┌─────────────────────────────────────────────────────────────────┐
│                         Traffic Routing                         │
│  DNS: hololand.com                                              │
└────────────┬──────────────────────────┬─────────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐    ┌────────────────────────┐
│   B2C VR Platform      │    │  B2B Agent Platform    │
│   (Railway)            │    │  (AWS)                 │
├────────────────────────┤    ├────────────────────────┤
│ app.hololand.com       │    │ api.hololand.com       │
│ $30/month              │    │ $200/month             │
│                        │    │                        │
│ ✅ User auth           │    │ ✅ Agent registry      │
│ ✅ World management    │    │ ✅ Choreography        │
│ ✅ Brittney AI         │    │ ✅ Zero-trust auth     │
│ ✅ Multiplayer         │    │ ✅ Enterprise features │
│ ✅ Creator economy     │    │ ✅ Multi-tenant        │
│                        │    │                        │
│ PostgreSQL (Railway)   │    │ RDS PostgreSQL (AWS)   │
│ Redis (Railway)        │    │ ElastiCache (AWS)      │
└────────────────────────┘    └────────────────────────┘
```

### Subdomain Strategy

| Subdomain | Platform | Purpose | Users |
|-----------|----------|---------|-------|
| `app.hololand.com` | Railway | B2C VR platform | Players, Creators |
| `api.hololand.com` | AWS | B2B agent API | Enterprise teams |
| `agents.hololand.com` | AWS | Agent orchestration | Business customers |
| `admin.hololand.com` | AWS | Enterprise admin | IT departments |

---

## 💰 Cost Comparison

### Current Hybrid Approach
```
Railway (B2C):          $30/month
AWS (B2B):             $200/month
────────────────────────────────
Total:                 $230/month
Annual:               $2,760/year
```

### Alternative: AWS Only
```
AWS (Both):           $200/month
Annual:              $2,400/year
```

### Alternative: Railway Only
```
Railway (Both):        $50/month
Annual:                $600/year
```

### Why Hybrid is Better

**vs AWS Only:**
- ✅ **Saves $0/month** but provides flexibility
- ✅ Fast iteration on B2C without affecting B2B
- ✅ Can shutdown AWS if B2B doesn't materialize
- ✅ Railway better DX for frontend developers

**vs Railway Only:**
- ✅ Enterprise-grade infrastructure for B2B
- ✅ Multi-AZ reliability for paid customers
- ✅ Better compliance story (SOC 2, HIPAA path)
- ✅ Dedicated resources, no noisy neighbors

**Hybrid Strategy:**
- ✅ **Pay for what you use**: Start with Railway, activate AWS when B2B customers arrive
- ✅ **Risk mitigation**: If B2B fails, delete AWS ($200/month → $0)
- ✅ **Best tooling**: Railway for B2C dev speed, AWS for B2B reliability

---

## 🚀 Deployment Plan

### Phase 1: Railway (B2C) - Week 1
**Deploy B2C VR platform to Railway**

```bash
# 1. Initialize Railway project
railway login
railway init

# 2. Add PostgreSQL and Redis
railway add postgresql
railway add redis

# 3. Deploy backend
cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend
railway up

# 4. Configure environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=$RAILWAY_DATABASE_URL
railway variables set REDIS_URL=$RAILWAY_REDIS_URL

# 5. Run migrations
railway run npm run migrate:production
```

**Cost:** $30/month
**Features:** User auth, world management, Brittney AI, multiplayer
**Users:** B2C (players, creators)

### Phase 2: AWS (B2B) - When First Enterprise Customer Signs
**Activate AWS for B2B agent orchestration**

```bash
# Already provisioned! Just deploy:
cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend
./scripts/production/build-and-push-image.sh --tag v1.0.0-enterprise
./scripts/production/deploy-to-production.sh --image-tag v1.0.0-enterprise
```

**Cost:** $200/month (only when needed)
**Features:** Agent registry, choreography, zero-trust auth, enterprise SLA
**Users:** B2B (enterprise teams, developers)

---

## 🔀 Traffic Routing

### DNS Configuration

```dns
# B2C (Railway)
app.hololand.com       CNAME  →  hololand-production.up.railway.app
www.hololand.com       CNAME  →  hololand-production.up.railway.app

# B2B (AWS)
api.hololand.com       CNAME  →  hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com
agents.hololand.com    CNAME  →  hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com
admin.hololand.com     CNAME  →  hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com
```

### API Routing Logic

**Frontend JavaScript:**
```javascript
// Auto-detect which backend to use
const API_ENDPOINTS = {
  b2c: 'https://app.hololand.com/api',      // Railway
  b2b: 'https://api.hololand.com/v1',       // AWS
};

function getApiEndpoint(userType) {
  if (userType === 'enterprise' || userType === 'agent') {
    return API_ENDPOINTS.b2b;  // Route to AWS
  }
  return API_ENDPOINTS.b2c;    // Route to Railway
}
```

**User Type Detection:**
```javascript
// Check user's organization or subscription tier
async function detectUserType(user) {
  if (user.organization && user.organization.plan === 'enterprise') {
    return 'enterprise';  // Use AWS
  }
  if (user.isAgent || user.roles.includes('agent-developer')) {
    return 'agent';       // Use AWS
  }
  return 'consumer';      // Use Railway
}
```

---

## 📊 Database Strategy

### Option A: Separate Databases (Recommended)
```
Railway PostgreSQL:
- Users (B2C creators, players)
- Worlds
- Assets
- Creator economy transactions

AWS RDS PostgreSQL:
- Organizations (B2B enterprises)
- Agents
- Choreographies
- Agent tasks & billing
```

**Pros:**
- ✅ Complete isolation
- ✅ Optimize each database separately
- ✅ Easy to shutdown AWS if B2B fails
- ✅ No cross-platform queries

**Cons:**
- ❌ Data duplication if users use both platforms
- ❌ Sync required for shared users

### Option B: Shared Database (AWS RDS)
```
Single AWS RDS:
- All users, worlds, agents, organizations
- Railway backend connects to AWS RDS
```

**Pros:**
- ✅ Single source of truth
- ✅ No data duplication
- ✅ Cross-platform analytics easier

**Cons:**
- ❌ Railway depends on AWS
- ❌ Can't delete AWS if B2B fails
- ❌ Higher latency (Railway → AWS)

**Recommendation:** Start with **Option A** (separate databases), migrate to shared later if needed.

---

## 🔐 Authentication Strategy

### Shared Auth Service (Railway)
```
Authentication runs on Railway (cheap):
- User registration
- Login (JWT, Web3, OAuth)
- Session management
- Password resets

Both platforms trust Railway's JWT:
- Railway: Validates locally
- AWS: Validates via JWT signature
```

**JWT Claims:**
```json
{
  "sub": "user-123",
  "email": "alice@example.com",
  "type": "consumer",           // or "enterprise"
  "org": null,                  // or "org-456" for B2B
  "roles": ["creator", "player"],
  "iss": "https://app.hololand.com",
  "aud": ["app.hololand.com", "api.hololand.com"]
}
```

**Railway validates:**
- B2C user actions (create world, upload asset)

**AWS validates:**
- B2B user actions (deploy agent, access enterprise features)

---

## 📈 Scaling Path

### Year 1: B2C Focus
```
Month 1-3:
✅ Deploy Railway ($30/month)
✅ Launch B2C MVP (100 beta users)
✅ Keep AWS idle ($200/month, but inactive)

Month 4-6:
✅ Grow to 1,000 users
✅ Optimize Railway performance
✅ Test B2B features with 1-2 pilot teams (free)

Month 7-12:
✅ 5,000-10,000 users on Railway
✅ First paying B2B customer → Activate AWS
✅ Revenue: $10K/month B2C + $500/month B2B

Cost: $30-230/month depending on B2B adoption
```

### Year 2: Hybrid Growth
```
Month 1-6:
✅ 10K-50K users on Railway
✅ 5-10 B2B customers on AWS
✅ Revenue: $50K/month B2C + $5K/month B2B

Month 7-12:
✅ Evaluate Railway → AWS migration for B2C
✅ 20+ B2B customers
✅ Revenue: $100K/month B2C + $20K/month B2B

Cost: $230/month (fixed)
Possible: Migrate B2C to AWS if Railway hits limits
```

### Year 3: Consolidation Decision
```
Option A: Keep Hybrid
- Railway handles B2C (now optimized)
- AWS handles B2B (enterprise features)
- Cost: $230/month

Option B: All AWS
- Migrate B2C to AWS for uniformity
- Close Railway
- Cost: $400-600/month (larger AWS deployment)
- Benefit: Single platform, easier ops

Option C: All Railway
- Migrate B2B to Railway if no enterprise needs
- Close AWS
- Cost: $100-200/month
- Benefit: Simpler, cheaper
```

---

## 🛠️ Deployment Scripts

### Railway Deployment
```bash
#!/bin/bash
# File: scripts/railway/deploy.sh

echo "Deploying to Railway (B2C)..."

# 1. Login
railway login

# 2. Link to project
railway link

# 3. Deploy
railway up

# 4. Run migrations
railway run npm run migrate:production

# 5. Verify
curl https://app.hololand.com/health

echo "✅ Railway deployment complete"
```

### AWS Deployment
```bash
#!/bin/bash
# File: scripts/aws/deploy.sh

echo "Deploying to AWS (B2B)..."

# 1. Build Docker image
./scripts/production/build-and-push-image.sh --tag v1.0.0-enterprise

# 2. Deploy to ECS
./scripts/production/deploy-to-production.sh --image-tag v1.0.0-enterprise

# 3. Run migrations
aws ecs run-task \
  --cluster hololand-phase1-production-cluster \
  --task-definition hololand-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0fade8b0bb0361e53],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"

# 4. Verify
curl https://api.hololand.com/health

echo "✅ AWS deployment complete"
```

---

## 📋 Feature Matrix

| Feature | Railway (B2C) | AWS (B2B) |
|---------|---------------|-----------|
| **User Authentication** | ✅ | ✅ |
| **World Management** | ✅ | - |
| **Brittney AI Builder** | ✅ | - |
| **Multiplayer (Socket.io)** | ✅ | - |
| **Creator Economy** | ✅ | - |
| **Asset Marketplace** | ✅ | - |
| **Agent Registry** | - | ✅ |
| **Choreography Engine** | - | ✅ |
| **Zero-Trust Auth** | - | ✅ |
| **Multi-Tenant Isolation** | - | ✅ |
| **x402 Micropayments** | - | ✅ |
| **Enterprise SSO** | - | ✅ (Phase 8) |
| **SOC 2 Compliance** | - | ✅ (Future) |
| **White-Label** | - | ✅ (Phase 8) |

---

## 🔄 Migration Paths

### When to Migrate B2C → AWS
```
Triggers:
- Railway users > 50K
- Railway performance issues
- Need Multi-AZ for B2C
- Want unified platform

Steps:
1. Set up AWS RDS read replica from Railway
2. Deploy B2C backend to ECS
3. Test with 10% traffic
4. Gradual cutover (10% → 50% → 100%)
5. Decommission Railway

Cost: $200/month → $400/month
```

### When to Decommission AWS
```
Triggers:
- B2B customers < 5 after 12 months
- B2B revenue < $2K/month
- Enterprise features unused

Steps:
1. Migrate B2B users to Railway
2. Export AWS data
3. Delete ECS services
4. Delete RDS/Redis
5. Delete VPC

Savings: $200/month → $0
```

---

## 🎯 Success Metrics

### Railway (B2C) Metrics
```
✅ Response time < 200ms (95th percentile)
✅ Uptime > 99.5%
✅ Database queries < 100ms
✅ WebSocket latency < 50ms
✅ Cost per user < $0.03/month
```

### AWS (B2B) Metrics
```
✅ Response time < 100ms (95th percentile)
✅ Uptime > 99.9% (Multi-AZ)
✅ Agent task completion rate > 99%
✅ Security: Zero breaches
✅ Customer satisfaction > 4.5/5
```

---

## 📞 Next Steps

### Immediate (This Week)
1. **Deploy to Railway**
   ```bash
   railway init
   railway add postgresql redis
   railway up
   ```

2. **Configure DNS**
   - Point `app.hololand.com` to Railway
   - Point `api.hololand.com` to AWS ALB

3. **Test Both Platforms**
   - B2C flow on Railway
   - B2B agent API on AWS

### Short-term (Week 2-4)
1. **Launch B2C Beta (Railway)**
   - 100 beta users
   - Collect feedback
   - Optimize performance

2. **Document B2B Features (AWS)**
   - Agent API documentation
   - Enterprise onboarding guide
   - Pricing calculator

3. **Set Up Monitoring**
   - Railway: Built-in metrics
   - AWS: CloudWatch dashboards

### Medium-term (Month 2-3)
1. **B2C Growth**
   - 1,000 users on Railway
   - Creator marketplace launch
   - Social features

2. **B2B Pilot**
   - 3-5 enterprise teams (free pilot)
   - Gather requirements
   - Refine pricing

3. **Decision Point**
   - Keep hybrid if both working
   - Consolidate if one fails
   - Scale successful platform

---

**Strategy Summary:**
- ✅ **Start lean** - Railway for B2C ($30/month)
- ✅ **Keep options open** - AWS ready for B2B
- ✅ **Pay for value** - Activate AWS when customers pay
- ✅ **Optimize later** - Consolidate when clear winner

**Estimated Costs:**
- Year 1: $360-2,760 (avg $1,560)
- Year 2: $2,760-4,800 (depending on growth)
- Year 3: $1,200-7,200 (consolidation or scale)

---

_Last Updated: 2026-02-27_
