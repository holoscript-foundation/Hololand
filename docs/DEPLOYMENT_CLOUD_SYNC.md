# HoloScript Cloud Sync Server Setup Guide

## Overview

Deploy optional cloud sync server for party data, multiplayer state, analytics aggregation, and marketplace hosting. Clients work fully offline; cloud is optional for enhanced features.

**Technology**: Node.js + Express + Prisma + PostgreSQL  
**Architecture**: REST API + WebSocket for real-time sync  
**Deployment**: Docker + Kubernetes or standalone  
**Database**: PostgreSQL with automatic backups

---

## Prerequisites

```bash
# Node.js 16+
node --version

# Docker (optional)
docker --version

# PostgreSQL 12+
psql --version

# Environment setup
npm install -g dotenv-cli
```

---

## Project Setup

### 1. Create Server Project

```bash
mkdir packages/cloud-sync-server
cd packages/cloud-sync-server

npm init -y
npm install express cors dotenv @types/express
npm install prisma @prisma/client
npm install socket.io socket.io-client
npm install jsonwebtoken bcryptjs
npm install --save-dev typescript ts-node @types/node
npm install --save-dev nodemon
```

### 2. Database Schema

**prisma/schema.prisma**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  email         String    @unique
  password      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  parties       Party[]
  sessions      Session[]
  submissions   MarketplaceItem[]
  rating        Rating[]
}

// ============================================================================
// PARTY & MULTIPLAYER
// ============================================================================

model Party {
  id            String    @id @default(cuid())
  name          String
  owner         User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId       String
  
  maxPlayers    Int
  currentPlayers Int @default(0)
  state         Json      // Synced game state
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  expiresAt     DateTime
  
  members       PartyMember[]
  history       SyncEvent[]
  
  @@index([ownerId])
  @@index([expiresAt])
}

model PartyMember {
  id            String    @id @default(cuid())
  party         Party     @relation(fields: [partyId], references: [id], onDelete: Cascade)
  partyId       String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  
  joinedAt      DateTime  @default(now())
  lastActivity  DateTime  @updatedAt
  
  @@unique([partyId, userId])
}

// ============================================================================
// NETWORKING & SYNC
// ============================================================================

model SyncEvent {
  id            String    @id @default(cuid())
  party         Party     @relation(fields: [partyId], references: [id], onDelete: Cascade)
  partyId       String
  
  objectId      String
  state         Json
  timestamp     DateTime  @default(now())
  source        String    // "client" | "peer"
  
  @@index([partyId])
  @@index([timestamp])
}

// ============================================================================
// ANALYTICS
// ============================================================================

model Session {
  id            String    @id @default(cuid())
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  
  startTime     DateTime  @default(now())
  endTime       DateTime?
  duration      Int       // seconds
  
  events        AnalyticsEvent[]
  
  @@index([userId])
  @@index([startTime])
}

model AnalyticsEvent {
  id            String    @id @default(cuid())
  session       Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  sessionId     String
  
  eventName     String
  eventData     Json
  timestamp     DateTime  @default(now())
  
  @@index([sessionId])
  @@index([eventName])
}

// ============================================================================
// MARKETPLACE
// ============================================================================

model MarketplaceItem {
  id            String    @id @default(cuid())
  name          String
  description   String?
  category      String    // "world" | "building" | "npc" | "item"
  
  author        User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId      String
  
  data          Json      // Actual item data (HoloScript code, models, etc.)
  thumbnail     String?   // URL to preview image
  
  downloads     Int       @default(0)
  averageRating Float     @default(0)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  ratings       Rating[]
  
  @@index([category])
  @@index([authorId])
  @@index([createdAt])
}

model Rating {
  id            String    @id @default(cuid())
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  
  item          MarketplaceItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  itemId        String
  
  score         Int       // 1-5
  comment       String?
  
  createdAt     DateTime  @default(now())
  
  @@unique([userId, itemId])
}

// ============================================================================
// VERSION CONTROL
// ============================================================================

model SceneSnapshot {
  id            String    @id @default(cuid())
  name          String
  description   String?
  
  data          Json      // Scene data
  createdAt     DateTime  @default(now())
}
```

### 3. Setup Database

```bash
# Create .env
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/holoscript"
JWT_SECRET="your-secret-key-change-this"
NODE_ENV="development"
EOF

# Initialize Prisma
npx prisma migrate dev --name init

# Create database
createdb holoscript
```

---

## Server Implementation

### 1. Main Express Server

**src/server.ts**:
```typescript
import express from 'express'
import cors from 'cors'
import { Server as SocketIO } from 'socket.io'
import { createServer } from 'http'
import { PrismaClient } from '@prisma/client'

const app = express()
const httpServer = createServer(app)
const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

const prisma = new PrismaClient()

// Middleware
app.use(cors())
app.use(express.json())

// =========================================================================
// AUTHENTICATION
// =========================================================================

import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'

const SECRET = process.env.JWT_SECRET || 'dev-secret'

interface AuthRequest extends express.Request {
  userId?: string
}

const authMiddleware = (req: AuthRequest, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'No token' })
  }
  
  try {
    const decoded = jwt.verify(token, SECRET) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// =========================================================================
// AUTH ENDPOINTS
// =========================================================================

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body
  
  const hashed = await bcryptjs.hash(password, 10)
  
  const user = await prisma.user.create({
    data: { username, email, password: hashed }
  })
  
  const token = jwt.sign({ userId: user.id }, SECRET)
  res.json({ token, userId: user.id })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  
  const user = await prisma.user.findUnique({
    where: { email }
  })
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }
  
  const valid = await bcryptjs.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  
  const token = jwt.sign({ userId: user.id }, SECRET)
  res.json({ token, userId: user.id })
})

// =========================================================================
// PARTY ENDPOINTS
// =========================================================================

app.post('/api/parties', authMiddleware, async (req: AuthRequest, res) => {
  const { name, maxPlayers } = req.body
  
  const party = await prisma.party.create({
    data: {
      name,
      maxPlayers,
      ownerId: req.userId!,
      state: {},
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  })
  
  res.json(party)
})

app.get('/api/parties/:id', async (req, res) => {
  const party = await prisma.party.findUnique({
    where: { id: req.params.id },
    include: {
      members: true,
      history: { take: 100, orderBy: { timestamp: 'desc' } }
    }
  })
  
  res.json(party)
})

app.post('/api/parties/:id/sync', authMiddleware, async (req: AuthRequest, res) => {
  const { objectId, state } = req.body
  
  const event = await prisma.syncEvent.create({
    data: {
      partyId: req.params.id,
      objectId,
      state,
      source: 'client'
    }
  })
  
  // Broadcast to all party members via WebSocket
  io.to(req.params.id).emit('sync', event)
  
  res.json(event)
})

// =========================================================================
// MARKETPLACE ENDPOINTS
// =========================================================================

app.post('/api/marketplace', authMiddleware, async (req: AuthRequest, res) => {
  const { name, description, category, data, thumbnail } = req.body
  
  const item = await prisma.marketplaceItem.create({
    data: {
      name,
      description,
      category,
      data,
      thumbnail,
      authorId: req.userId!
    }
  })
  
  res.json(item)
})

app.get('/api/marketplace/search', async (req, res) => {
  const { q, category } = req.query
  
  const items = await prisma.marketplaceItem.findMany({
    where: {
      AND: [
        q ? { name: { contains: q as string, mode: 'insensitive' } } : {},
        category ? { category: category as string } : {}
      ]
    },
    orderBy: { createdAt: 'desc' }
  })
  
  res.json(items)
})

app.post('/api/marketplace/:id/rate', authMiddleware, async (req: AuthRequest, res) => {
  const { score, comment } = req.body
  
  const rating = await prisma.rating.create({
    data: {
      userId: req.userId!,
      itemId: req.params.id,
      score,
      comment
    }
  })
  
  res.json(rating)
})

// =========================================================================
// ANALYTICS ENDPOINTS
// =========================================================================

app.post('/api/analytics/sessions', authMiddleware, async (req: AuthRequest, res) => {
  const session = await prisma.session.create({
    data: {
      userId: req.userId!
    }
  })
  
  res.json(session)
})

app.post('/api/analytics/sessions/:id/event', authMiddleware, async (req: AuthRequest, res) => {
  const { eventName, eventData } = req.body
  
  const event = await prisma.analyticsEvent.create({
    data: {
      sessionId: req.params.id,
      eventName,
      eventData
    }
  })
  
  res.json(event)
})

// =========================================================================
// WEBSOCKET
// =========================================================================

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)
  
  socket.on('join-party', (partyId) => {
    socket.join(partyId)
    io.to(partyId).emit('user-joined', { userId: socket.id })
  })
  
  socket.on('object-update', (partyId, objectId, state) => {
    io.to(partyId).emit('object-updated', { objectId, state })
  })
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
  })
})

// =========================================================================
// SERVER
// =========================================================================

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
```

### 2. Docker Setup

**Dockerfile**:
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: holoscript
      POSTGRES_USER: holoscript
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    environment:
      DATABASE_URL: "postgresql://holoscript:changeme@postgres:5432/holoscript"
      JWT_SECRET: "your-secret-key"
      NODE_ENV: "production"
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## Deployment

### 1. Local Testing

```bash
# Start services
docker-compose up -d

# Run migrations
npm run prisma:migrate

# Start server
npm start
```

### 2. Production Deployment

**Render.com** (Recommended for hobby projects):
```bash
# Push to GitHub
git push

# Connect Render.com
# Auto-deploys on push
```

**Heroku**:
```bash
# Install Heroku CLI
npm install -g heroku

# Deploy
heroku create holoscript-api
git push heroku main
```

**AWS EC2**:
```bash
# SSH into instance
ssh -i key.pem ubuntu@instance

# Setup Node
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/your-repo

# Setup database
sudo apt-get install postgresql

# Deploy
npm install
npm start
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ✗ | Register user |
| POST | `/api/auth/login` | ✗ | Login user |
| POST | `/api/parties` | ✓ | Create party |
| GET | `/api/parties/:id` | ✗ | Get party details |
| POST | `/api/parties/:id/sync` | ✓ | Sync object state |
| POST | `/api/marketplace` | ✓ | Publish item |
| GET | `/api/marketplace/search` | ✗ | Search marketplace |
| POST | `/api/marketplace/:id/rate` | ✓ | Rate item |
| POST | `/api/analytics/sessions` | ✓ | Start session |
| POST | `/api/analytics/sessions/:id/event` | ✓ | Track event |

---

## Monitoring

### Database Backups

```bash
# Daily backup
0 2 * * * pg_dump -h localhost holoscript > backup_$(date +\%Y\%m\%d).sql

# Restore
psql -h localhost holoscript < backup_20240101.sql
```

### Log Monitoring

```bash
# View logs
docker logs -f container_id

# Or with PM2
pm2 logs
```

---

## Scaling

### Database Replication

```sql
-- Setup read replica
CREATE PUBLICATION holoscript_pub FOR ALL TABLES;

-- Connect replica
CREATE SUBSCRIPTION holoscript_sub CONNECTION '...' 
  PUBLICATION holoscript_pub;
```

### Load Balancing

```nginx
upstream holoscript_api {
  server api1:3000;
  server api2:3000;
  server api3:3000;
}

server {
  listen 80;
  server_name api.holoscript.com;
  
  location / {
    proxy_pass http://holoscript_api;
  }
}
```

---

## Next Steps

1. ✅ Server setup complete
2. → Deploy to production
3. → Setup SSL/TLS certificates
4. → Configure CDN for assets
5. → Add monitoring and alerting

---

**Cloud sync ready!** ☁️🚀
