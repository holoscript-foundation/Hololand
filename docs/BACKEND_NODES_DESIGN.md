# Backend Nodes Design Document

**Status**: Proposed for Phase 5
**Author**: Hololand Team
**Date**: 2026-01-13

## Overview

Backend Nodes extend HoloScript and React components to support server-side functionality, enabling full-stack metaverse development within the Hololand ecosystem. This allows creators to build complete, self-hosted metaverse experiences without leaving the HoloScript paradigm.

## Motivation

Currently, Hololand focuses on client-side rendering and networking. To enable:
- Self-hosted metaverse instances
- Persistent world state
- Custom authentication
- Server-side game logic
- Real-time data synchronization

We need a unified way to define backend services that integrates seamlessly with the existing HoloScript/React architecture.

## Design Goals

1. **Declarative**: Define servers, databases, and services using familiar JSX/HoloScript syntax
2. **Type-Safe**: Full TypeScript support with inference
3. **Portable**: Deploy to any Node.js environment
4. **Integrated**: Works with existing @hololand packages
5. **Secure**: Built-in security best practices

---

## Architecture

### Package Structure

```
@hololand/backend (new package)
├── ServerNode        # HTTP/WebSocket server
├── DatabaseNode      # Database ORM wrapper
├── CacheNode         # Redis/memory caching
├── AuthNode          # Authentication provider
├── StorageNode       # File/asset storage
├── QueueNode         # Job/message queues
└── utils/            # Helpers and middleware
```

### Dependency Graph

```
@hololand/backend
├── depends on: @hololand/core (types, events)
├── depends on: @hololand/network (WebSocket integration)
├── depends on: @hololand/auth (authentication)
└── peer deps: express | fastify, prisma | drizzle, ioredis
```

---

## Core Components

### 1. ServerNode

HTTP and WebSocket server with routing.

```tsx
import { ServerNode, Route, WebSocket, Middleware } from '@hololand/backend';

// Declarative server definition
<ServerNode
  port={3000}
  cors={{ origin: '*' }}
  rateLimit={{ windowMs: 60000, max: 100 }}
>
  {/* Middleware */}
  <Middleware use={authMiddleware} />
  <Middleware use={loggingMiddleware} />

  {/* REST Routes */}
  <Route path="/api/worlds" method="GET" handler={listWorlds} />
  <Route path="/api/worlds/:id" method="GET" handler={getWorld} />
  <Route path="/api/worlds" method="POST" handler={createWorld} auth="required" />
  <Route path="/api/worlds/:id" method="PUT" handler={updateWorld} auth="owner" />
  <Route path="/api/worlds/:id" method="DELETE" handler={deleteWorld} auth="owner" />

  {/* WebSocket endpoints for real-time */}
  <WebSocket
    path="/ws/world/:worldId"
    onConnect={handleConnect}
    onMessage={handleMessage}
    onDisconnect={handleDisconnect}
    auth="optional"
  />

  {/* Static file serving */}
  <Static path="/assets" directory="./public/assets" />
</ServerNode>
```

**TypeScript API:**

```typescript
interface ServerNodeProps {
  port: number;
  host?: string;
  cors?: CorsOptions | boolean;
  rateLimit?: RateLimitOptions;
  https?: { key: string; cert: string };
  trustProxy?: boolean;
  children: React.ReactNode;
}

interface RouteProps<T = any> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: RouteHandler<T>;
  auth?: 'required' | 'optional' | 'owner' | 'admin';
  validate?: ValidationSchema;
  rateLimit?: RateLimitOptions;
}

type RouteHandler<T> = (ctx: RouteContext) => Promise<T> | T;

interface RouteContext {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  user?: AuthenticatedUser;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}
```

### 2. DatabaseNode

ORM wrapper supporting multiple providers.

```tsx
import { DatabaseNode, Model, Field, Relation } from '@hololand/backend';

<DatabaseNode
  provider="postgres"
  url={process.env.DATABASE_URL}
  logging={process.env.NODE_ENV === 'development'}
>
  {/* World model */}
  <Model name="World">
    <Field name="id" type="uuid" primaryKey autoGenerate />
    <Field name="name" type="string" required maxLength={100} />
    <Field name="description" type="text" />
    <Field name="ownerId" type="uuid" required />
    <Field name="isPublic" type="boolean" default={true} />
    <Field name="maxPlayers" type="int" default={100} />
    <Field name="createdAt" type="datetime" autoCreate />
    <Field name="updatedAt" type="datetime" autoUpdate />

    <Relation name="owner" model="User" field="ownerId" />
    <Relation name="objects" model="WorldObject" hasMany />
  </Model>

  {/* User model */}
  <Model name="User">
    <Field name="id" type="uuid" primaryKey autoGenerate />
    <Field name="email" type="string" unique required />
    <Field name="displayName" type="string" required />
    <Field name="avatarUrl" type="string" />
    <Field name="role" type="enum" values={['user', 'creator', 'admin']} default="user" />

    <Relation name="worlds" model="World" hasMany field="ownerId" />
    <Relation name="friends" model="Friendship" hasMany />
    <Relation name="inventory" model="InventoryItem" hasMany />
  </Model>

  {/* World Object model (for persistence) */}
  <Model name="WorldObject">
    <Field name="id" type="uuid" primaryKey autoGenerate />
    <Field name="worldId" type="uuid" required />
    <Field name="type" type="string" required />
    <Field name="position" type="json" />
    <Field name="rotation" type="json" />
    <Field name="scale" type="json" />
    <Field name="metadata" type="json" />
    <Field name="createdBy" type="uuid" />

    <Relation name="world" model="World" field="worldId" />
  </Model>

  {/* Inventory for commerce integration */}
  <Model name="InventoryItem">
    <Field name="id" type="uuid" primaryKey autoGenerate />
    <Field name="userId" type="uuid" required />
    <Field name="assetId" type="string" required />
    <Field name="quantity" type="int" default={1} />
    <Field name="metadata" type="json" />

    <Relation name="user" model="User" field="userId" />
  </Model>
</DatabaseNode>
```

**Generated TypeScript Types:**

```typescript
// Auto-generated from Model definitions
interface World {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  maxPlayers: number;
  createdAt: Date;
  updatedAt: Date;
  owner?: User;
  objects?: WorldObject[];
}

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'creator' | 'admin';
  worlds?: World[];
  friends?: Friendship[];
  inventory?: InventoryItem[];
}

// Database client with type-safe queries
const db = useDatabase();

// Type-safe queries
const worlds = await db.world.findMany({
  where: { isPublic: true },
  include: { owner: true },
  orderBy: { createdAt: 'desc' },
  take: 20,
});

const world = await db.world.create({
  data: {
    name: 'My World',
    ownerId: user.id,
  },
});
```

### 3. CacheNode

Caching layer for performance.

```tsx
import { CacheNode, CacheKey, CacheInvalidation } from '@hololand/backend';

<CacheNode
  provider="redis"
  url={process.env.REDIS_URL}
  defaultTTL={3600}
>
  {/* Cache patterns */}
  <CacheKey pattern="world:*" ttl={300} />
  <CacheKey pattern="user:*" ttl={600} />
  <CacheKey pattern="session:*" ttl={86400} />
  <CacheKey pattern="leaderboard:*" ttl={60} />

  {/* Invalidation rules */}
  <CacheInvalidation
    on="world.update"
    invalidate={['world:${id}', 'worlds:list']}
  />
  <CacheInvalidation
    on="user.update"
    invalidate={['user:${id}']}
  />
</CacheNode>
```

**Usage API:**

```typescript
const cache = useCache();

// Get with auto-fetch on miss
const world = await cache.get('world:123', async () => {
  return db.world.findUnique({ where: { id: '123' } });
});

// Manual set/delete
await cache.set('session:abc', sessionData, { ttl: 86400 });
await cache.delete('world:123');

// Pattern invalidation
await cache.invalidatePattern('world:*');
```

### 4. AuthNode

Authentication and authorization.

```tsx
import { AuthNode, Provider, Permission, Role } from '@hololand/backend';

<AuthNode
  sessionSecret={process.env.SESSION_SECRET}
  sessionDuration={7 * 24 * 60 * 60} // 7 days
>
  {/* OAuth providers */}
  <Provider
    type="google"
    clientId={process.env.GOOGLE_CLIENT_ID}
    clientSecret={process.env.GOOGLE_CLIENT_SECRET}
  />
  <Provider
    type="discord"
    clientId={process.env.DISCORD_CLIENT_ID}
    clientSecret={process.env.DISCORD_CLIENT_SECRET}
  />

  {/* Email/password */}
  <Provider type="email" verifyEmail={true} />

  {/* Web3 wallet */}
  <Provider type="wallet" chains={['ethereum', 'polygon']} />

  {/* Roles */}
  <Role name="user" default />
  <Role name="creator" inherits="user" />
  <Role name="moderator" inherits="user" />
  <Role name="admin" inherits={['creator', 'moderator']} />

  {/* Permissions */}
  <Permission name="world.create" roles={['creator', 'admin']} />
  <Permission name="world.delete" roles={['admin']} condition="isOwner" />
  <Permission name="user.ban" roles={['moderator', 'admin']} />
  <Permission name="asset.upload" roles={['creator', 'admin']} />
</AuthNode>
```

**Integration with @hololand/auth:**

```typescript
import { useAuth, requireAuth, requirePermission } from '@hololand/backend';

// In route handlers
const createWorld: RouteHandler = requireAuth(async (ctx) => {
  const { user } = ctx;
  // user is guaranteed to exist
  return db.world.create({
    data: { ...ctx.body, ownerId: user.id },
  });
});

// Permission check
const deleteWorld: RouteHandler = requirePermission('world.delete', async (ctx) => {
  const world = await db.world.findUnique({ where: { id: ctx.params.id } });
  if (world.ownerId !== ctx.user.id) {
    throw new ForbiddenError('Not the owner');
  }
  return db.world.delete({ where: { id: ctx.params.id } });
});
```

### 5. StorageNode

File and asset storage.

```tsx
import { StorageNode, Bucket } from '@hololand/backend';

<StorageNode provider="s3" region="us-east-1">
  {/* Asset buckets */}
  <Bucket
    name="avatars"
    public={true}
    maxSize="10MB"
    allowedTypes={['image/png', 'image/jpeg', 'image/webp']}
    transform={avatarTransform}
  />

  <Bucket
    name="world-assets"
    public={true}
    maxSize="50MB"
    allowedTypes={['model/gltf-binary', 'model/gltf+json', 'image/*', 'audio/*']}
  />

  <Bucket
    name="user-uploads"
    public={false}
    maxSize="100MB"
    auth="required"
  />
</StorageNode>
```

### 6. QueueNode

Background job processing.

```tsx
import { QueueNode, Job, Schedule } from '@hololand/backend';

<QueueNode provider="redis" url={process.env.REDIS_URL}>
  {/* Job definitions */}
  <Job
    name="processAsset"
    handler={processAssetHandler}
    retries={3}
    timeout={300000}
  />

  <Job
    name="sendNotification"
    handler={sendNotificationHandler}
    retries={5}
  />

  <Job
    name="cleanupExpiredSessions"
    handler={cleanupHandler}
  />

  {/* Scheduled jobs */}
  <Schedule job="cleanupExpiredSessions" cron="0 0 * * *" />
  <Schedule job="generateDailyStats" cron="0 1 * * *" />
</QueueNode>
```

---

## HoloScript Extensions

Backend nodes can also be defined in HoloScript for non-React users:

```javascript
// server.holo
create server on port 3000
  enable cors
  enable rate-limiting with 100 requests per minute

  route GET /api/worlds
    query all worlds where isPublic = true
    return worlds

  route POST /api/worlds
    require auth
    create world with body
    return world

  websocket /ws/world/:worldId
    on connect
      join room worldId
      broadcast "user joined"
    on message
      broadcast message to room
    on disconnect
      broadcast "user left"

// database.holo
create database with postgres

  model World
    id: uuid, primary key, auto
    name: string, required, max 100
    ownerId: uuid, required
    isPublic: boolean, default true
    objects: has many WorldObject

  model WorldObject
    id: uuid, primary key, auto
    worldId: uuid, required
    type: string, required
    position: json
    metadata: json
```

---

## Integration Examples

### Full-Stack World Hosting

```tsx
// server/index.tsx
import {
  ServerNode,
  DatabaseNode,
  CacheNode,
  AuthNode,
  StorageNode,
  Route,
  WebSocket,
  Model,
} from '@hololand/backend';

export default function HololandServer() {
  return (
    <>
      <DatabaseNode provider="postgres" url={process.env.DATABASE_URL}>
        {/* Models defined above */}
      </DatabaseNode>

      <CacheNode provider="redis" url={process.env.REDIS_URL} />

      <AuthNode sessionSecret={process.env.SESSION_SECRET}>
        <Provider type="google" {...googleConfig} />
        <Provider type="discord" {...discordConfig} />
      </AuthNode>

      <StorageNode provider="s3" region="us-east-1">
        <Bucket name="assets" public maxSize="50MB" />
      </StorageNode>

      <ServerNode port={3000} cors>
        {/* World API */}
        <Route path="/api/worlds" method="GET" handler={listWorlds} />
        <Route path="/api/worlds/:id" method="GET" handler={getWorld} />
        <Route path="/api/worlds" method="POST" handler={createWorld} auth="required" />

        {/* Real-time multiplayer */}
        <WebSocket path="/ws/world/:id" handler={worldMultiplayer} />

        {/* Asset upload */}
        <Route path="/api/assets" method="POST" handler={uploadAsset} auth="required" />
      </ServerNode>
    </>
  );
}

// Start server
import { startServer } from '@hololand/backend';
startServer(<HololandServer />);
```

### Integration with @hololand/network

```typescript
// Server-side NetworkServer integration
import { NetworkServer } from '@hololand/network';
import { useDatabase, useCache } from '@hololand/backend';

const worldMultiplayer = async (socket, ctx) => {
  const { worldId } = ctx.params;
  const { user } = ctx;

  const db = useDatabase();
  const cache = useCache();

  // Load world state (with caching)
  const world = await cache.get(`world:${worldId}`, () =>
    db.world.findUnique({
      where: { id: worldId },
      include: { objects: true },
    })
  );

  // Create network server for this world
  const networkServer = new NetworkServer({
    maxPlayers: world.maxPlayers,
    tickRate: 20,
  });

  // Handle connection
  networkServer.on('playerJoined', async (player) => {
    // Sync world state to new player
    socket.send({
      type: 'world_state',
      payload: {
        objects: world.objects,
        players: networkServer.getPlayers(),
      },
    });
  });

  // Persist changes periodically
  networkServer.on('stateChanged', debounce(async (state) => {
    await db.worldObject.upsert({
      where: { id: state.objectId },
      create: state,
      update: state,
    });
    await cache.delete(`world:${worldId}`);
  }, 5000));
};
```

---

## Deployment

### Docker Support

```dockerfile
# Dockerfile.backend
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY dist/ ./dist/
COPY prisma/ ./prisma/

RUN npx prisma generate

EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

### Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/hololand
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-secret-key

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=hololand-assets
S3_REGION=us-east-1
```

### CLI Commands

```bash
# Generate database client and migrations
npx hololand-backend generate

# Run migrations
npx hololand-backend migrate

# Start development server
npx hololand-backend dev

# Build for production
npx hololand-backend build

# Start production server
npx hololand-backend start
```

---

## Migration Path

### Phase 5.1: Core Package (Q2 2027)
- ServerNode with Express adapter
- DatabaseNode with Prisma adapter
- Basic CacheNode with in-memory

### Phase 5.2: Auth & Storage (Q3 2027)
- AuthNode with OAuth providers
- StorageNode with S3/local
- Redis cache adapter

### Phase 5.3: Advanced Features (Q4 2027)
- QueueNode for background jobs
- Real-time sync with @hololand/network
- HoloScript backend extensions

### Phase 5.4: Cloud Platform (Q1 2028)
- Hololand Cloud hosting
- One-click deployment
- Managed databases and storage

---

## Security Considerations

1. **Input Validation**: All route inputs validated by default
2. **SQL Injection**: ORM prevents SQL injection
3. **XSS/CSRF**: Built-in protection middleware
4. **Rate Limiting**: Configurable per-route limits
5. **Authentication**: JWT with secure defaults
6. **Secrets**: Environment variable best practices
7. **HTTPS**: Required in production mode

---

## Success Metrics

- Self-hosted world deployments: 1,000+
- Average deployment time: < 5 minutes
- API response time: < 100ms (p95)
- Database query optimization: auto-indexing suggestions
- Developer satisfaction: > 4.5/5 rating

---

## Open Questions

1. Should we support multiple ORM providers (Prisma, Drizzle, TypeORM)?
2. GraphQL support in addition to REST?
3. Edge deployment (Cloudflare Workers, Vercel Edge)?
4. Native WebTransport support for low-latency?

---

## References

- [Express.js](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/)
- [Redis](https://redis.io/)
- [@hololand/network](../packages/network/README.md)
- [@hololand/auth](../packages/auth/README.md)
