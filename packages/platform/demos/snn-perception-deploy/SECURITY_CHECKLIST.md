# Security Hardening Checklist

Comprehensive security checklist for production deployment of the SNN Perception Demo.

## Overview

This checklist ensures the deployment follows security best practices across container security, network security, application security, and compliance.

---

## Container Security

### Image Security

- [ ] **Use minimal base image** (Alpine Linux)
  ```dockerfile
  FROM node:20-alpine AS builder
  FROM nginx:1.25-alpine AS production
  ```

- [ ] **Run as non-root user**
  ```dockerfile
  RUN adduser -u 1001 -S hololand -G hololand
  USER hololand
  ```

- [ ] **No secrets in image layers**
  - Never `COPY .env` or API keys
  - Use Docker secrets or environment variables at runtime

- [ ] **Multi-stage builds** to minimize attack surface
  - Build stage: Include dev dependencies
  - Production stage: Only runtime artifacts

- [ ] **Regular security scanning**
  ```bash
  # Trivy
  trivy image hololand/snn-perception-demo:latest

  # Snyk
  snyk container test hololand/snn-perception-demo:latest
  ```

- [ ] **Image signing** (optional but recommended)
  ```bash
  docker trust sign hololand/snn-perception-demo:1.0.0
  ```

### Container Runtime Security

- [ ] **Read-only filesystem** where possible
  ```yaml
  services:
    snn-perception:
      read_only: true
      tmpfs:
        - /tmp
        - /var/cache/nginx
  ```

- [ ] **Drop unnecessary capabilities**
  ```yaml
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE  # Only if binding to port <1024
  ```

- [ ] **No privileged mode**
  ```yaml
  privileged: false
  ```

- [ ] **Security options**
  ```yaml
  security_opt:
    - no-new-privileges:true
    - seccomp:unconfined  # Or custom profile
  ```

- [ ] **Resource limits**
  ```yaml
  mem_limit: 2g
  cpus: 1.0
  pids_limit: 100
  ```

---

## Network Security

### TLS/SSL

- [ ] **TLS 1.2+ only** (disable TLS 1.0/1.1)
  ```nginx
  ssl_protocols TLSv1.2 TLSv1.3;
  ```

- [ ] **Strong cipher suites**
  ```nginx
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
  ssl_prefer_server_ciphers off;
  ```

- [ ] **HSTS enabled**
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  ```

- [ ] **Certificate from trusted CA** (Let's Encrypt, DigiCert, etc.)
  - Self-signed certs only for testing

- [ ] **OCSP stapling**
  ```nginx
  ssl_stapling on;
  ssl_stapling_verify on;
  ```

- [ ] **Certificate expiry monitoring**
  ```bash
  # Alert 30 days before expiry
  openssl x509 -in /etc/nginx/ssl/server.crt -noout -checkend $((30*86400))
  ```

### Firewall and Network Policies

- [ ] **Restrict inbound ports**
  - Port 80 (HTTP, redirect to HTTPS)
  - Port 443 (HTTPS)
  - Block all other ports

- [ ] **Restrict outbound traffic** (if applicable)
  - Allow only necessary connections (e.g., DNS, NTP)

- [ ] **Security groups / Firewall rules**
  ```bash
  # AWS Security Group
  aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxx \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
  ```

- [ ] **Rate limiting**
  ```nginx
  limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
  limit_req zone=general burst=20 nodelay;
  ```

- [ ] **Connection limits**
  ```nginx
  limit_conn_zone $binary_remote_addr zone=addr:10m;
  limit_conn addr 10;
  ```

### CORS and CSP

- [ ] **CORS properly configured**
  ```nginx
  add_header Access-Control-Allow-Origin "https://hololand.io" always;
  add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
  ```

- [ ] **Content Security Policy (CSP)**
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';" always;
  ```

- [ ] **X-Frame-Options**
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  ```

- [ ] **X-Content-Type-Options**
  ```nginx
  add_header X-Content-Type-Options "nosniff" always;
  ```

- [ ] **Referrer-Policy**
  ```nginx
  add_header Referrer-Policy "no-referrer-when-downgrade" always;
  ```

---

## Application Security

### Input Validation

- [ ] **Validate all user inputs**
  - Object IDs, inference parameters, etc.
  - Use schema validation (Zod, Yup, etc.)

- [ ] **Sanitize file paths**
  ```typescript
  import path from 'path';

  function sanitizePath(userPath: string): string {
    const normalized = path.normalize(userPath);
    if (normalized.includes('..')) {
      throw new Error('Invalid path');
    }
    return normalized;
  }
  ```

- [ ] **Rate limit API endpoints**
  ```nginx
  location /api/ {
    limit_req zone=api burst=50 nodelay;
  }
  ```

### Authentication and Authorization

- [ ] **No hardcoded credentials**
  - Use environment variables
  - Rotate secrets regularly

- [ ] **Implement authentication** (if multi-user)
  - JWT tokens
  - OAuth 2.0
  - Session management

- [ ] **Role-based access control (RBAC)**
  - Public: Read-only access to demo
  - Admin: Prometheus, Grafana access restricted

- [ ] **Secure metrics endpoints**
  ```nginx
  location /metrics {
    allow 127.0.0.1;
    allow 172.16.0.0/12;  # Docker networks
    deny all;
  }
  ```

### Dependency Security

- [ ] **Audit dependencies**
  ```bash
  # npm
  npm audit

  # pnpm
  pnpm audit

  # Snyk
  snyk test
  ```

- [ ] **Automated dependency updates**
  - Dependabot
  - Renovate
  - Snyk

- [ ] **Pin dependency versions**
  ```json
  {
    "dependencies": {
      "react": "18.2.0",  // Exact version
      "three": "~0.160.0" // Patch updates only
    }
  }
  ```

- [ ] **Verify package integrity**
  ```bash
  # Use lockfile
  pnpm install --frozen-lockfile
  ```

### Secrets Management

- [ ] **Use secrets manager**
  - AWS Secrets Manager
  - HashiCorp Vault
  - Docker Secrets

- [ ] **Never commit secrets to git**
  - Add `.env` to `.gitignore`
  - Use pre-commit hooks (e.g., git-secrets)

- [ ] **Rotate secrets regularly**
  - API keys: Every 90 days
  - SSL certificates: Auto-renewal with certbot

- [ ] **Encrypt secrets at rest**
  ```yaml
  # Docker Swarm secrets
  secrets:
    snn_api_key:
      external: true
  ```

---

## Logging and Monitoring

### Secure Logging

- [ ] **Do NOT log sensitive data**
  - Passwords, API keys, tokens
  - Personal information (PII)
  - Credit card numbers

- [ ] **Sanitize log output**
  ```typescript
  function sanitizeLog(data: any) {
    const { password, apiKey, ...safe } = data;
    return safe;
  }

  logger.info('User login', sanitizeLog(userData));
  ```

- [ ] **Centralized logging**
  - CloudWatch Logs
  - ELK Stack (Elasticsearch, Logstash, Kibana)
  - Splunk

- [ ] **Log retention policy**
  - Access logs: 30 days
  - Error logs: 90 days
  - Security logs: 1 year

### Security Monitoring

- [ ] **Alert on security events**
  - Failed authentication attempts
  - Unusual traffic patterns
  - High error rates
  - Resource exhaustion

- [ ] **Monitor for vulnerabilities**
  ```yaml
  # Prometheus alert
  - alert: HighFailedAuthRate
    expr: rate(failed_auth_total[5m]) > 10
    annotations:
      summary: "High failed authentication rate detected"
  ```

- [ ] **Intrusion detection** (optional)
  - OSSEC
  - Fail2Ban
  - CloudWatch anomaly detection

---

## Compliance

### GDPR (if applicable)

- [ ] **Privacy policy** published
- [ ] **Cookie consent** implemented
- [ ] **Data minimization** (collect only necessary data)
- [ ] **Right to be forgotten** (data deletion)
- [ ] **Data encryption** in transit and at rest

### HIPAA (if healthcare data)

- [ ] **Encryption** (AES-256)
- [ ] **Access logs** for audit trail
- [ ] **Business Associate Agreement (BAA)** with cloud provider

### SOC 2 / ISO 27001

- [ ] **Access control policies** documented
- [ ] **Incident response plan** defined
- [ ] **Regular security audits**
- [ ] **Employee security training**

---

## Backup and Disaster Recovery

### Backup Strategy

- [ ] **Automated backups**
  ```bash
  # Daily backup at 2 AM
  0 2 * * * docker run --rm -v prometheus-data:/data -v /backup:/backup alpine tar czf /backup/prometheus-$(date +\%Y\%m\%d).tar.gz -C /data .
  ```

- [ ] **Backup encryption**
  ```bash
  gpg --encrypt --recipient ops@hololand.io prometheus-backup.tar.gz
  ```

- [ ] **Off-site backups**
  - AWS S3 with versioning
  - Google Cloud Storage
  - Azure Blob Storage

- [ ] **Backup testing**
  - Test restore monthly
  - Document restore procedure

### Disaster Recovery

- [ ] **Recovery Time Objective (RTO)** defined
  - Target: <1 hour for critical services

- [ ] **Recovery Point Objective (RPO)** defined
  - Target: <24 hours data loss

- [ ] **Disaster recovery plan** documented
  - Runbook for restoring from backup
  - Contact list for incident response

- [ ] **Multi-region deployment** (optional)
  - Active-passive failover
  - Geo-redundant storage

---

## Incident Response

### Preparation

- [ ] **Incident response plan** documented
  1. Identify: Detect security incident
  2. Contain: Isolate affected systems
  3. Eradicate: Remove threat
  4. Recover: Restore services
  5. Lessons learned: Post-mortem

- [ ] **Contact list** maintained
  - Security team
  - On-call engineer
  - Cloud provider support

- [ ] **Communication plan**
  - Internal: Slack, email
  - External: Status page, Twitter

### Detection

- [ ] **Security monitoring** enabled
  - Failed login attempts
  - Unusual API usage
  - High error rates

- [ ] **Intrusion detection**
  - File integrity monitoring (AIDE, Tripwire)
  - Network intrusion detection (Snort, Suricata)

### Response

- [ ] **Runbook for common incidents**
  - DDoS attack → Enable CloudFlare DDoS protection
  - Data breach → Notify users, regulatory authorities
  - Service outage → Failover to backup

- [ ] **Post-incident review**
  - What happened?
  - Why did it happen?
  - How to prevent recurrence?

---

## Penetration Testing

### Regular Pen Testing

- [ ] **Schedule annual penetration test**
  - Hire external security firm
  - Test for OWASP Top 10 vulnerabilities

- [ ] **Bug bounty program** (optional)
  - HackerOne
  - Bugcrowd

### OWASP Top 10

- [ ] **A01: Broken Access Control**
  - Verify RBAC implementation
  - Test for privilege escalation

- [ ] **A02: Cryptographic Failures**
  - TLS 1.2+ enforced
  - Strong cipher suites

- [ ] **A03: Injection**
  - Input validation
  - Parameterized queries (if using SQL)

- [ ] **A04: Insecure Design**
  - Threat modeling performed
  - Security requirements defined

- [ ] **A05: Security Misconfiguration**
  - Default credentials changed
  - Unnecessary services disabled

- [ ] **A06: Vulnerable and Outdated Components**
  - Dependencies audited
  - Automated updates

- [ ] **A07: Identification and Authentication Failures**
  - Multi-factor authentication (MFA) enabled
  - Session timeout configured

- [ ] **A08: Software and Data Integrity Failures**
  - Code signing
  - Dependency verification (lockfile)

- [ ] **A09: Security Logging and Monitoring Failures**
  - Comprehensive logging
  - Real-time alerts

- [ ] **A10: Server-Side Request Forgery (SSRF)**
  - Validate URLs
  - Whitelist allowed domains

---

## Security Testing

### Automated Security Scans

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Dependency audit
      - name: Audit dependencies
        run: pnpm audit

      # SAST (Static Application Security Testing)
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1

      # Container scanning
      - name: Build image
        run: docker build -t snn-perception:test .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: snn-perception:test
          exit-code: '1'
          severity: 'CRITICAL,HIGH'
```

### Manual Security Testing

- [ ] **Test authentication bypass**
- [ ] **Test authorization checks**
- [ ] **Test input validation**
- [ ] **Test rate limiting**
- [ ] **Test CORS policy**
- [ ] **Test CSP policy**

---

## Production Checklist

Before deploying to production:

### Pre-Deployment

- [ ] Security scan passed (Trivy, Snyk)
- [ ] Dependency audit clean
- [ ] Secrets removed from code
- [ ] Environment variables configured
- [ ] SSL certificate valid
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CSP headers configured
- [ ] Logging configured
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] Disaster recovery plan documented

### Post-Deployment

- [ ] Health check passing
- [ ] SSL/TLS test (https://www.ssllabs.com/ssltest/)
- [ ] Security headers test (https://securityheaders.com/)
- [ ] Load test passed
- [ ] Monitoring dashboards accessible
- [ ] Alerts configured and tested
- [ ] Incident response plan tested
- [ ] Team trained on runbooks

---

## Tools and Resources

### Security Scanning

- **Trivy**: Container vulnerability scanner
- **Snyk**: Dependency and container scanning
- **OWASP ZAP**: Web application scanner
- **Nmap**: Network scanner
- **Nikto**: Web server scanner

### Compliance

- **SOC 2**: https://www.aicpa.org/soc2
- **GDPR**: https://gdpr.eu/
- **HIPAA**: https://www.hhs.gov/hipaa/

### Best Practices

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CIS Benchmarks**: https://www.cisecurity.org/cis-benchmarks/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework

---

## Support

For security issues:
- **Email**: security@hololand.io
- **Bug Bounty**: https://hackerone.com/hololand (if enabled)

---

**Security Checklist v1.0.0**
Last Updated: 2026-03-08

**⚠️ This checklist is a guideline. Always perform a comprehensive security assessment before production deployment.**
