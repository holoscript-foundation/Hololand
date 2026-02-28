# Security Best Practices

**Build secure VR/AR applications with HoloLand**

Comprehensive guide to security considerations for VR/AR applications, covering authentication, authorization, data protection, content moderation, and anti-cheat measures.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Input Validation](#input-validation)
5. [Content Moderation](#content-moderation)
6. [Anti-Cheat](#anti-cheat)
7. [Privacy](#privacy)
8. [Network Security](#network-security)
9. [Asset Security](#asset-security)
10. [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Security Overview

### VR/AR-Specific Threats

VR/AR applications face unique security challenges:

- **Personal Space Invasion**: Unwanted proximity in VR
- **Motion Tracking Data**: Sensitive biometric information
- **User-Generated Content**: Malicious 3D models, scripts
- **Social Engineering**: Impersonation, harassment
- **Cheating**: Position spoofing, aim bots
- **Privacy**: Eye tracking, facial expressions, voice data

### Security Principles

1. **Zero Trust**: Never trust client-side data
2. **Defense in Depth**: Multiple layers of security
3. **Least Privilege**: Minimum permissions required
4. **Fail Secure**: Deny by default
5. **Security by Design**: Build security in from the start

---

## Authentication & Authorization

### User Authentication

```typescript
import { AuthManager } from '@hololand/auth';

// ❌ Bad - Client-side only authentication
function login(username, password) {
  if (password === 'password123') {
    user.authenticated = true;  // Easy to bypass!
  }
}

// ✅ Good - Server-side authentication
async function login(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    const { token } = await response.json();
    sessionStorage.setItem('authToken', token);
    return true;
  }

  return false;
}
```

### OAuth 2.0 Integration

```typescript
// OAuth 2.0 for third-party auth
const auth = new AuthManager({
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: 'https://yourapp.com/auth/callback'
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      redirectUri: 'https://yourapp.com/auth/callback'
    }
  }
});

// Login with OAuth
await auth.loginWithProvider('google');
```

### Token Management

```typescript
// ✅ Good - Secure token storage
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    // Store in memory (not localStorage - XSS risk)
    this.accessToken = access;

    // Store refresh token in httpOnly cookie (server-side)
    document.cookie = `refresh_token=${refresh}; Secure; HttpOnly; SameSite=Strict`;
  }

  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'  // Send httpOnly cookie
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      this.accessToken = accessToken;
      return accessToken;
    }

    // Token expired - re-authenticate
    this.logout();
    return null;
  }

  getAccessToken() {
    return this.accessToken;
  }

  logout() {
    this.accessToken = null;
    document.cookie = 'refresh_token=; Max-Age=0';
  }
}
```

### Authorization

```typescript
// Role-Based Access Control (RBAC)
enum Role {
  User = 'user',
  Moderator = 'moderator',
  Admin = 'admin'
}

interface User {
  id: string;
  role: Role;
  permissions: string[];
}

function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

// Server-side authorization
app.post('/api/worlds/:id/delete', async (req, res) => {
  const user = await authenticateUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const world = await getWorld(req.params.id);

  // Check ownership or admin role
  if (world.ownerId !== user.id && user.role !== Role.Admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await deleteWorld(world.id);
  res.json({ success: true });
});
```

---

## Data Protection

### Encryption at Rest

```typescript
// Encrypt sensitive data before storing
import { encrypt, decrypt } from '@hololand/crypto';

// ✅ Encrypt user data
const encryptedData = encrypt(JSON.stringify(userData), {
  algorithm: 'aes-256-gcm',
  key: process.env.ENCRYPTION_KEY
});

await db.users.update(userId, {
  encryptedData
});

// Decrypt when needed
const decryptedData = decrypt(encryptedData, {
  algorithm: 'aes-256-gcm',
  key: process.env.ENCRYPTION_KEY
});

const userData = JSON.parse(decryptedData);
```

### Encryption in Transit

```typescript
// ✅ Always use HTTPS
const server = https.createServer({
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem')
}, app);

// ✅ Enforce TLS 1.2+
server.setSecureContext({
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256'
});

// ❌ Never send sensitive data over HTTP
// ❌ Never send passwords in URLs (use POST body)
```

### Secure Communication

```typescript
// Use WSS (WebSocket Secure) for real-time communication
const ws = new WebSocket('wss://yourserver.com/multiplayer');

// ❌ Don't use unencrypted WebSocket
// const ws = new WebSocket('ws://yourserver.com/multiplayer');
```

---

## Input Validation

### Validate All User Input

```typescript
// ❌ Bad - No validation
function createWorld(name: string, description: string) {
  database.insert({ name, description });
}

// ✅ Good - Strict validation
import { z } from 'zod';

const WorldSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9-_ ]+$/),
  description: z.string().max(500),
  tags: z.array(z.string()).max(10),
  isPublic: z.boolean()
});

function createWorld(input: unknown) {
  // Validate and sanitize
  const data = WorldSchema.parse(input);

  // Escape HTML to prevent XSS
  const sanitized = {
    name: escapeHtml(data.name),
    description: escapeHtml(data.description),
    tags: data.tags.map(escapeHtml),
    isPublic: data.isPublic
  };

  return database.insert(sanitized);
}
```

### Prevent Injection Attacks

```typescript
// ❌ SQL Injection vulnerability
function getUser(username: string) {
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  return db.query(query);
}
// Attack: username = "'; DROP TABLE users; --"

// ✅ Use parameterized queries
function getUser(username: string) {
  return db.query('SELECT * FROM users WHERE username = ?', [username]);
}

// ❌ Command injection
function runCommand(userInput: string) {
  exec(`echo ${userInput}`);  // Dangerous!
}
// Attack: userInput = "hello; rm -rf /"

// ✅ Never execute user input as code
// ✅ Use allowlists instead of user input
```

### Sanitize File Uploads

```typescript
// ❌ Bad - Accept any file
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  fs.writeFileSync(`./uploads/${file.originalname}`, file.buffer);
});

// ✅ Good - Validate file type and size
import { validateFile } from '@hololand/security';

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  // Validate file type (allowlist)
  const allowedTypes = ['image/png', 'image/jpeg', 'model/gltf-binary'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large' });
  }

  // Scan for malware
  const isSafe = await scanFile(file.buffer);
  if (!isSafe) {
    return res.status(400).json({ error: 'Malicious file detected' });
  }

  // Generate safe filename (don't use original name)
  const safeFilename = `${crypto.randomUUID()}.${getExtension(file.mimetype)}`;

  fs.writeFileSync(`./uploads/${safeFilename}`, file.buffer);
  res.json({ filename: safeFilename });
});
```

---

## Content Moderation

### User-Generated Content (UGC)

```typescript
// Content moderation pipeline
class ContentModerator {
  async moderateWorld(world: World): Promise<ModerationResult> {
    const checks = await Promise.all([
      this.checkProfanity(world.name, world.description),
      this.checkMaliciousScripts(world.scripts),
      this.check3DModels(world.models),
      this.checkTextures(world.textures)
    ]);

    const flagged = checks.filter(c => c.flagged);

    if (flagged.length > 0) {
      return {
        approved: false,
        reason: flagged.map(f => f.reason).join(', '),
        severity: Math.max(...flagged.map(f => f.severity))
      };
    }

    return { approved: true };
  }

  async checkProfanity(name: string, description: string) {
    const text = `${name} ${description}`;
    const hasProfanity = await profanityFilter.check(text);

    return {
      flagged: hasProfanity,
      reason: 'Contains profanity',
      severity: 1
    };
  }

  async checkMaliciousScripts(scripts: string[]) {
    // Look for dangerous patterns
    const dangerousPatterns = [
      /eval\(/,
      /Function\(/,
      /window\./,
      /document\./,
      /<script>/i,
      /\.innerHTML/
    ];

    for (const script of scripts) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(script)) {
          return {
            flagged: true,
            reason: 'Malicious script detected',
            severity: 3  // Critical
          };
        }
      }
    }

    return { flagged: false };
  }

  async check3DModels(models: Model[]) {
    for (const model of models) {
      // Check polygon count (DoS prevention)
      if (model.polygons > 1000000) {
        return {
          flagged: true,
          reason: 'Model too complex (DoS risk)',
          severity: 2
        };
      }

      // Check texture count
      if (model.textures.length > 50) {
        return {
          flagged: true,
          reason: 'Too many textures (resource exhaustion)',
          severity: 2
        };
      }

      // Check for embedded scripts
      if (model.hasEmbeddedScripts) {
        return {
          flagged: true,
          reason: 'Embedded scripts in 3D model',
          severity: 3
        };
      }
    }

    return { flagged: false };
  }

  async checkTextures(textures: Texture[]) {
    for (const texture of textures) {
      // Check resolution (memory exhaustion)
      if (texture.width > 4096 || texture.height > 4096) {
        return {
          flagged: true,
          reason: 'Texture resolution too high',
          severity: 2
        };
      }

      // Image recognition for inappropriate content
      const result = await imageRecognition.analyze(texture.data);
      if (result.inappropriate) {
        return {
          flagged: true,
          reason: 'Inappropriate image content',
          severity: 3
        };
      }
    }

    return { flagged: false };
  }
}
```

### Report System

```typescript
// User reporting system
interface Report {
  reporterId: string;
  reportedUserId: string;
  worldId?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  evidence?: string[];
  timestamp: Date;
}

async function submitReport(report: Report) {
  // Validate reporter authentication
  const reporter = await authenticateUser(report.reporterId);
  if (!reporter) {
    throw new Error('Unauthorized');
  }

  // Rate limit reports (prevent spam)
  const recentReports = await getRecentReports(reporter.id, 3600);
  if (recentReports.length > 10) {
    throw new Error('Too many reports in the last hour');
  }

  // Save report
  await db.reports.create(report);

  // Auto-action on high severity
  if (report.severity === 'high') {
    await moderatorQueue.addPriority(report);

    // Temporary action while pending review
    if (report.worldId) {
      await setWorldVisibility(report.worldId, 'private');
    }
  }

  // Notify moderators
  await notifyModerators(report);
}
```

---

## Anti-Cheat

### Server-Side Validation

```typescript
// ❌ Bad - Trust client position
socket.on('playerMove', (data) => {
  player.position = data.position;  // Client can teleport anywhere!
  broadcast(player);
});

// ✅ Good - Validate movement server-side
socket.on('playerMove', (data) => {
  const maxSpeed = 10;  // m/s
  const deltaTime = (Date.now() - player.lastUpdate) / 1000;
  const maxDistance = maxSpeed * deltaTime;

  const distance = calculateDistance(player.position, data.position);

  if (distance > maxDistance) {
    // Suspicious movement - possible cheat
    console.warn(`Suspicious movement from ${player.id}: ${distance}m in ${deltaTime}s`);

    // Revert to last known good position
    socket.emit('positionCorrection', player.position);
    return;
  }

  // Valid movement
  player.position = data.position;
  player.lastUpdate = Date.now();
  broadcast(player);
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Rate limit API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// Stricter rate limit for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

### Cheat Detection

```typescript
class CheatDetector {
  suspiciousActions = new Map<string, number>();

  checkMovement(playerId: string, oldPos: Vec3, newPos: Vec3, deltaTime: number) {
    const distance = calculateDistance(oldPos, newPos);
    const speed = distance / deltaTime;

    // Flag impossible speeds
    if (speed > 20) {  // 20 m/s max
      this.flagSuspicious(playerId, 'impossible_speed', speed);
      return false;
    }

    return true;
  }

  checkAction(playerId: string, action: string, target: Vec3) {
    const player = getPlayer(playerId);
    const distance = calculateDistance(player.position, target);

    // Check interaction distance
    if (distance > 5) {  // 5m max reach
      this.flagSuspicious(playerId, 'impossible_reach', distance);
      return false;
    }

    return true;
  }

  flagSuspicious(playerId: string, reason: string, value: number) {
    const count = (this.suspiciousActions.get(playerId) || 0) + 1;
    this.suspiciousActions.set(playerId, count);

    console.warn(`Suspicious action from ${playerId}: ${reason} (${value})`);

    // Auto-ban after threshold
    if (count > 10) {
      this.banPlayer(playerId, `Repeated suspicious actions: ${reason}`);
    }
  }

  async banPlayer(playerId: string, reason: string) {
    await db.bans.create({
      playerId,
      reason,
      timestamp: new Date(),
      duration: 7 * 24 * 60 * 60 * 1000  // 7 days
    });

    // Kick from server
    disconnectPlayer(playerId);

    // Notify moderators
    await notifyModerators({
      type: 'auto_ban',
      playerId,
      reason
    });
  }
}
```

---

## Privacy

### Data Collection

```typescript
// ✅ Minimal data collection
interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  // DON'T store: IP addresses, device fingerprints, biometrics
}

// ✅ Anonymize analytics
interface AnalyticsEvent {
  eventType: string;
  worldId: string;
  timestamp: Date;
  anonymousUserId: string;  // Hashed user ID
  // DON'T send: username, email, personal info
}
```

### Motion Tracking Privacy

```typescript
// ❌ Bad - Store raw motion data
function trackMotion(player) {
  database.store({
    playerId: player.id,
    headPosition: player.headset.position,
    headRotation: player.headset.rotation,
    leftHandPosition: player.leftHand.position,
    rightHandPosition: player.rightHand.position
  });
}

// ✅ Good - Don't store biometric data
// Motion data can identify individuals (gait analysis)
// Only transmit in real-time, don't persist

// ✅ If analytics needed, aggregate only
function trackAnalytics() {
  // Aggregate data (no individual identification)
  const stats = {
    averagePlayTime: calculateAverage(allPlayers.map(p => p.playTime)),
    popularWorlds: getMostVisited(),
    peakConcurrentUsers: Math.max(...hourlyUserCounts)
  };

  database.analytics.insert(stats);
}
```

### GDPR Compliance

```typescript
// Data export (GDPR Article 20)
app.get('/api/user/export', authenticate, async (req, res) => {
  const userId = req.user.id;

  const data = {
    profile: await db.users.findOne(userId),
    worlds: await db.worlds.find({ ownerId: userId }),
    friends: await db.friendships.find({ userId }),
    analytics: await db.analytics.find({ userId })
  };

  res.json(data);
});

// Data deletion (GDPR Article 17)
app.delete('/api/user/delete', authenticate, async (req, res) => {
  const userId = req.user.id;

  // Delete all user data
  await db.users.delete(userId);
  await db.worlds.deleteMany({ ownerId: userId });
  await db.friendships.deleteMany({ userId });
  await db.analytics.deleteMany({ userId });

  res.json({ message: 'Account deleted' });
});
```

---

## Network Security

### WebSocket Security

```typescript
// ✅ Authenticate WebSocket connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const user = await verifyToken(token);
    socket.data.userId = user.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ✅ Validate all messages
io.on('connection', (socket) => {
  socket.on('chat', (data) => {
    // Validate message
    if (typeof data.message !== 'string' || data.message.length > 500) {
      socket.emit('error', 'Invalid message');
      return;
    }

    // Sanitize
    const sanitized = escapeHtml(data.message);

    // Rate limit
    if (!rateLimiter.check(socket.data.userId)) {
      socket.emit('error', 'Rate limit exceeded');
      return;
    }

    // Broadcast
    io.emit('chat', {
      userId: socket.data.userId,
      message: sanitized,
      timestamp: Date.now()
    });
  });
});
```

### DDoS Protection

```typescript
// Use CloudFlare or similar CDN
// Implement rate limiting
// Use connection pools

// Application-level protection
const connectionLimiter = new Map<string, number>();

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  const count = connectionLimiter.get(ip) || 0;

  if (count > 10) {
    socket.disconnect();
    console.warn(`Too many connections from ${ip}`);
    return;
  }

  connectionLimiter.set(ip, count + 1);

  socket.on('disconnect', () => {
    connectionLimiter.set(ip, (connectionLimiter.get(ip) || 1) - 1);
  });
});
```

---

## Asset Security

### 3D Model Validation

```typescript
import { GLTFValidator } from '@hololand/validation';

async function validateModel(file: Buffer): Promise<boolean> {
  const validator = new GLTFValidator();

  // Parse GLTF/GLB
  const model = await validator.parse(file);

  // Check for malicious content
  if (model.hasEmbeddedScripts) {
    return false;  // Scripts in 3D models = red flag
  }

  // Check complexity (DoS prevention)
  if (model.triangleCount > 1000000) {
    return false;  // Too complex
  }

  // Check texture count
  if (model.textures.length > 50) {
    return false;  // Suspicious
  }

  // Check file size
  if (file.length > 100 * 1024 * 1024) {  // 100MB
    return false;  // Too large
  }

  return true;
}
```

### Sandboxing User Scripts

```typescript
// ❌ Never execute user code directly
function runUserScript(code: string) {
  eval(code);  // EXTREMELY DANGEROUS!
}

// ✅ Use a sandboxed environment
import { Sandbox } from '@hololand/sandbox';

async function runUserScript(code: string) {
  const sandbox = new Sandbox({
    timeout: 5000,  // 5 second max execution
    memoryLimit: 50 * 1024 * 1024,  // 50MB max memory
    allowedAPIs: ['console.log', 'Math']  // Whitelist only
  });

  try {
    const result = await sandbox.execute(code);
    return result;
  } catch (err) {
    console.error('Script execution failed:', err);
    return null;
  }
}
```

---

## Reporting Vulnerabilities

If you discover a security vulnerability in HoloLand, please report it responsibly:

### Contact

- **Email**: security@hololand.io
- **PGP Key**: [Download](https://hololand.io/security/pgp-key.asc)

### What to Include

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Disclosure Policy

- We'll acknowledge your report within 24 hours
- We'll provide a fix timeline within 7 days
- We'll notify you when the fix is deployed
- We'll credit you in our security advisories (if desired)

### Bug Bounty

We offer rewards for valid security findings:

- **Critical** (RCE, auth bypass): $500-$2000
- **High** (XSS, SQL injection): $200-$500
- **Medium** (CSRF, info disclosure): $50-$200
- **Low** (rate limiting, minor issues): $10-$50

---

## Security Checklist

### Development

- [ ] Use HTTPS everywhere
- [ ] Validate all user input
- [ ] Sanitize output (prevent XSS)
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Implement authentication & authorization
- [ ] Store passwords with bcrypt (12+ rounds)
- [ ] Use secure session management
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Set security headers (CSP, HSTS, X-Frame-Options)

### Deployment

- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/TLS 1.2+
- [ ] Set up firewall rules
- [ ] Use secure WebSocket (WSS)
- [ ] Enable logging & monitoring
- [ ] Regular security updates
- [ ] Backup encryption keys
- [ ] Implement DDoS protection
- [ ] Set up CDN (CloudFlare, etc.)
- [ ] Regular security audits

### User Content

- [ ] Moderate user-generated worlds
- [ ] Scan uploaded files for malware
- [ ] Validate 3D models (complexity, scripts)
- [ ] Sandbox user scripts
- [ ] Implement report system
- [ ] Content rating system (ESRB, PEGI)
- [ ] Privacy controls (block, mute)
- [ ] Personal space boundaries

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Web Security Academy](https://portswigger.net/web-security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
