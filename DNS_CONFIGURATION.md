# DNS Configuration Guide
## Hybrid Deployment (Railway + AWS)

**Domain:** hololand.com
**Registrar:** (Your DNS provider - Cloudflare, Route 53, Namecheap, etc.)

---

## 🎯 DNS Records to Create

### B2C Platform (Railway)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `app` | `hololand-production.up.railway.app` | 300 |
| CNAME | `www` | `hololand-production.up.railway.app` | 300 |

**Result:**
- `https://app.hololand.com` → Railway B2C platform
- `https://www.hololand.com` → Railway B2C platform

### B2B Platform (AWS)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `api` | `hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com` | 300 |
| CNAME | `agents` | `hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com` | 300 |
| CNAME | `admin` | `hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com` | 300 |

**Result:**
- `https://api.hololand.com` → AWS B2B platform
- `https://agents.hololand.com` → AWS agent orchestration
- `https://admin.hololand.com` → AWS enterprise admin

### Root Domain

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | (Redirects to `app.hololand.com`) | 300 |

**Note:** Root domain (`hololand.com`) should redirect to `app.hololand.com`

---

## 🔧 Configuration Steps

### Option 1: Cloudflare (Recommended)

1. **Login to Cloudflare**
   - Go to https://dash.cloudflare.com
   - Select `hololand.com` domain

2. **Add CNAME Records**
   ```
   DNS → Add Record → CNAME

   Name: app
   Target: hololand-production.up.railway.app
   Proxy: ON (orange cloud) or OFF (grey cloud)
   TTL: Auto

   Repeat for: www, api, agents, admin
   ```

3. **SSL/TLS Settings**
   ```
   SSL/TLS → Overview → Full (strict)

   This ensures HTTPS works correctly
   ```

4. **Page Rules (Optional)**
   ```
   Page Rule: hololand.com/*
   Setting: Forwarding URL (301)
   Destination: https://app.hololand.com/$1
   ```

### Option 2: AWS Route 53

1. **Create Hosted Zone** (if not exists)
   ```bash
   aws route53 create-hosted-zone \
     --name hololand.com \
     --caller-reference $(date +%s)
   ```

2. **Create CNAME Records**
   ```bash
   # B2C (Railway)
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "app.hololand.com",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "hololand-production.up.railway.app"}]
         }
       }]
     }'

   # B2B (AWS ALB)
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "api.hololand.com",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "hololand-phase1-production-alb-2073421624.us-east-1.elb.amazonaws.com"}]
         }
       }]
     }'
   ```

3. **Repeat for other subdomains** (www, agents, admin)

### Option 3: Namecheap, GoDaddy, etc.

1. **Login to DNS Provider**
2. **Navigate to DNS Management**
3. **Add CNAME Records Manually**
   ```
   Type: CNAME
   Host: app
   Value: hololand-production.up.railway.app
   TTL: 300
   ```

---

## ✅ Verification

### Test DNS Resolution

```bash
# Check B2C (Railway)
nslookup app.hololand.com
# Should resolve to Railway IP

dig app.hololand.com +short
# Should show: hololand-production.up.railway.app
```

```bash
# Check B2B (AWS)
nslookup api.hololand.com
# Should resolve to AWS ALB IP

dig api.hololand.com +short
# Should show: hololand-phase1-production-alb-...
```

### Test HTTPS Access

```bash
# B2C Platform
curl -I https://app.hololand.com/health
# Expected: HTTP/2 200

# B2B Platform
curl -I https://api.hololand.com/health
# Expected: HTTP/2 200
```

---

## 🔒 SSL/TLS Certificates

### Railway (Automatic)
Railway automatically provisions SSL certificates for custom domains. No action needed!

### AWS (Manual Setup Required)

1. **Request Certificate in ACM**
   ```bash
   aws acm request-certificate \
     --domain-name api.hololand.com \
     --subject-alternative-names agents.hololand.com admin.hololand.com \
     --validation-method DNS
   ```

2. **Add DNS Validation Records**
   AWS will provide CNAME records to add to your DNS for validation.

3. **Wait for Validation**
   Certificate status will change to "Issued" after validation.

4. **Attach Certificate to ALB**
   ```bash
   aws elbv2 create-listener \
     --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:555968133977:loadbalancer/app/hololand-phase1-production-alb/25e2804c39d8ae7c \
     --protocol HTTPS \
     --port 443 \
     --certificates CertificateArn=arn:aws:acm:us-east-1:555968133977:certificate/... \
     --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:555968133977:targetgroup/hololand-phase1-production-tg/3c8ccfd442e2034e
   ```

---

## 📋 DNS Configuration Checklist

- [ ] CNAME: `app.hololand.com` → Railway
- [ ] CNAME: `www.hololand.com` → Railway
- [ ] CNAME: `api.hololand.com` → AWS ALB
- [ ] CNAME: `agents.hololand.com` → AWS ALB
- [ ] CNAME: `admin.hololand.com` → AWS ALB
- [ ] Root redirect: `hololand.com` → `app.hololand.com`
- [ ] SSL/TLS: Verify HTTPS works on all subdomains
- [ ] Test: curl all endpoints successfully

---

## 🚨 Troubleshooting

### DNS Not Resolving

```bash
# Clear DNS cache (Windows)
ipconfig /flushdns

# Clear DNS cache (Mac/Linux)
sudo dscacheutil -flushcache

# Wait for DNS propagation (up to 48 hours, usually 5-10 minutes)
```

### SSL Certificate Errors

**Railway:**
- Ensure custom domain is added in Railway dashboard
- Railway auto-provisions certs, may take 5-10 minutes

**AWS:**
- Verify ACM certificate is "Issued" status
- Check HTTPS listener is configured on ALB
- Ensure security groups allow port 443

### CORS Errors

Update backend CORS configuration:

**Railway Backend:**
```javascript
// Allow app.hololand.com
app.use(cors({
  origin: ['https://app.hololand.com', 'https://www.hololand.com']
}));
```

**AWS Backend:**
```javascript
// Allow api.hololand.com
app.use(cors({
  origin: ['https://api.hololand.com', 'https://agents.hololand.com']
}));
```

---

## 📞 Next Steps After DNS Setup

1. **Deploy to Railway**
   ```bash
   cd C:/Users/josep/Documents/GitHub/Hololand/platform/backend
   ./scripts/railway/deploy.sh
   ```

2. **Configure Railway Custom Domain**
   ```bash
   railway domain add app.hololand.com
   railway domain add www.hololand.com
   ```

3. **Test B2C Platform**
   ```bash
   curl https://app.hololand.com/health
   ```

4. **Test B2B Platform**
   ```bash
   curl https://api.hololand.com/health
   ```

5. **Monitor Both Platforms**
   - Railway: `railway logs`
   - AWS: CloudWatch logs

---

_Last Updated: 2026-02-27_
