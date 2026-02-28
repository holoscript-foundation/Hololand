# 🚀 Quick Start: Hybrid Deployment

**Goal:** Deploy Hololand with Railway (B2C) + AWS (B2B) in under 30 minutes

---

## ✅ Prerequisites

- [x] AWS infrastructure provisioned (already done!)
- [ ] Railway account (free: https://railway.app)
- [ ] Railway CLI installed: `npm install -g @railway/cli`
- [ ] Domain access (hololand.com DNS settings)

---

## 📋 30-Minute Deployment

### Step 1: Deploy to Railway (10 minutes)

```bash
# Navigate to backend
cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend

# Run Railway deployment script
./scripts/railway/deploy.sh

# Expected output:
# ✅ Railway project created
# ✅ PostgreSQL added
# ✅ Redis added
# ✅ Deployed to Railway
# 🌐 Railway URL: https://hololand-production.up.railway.app
```

### Step 2: Configure DNS (5 minutes)

**Add these DNS records to your domain:**

```dns
# B2C (Railway)
app.hololand.com     CNAME  →  hololand-production.up.railway.app
www.hololand.com     CNAME  →  hololand-production.up.railway.app

# B2B (AWS) - Already provisioned!
api.hololand.com     CNAME  →  hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com
```

**Full guide:** See [DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md)

### Step 3: Add Railway Custom Domains (2 minutes)

```bash
# Add custom domains to Railway
railway domain add app.hololand.com
railway domain add www.hololand.com

# Railway will auto-provision SSL certificates
```

### Step 4: Test Both Platforms (3 minutes)

```bash
# Test B2C (Railway)
curl https://app.hololand.com/health
# Expected: {"status":"ok","platform":"railway"}

# Test B2B (AWS)
curl https://api.hololand.com/health
# Expected: {"status":"ok","platform":"aws"}
```

### Step 5: Deploy Frontend (10 minutes)

```bash
# Navigate to frontend
cd C:/Users/josep/Documents/GitHub/Hololand/platform/frontend

# Update API endpoints
# Edit .env.production:
VITE_API_URL=https://app.hololand.com/api
VITE_AGENT_API_URL=https://api.hololand.com/v1

# Build and deploy
npm run build
railway up

# Or deploy to Vercel/Netlify for static hosting
```

---

## 🎯 What You Just Deployed

### B2C Platform (Railway) - $30/month

```
✅ User authentication (JWT, Web3, OAuth)
✅ World management (CRUD operations)
✅ Brittney AI builder (integrated)
✅ Multiplayer (Socket.io)
✅ Creator economy (ready to activate)
✅ PostgreSQL database
✅ Redis cache
✅ Auto-scaling
✅ SSL/TLS (automatic)
```

**Access:** https://app.hololand.com

### B2B Platform (AWS) - $200/month

```
✅ Agent registry (HoloScript v3.4)
✅ Choreography engine (multi-step workflows)
✅ Zero-trust authentication
✅ Multi-tenant isolation
✅ x402 micropayments (ready to activate)
✅ RDS PostgreSQL (Multi-AZ)
✅ ElastiCache Redis
✅ ECS Fargate cluster
✅ Application Load Balancer
```

**Access:** https://api.hololand.com

---

## 💰 Cost Summary

| Platform | Monthly Cost | Annual Cost |
|----------|--------------|-------------|
| Railway (B2C) | $30 | $360 |
| AWS (B2B) | $200 | $2,400 |
| **Total** | **$230** | **$2,760** |

**Savings vs AWS-only:** $0/month (but flexible to shutdown AWS if B2B fails)
**Savings vs Railway-only:** Maintains enterprise capability

---

## 📊 Architecture Overview

```
┌──────────────────────────────────────────────────┐
│           hololand.com DNS                       │
└─────────────┬────────────────┬───────────────────┘
              │                │
              ▼                ▼
    ┌─────────────────┐  ┌─────────────────┐
    │  B2C Platform   │  │  B2B Platform   │
    │  (Railway)      │  │  (AWS)          │
    ├─────────────────┤  ├─────────────────┤
    │ app.hololand    │  │ api.hololand    │
    │ $30/month       │  │ $200/month      │
    │                 │  │                 │
    │ • User Auth     │  │ • Agent API     │
    │ • Worlds        │  │ • Choreography  │
    │ • Brittney AI   │  │ • Zero-Trust    │
    │ • Multiplayer   │  │ • Enterprise    │
    │                 │  │                 │
    │ PostgreSQL      │  │ RDS Multi-AZ    │
    │ Redis           │  │ ElastiCache     │
    └─────────────────┘  └─────────────────┘
```

---

## 🔧 Common Tasks

### View Railway Logs
```bash
railway logs
```

### View AWS Logs
```bash
aws logs tail /aws/ecs/hololand-phase1-production --follow
```

### Update Railway
```bash
cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend
git pull
railway up
```

### Update AWS
```bash
cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend
./scripts/production/build-and-push-image.sh --tag v1.0.1
./scripts/production/deploy-to-production.sh --image-tag v1.0.1
```

### Run Migrations (Railway)
```bash
railway run npm run migrate:production
```

### Run Migrations (AWS)
```bash
aws ecs run-task \
  --cluster hololand-phase1-production-cluster \
  --task-definition hololand-migrate \
  --launch-type FARGATE
```

---

## 🚀 Next Steps

### Week 1: B2C Launch
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Test user registration flow
- [ ] Test world creation with Brittney AI
- [ ] Invite 10 beta users
- [ ] Collect feedback

### Week 2: B2B Preparation
- [ ] Document agent API endpoints
- [ ] Create enterprise onboarding guide
- [ ] Set up Stripe for B2B billing
- [ ] Design pricing tiers

### Week 3: Marketing
- [ ] Launch Product Hunt
- [ ] Post on X/Twitter
- [ ] Reach out to VR communities
- [ ] Contact potential enterprise customers

### Week 4: Scale
- [ ] Monitor Railway performance
- [ ] Optimize database queries
- [ ] Set up monitoring dashboards
- [ ] Plan feature roadmap

---

## 📚 Documentation

### Key Files
1. **[HYBRID_DEPLOYMENT_STRATEGY.md](./HYBRID_DEPLOYMENT_STRATEGY.md)** - Complete strategy guide
2. **[DNS_CONFIGURATION.md](./DNS_CONFIGURATION.md)** - DNS setup instructions
3. **[HYBRID_ARCHITECTURE.md](./HYBRID_ARCHITECTURE.md)** - Architecture deep dive
4. **[PHASE1_INFRASTRUCTURE_COMPLETE.md](./PHASE1_INFRASTRUCTURE_COMPLETE.md)** - AWS resources

### Scripts
- **Railway Deploy:** `./scripts/railway/deploy.sh`
- **AWS Build:** `./scripts/production/build-and-push-image.sh`
- **AWS Deploy:** `./scripts/production/deploy-to-production.sh`

---

## 🔒 Security Checklist

### Railway (B2C)
- [x] HTTPS enabled (automatic)
- [ ] Environment variables secured
- [ ] Database backups enabled (Railway automatic)
- [ ] Rate limiting configured
- [ ] CORS configured

### AWS (B2B)
- [x] VPC isolation
- [x] Multi-AZ database
- [x] Security groups configured
- [ ] SSL certificate for ALB (pending)
- [ ] WAF rules (optional)

---

## 📞 Support

### Railway Issues
- Dashboard: https://railway.app
- Logs: `railway logs`
- Docs: https://docs.railway.app

### AWS Issues
- Console: https://console.aws.amazon.com
- Logs: CloudWatch
- Support: AWS Support Center

### Code Issues
- GitHub: https://github.com/brianonbased-dev/Hololand/issues

---

## 🎉 Success Criteria

✅ **Deployment Complete When:**
- [ ] https://app.hololand.com returns 200 OK
- [ ] https://api.hololand.com returns 200 OK
- [ ] User can register and login
- [ ] User can create a world
- [ ] Brittney AI responds to prompts
- [ ] Multiplayer connects

✅ **Ready for Users When:**
- [ ] All endpoints secured (HTTPS)
- [ ] Database migrations applied
- [ ] Frontend deployed
- [ ] Monitoring configured
- [ ] Error tracking enabled

---

**Estimated Total Time:** 30 minutes
**Difficulty:** Intermediate
**Cost:** $230/month ($30 Railway + $200 AWS)
**Flexibility:** Can deactivate AWS if B2B fails ($200/month savings)

---

_Last Updated: 2026-02-27_

**Ready to deploy?** Run:
```bash
cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend
./scripts/railway/deploy.sh
```
