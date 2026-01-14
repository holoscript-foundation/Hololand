# Hololand ⟷ uaa2-service Implementation Guide

**Complete step-by-step guide to implement the hybrid architecture**

## 🎯 Overview

This guide walks through implementing the full hybrid system where:
- **uaa2-service** (Master Portal) orchestrates AI agents
- **Hololand** provides the 3D VR/AR interface
- **Agents can spawn VR worlds**, execute HoloScript, and collaborate
- **Users get AI assistance** everywhere in VR

## 📦 What's Been Built

### ✅ Complete Backend (Hololand)
- Express + TypeScript server
- PostgreSQL + Prisma ORM
- Redis caching
- Socket.io real-time multiplayer
- JWT authentication (email, Web3)
- All CRUD APIs for worlds, portals, themes
- AI integration endpoints
- HoloScript execution framework

### ✅ MCP Server (@hololand/mcp-server)
- 8 tools for spatial computing
- Standard MCP protocol
- Bridges agents to Hololand

### ✅ Documentation
- Complete architecture design
- API documentation
- Use case examples

## 🚀 Implementation Steps

---

## Phase 1: Setup Hololand Backend (30 min)

### 1.1 Install Dependencies

```bash
cd platform/backend
npm install
```

### 1.2 Start Development Database

```bash
# Start PostgreSQL + Redis
npm run docker:up

# Verify services are running
docker ps
```

### 1.3 Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your configuration
```

**Minimum required:**
```env
DATABASE_URL=postgresql://hololand:hololand_dev_password@localhost:5432/hololand
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
UAA2_API_URL=http://localhost:3000
UAA2_API_KEY=your-uaa2-api-key
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ADMIN_WALLETS=0xYourWalletAddress
```

### 1.4 Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run migrate

# Seed database (optional)
npm run db:seed
```

### 1.5 Start Backend Server

```bash
# Development mode (hot reload)
npm run dev

# Server runs on http://localhost:3001
```

### 1.6 Test Backend

```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"healthy",...}
```

---

## Phase 2: Setup MCP Server (15 min)

### 2.1 Build MCP Server

```bash
cd packages/mcp-server
npm install
npm run build
```

### 2.2 Test MCP Server

```bash
# Set environment
export HOLOLAND_API_URL=http://localhost:3001
export HOLOLAND_API_KEY=test-key

# Run server
npm start
```

---

## Phase 3: Integrate with uaa2-service (45 min)

### 3.1 Add MCP Server to uaa2-service

**In uaa2-service repo:**

```bash
cd /path/to/uaa2-service

# Update MCP configuration
```

**Add to `mcp_config.json` or equivalent:**

```json
{
  "mcpServers": {
    "hololand": {
      "command": "node",
      "args": [
        "/path/to/Hololand/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "HOLOLAND_API_URL": "http://localhost:3001",
        "HOLOLAND_API_KEY": "your-shared-api-key"
      }
    }
  }
}
```

### 3.2 Create Hololand Extension

**Create `uaa2-service/src/extensions/hololand/index.ts`:**

```typescript
import { MasterPortalExtension } from '../core/Extension';
import { Agent } from '../../agents/BaseAgent';

export class HololandExtension extends MasterPortalExtension {
  name = 'hololand';
  version = '1.0.0';

  async spawnWorld(agent: Agent, config: any) {
    return await agent.useMcpTool('hololand', 'create_world', {
      name: `${agent.role}-workspace`,
      template: config.template || 'blank',
      privacy: 'agent-only',
      ownerId: agent.id,
    });
  }

  async executeHoloScript(agent: Agent, worldId: string, code: string) {
    return await agent.useMcpTool('hololand', 'execute_holoscript', {
      worldId,
      code,
    });
  }

  async visualize(agent: Agent, worldId: string, data: any, vizType: string) {
    return await agent.useMcpTool('hololand', 'visualize_data', {
      worldId,
      data,
      vizType,
    });
  }
}
```

### 3.3 Register Extension

**In `uaa2-service/src/extensions/index.ts`:**

```typescript
import { HololandExtension } from './hololand';

export function registerExtensions(masterPortal: MasterPortal) {
  masterPortal.registerExtension(new HololandExtension());
}
```

### 3.4 Update Agent Capabilities

**Brittney Agent Example:**

```typescript
// uaa2-service/src/agents/CustomerServiceAgent.ts

export class CustomerServiceAgent extends BaseAgent {
  capabilities = [
    'chat',
    'world-building',
    'holoscript',    // NEW
    'vr-assistance', // NEW
  ];

  async generateHoloScript(description: string): Promise<string> {
    // Use AI to generate HoloScript from natural language
    const response = await this.llm.complete({
      prompt: `Generate HoloScript code for: ${description}`,
      system: 'You are an expert VR world builder...',
    });

    return response.text;
  }

  async buildWorld(userRequest: string): Promise<any> {
    // 1. Generate HoloScript
    const holoScript = await this.generateHoloScript(userRequest);

    // 2. Create preview world
    const world = await this.useMcpTool('hololand', 'create_world', {
      name: 'Preview - ' + userRequest,
      template: 'blank',
      privacy: 'private',
    });

    // 3. Execute script
    await this.useMcpTool('hololand', 'execute_holoscript', {
      worldId: world.worldId,
      code: holoScript,
    });

    return { world, holoScript };
  }
}
```

---

## Phase 4: Connect Frontend to Backend (1 hour)

### 4.1 Update Frontend API Client

**Create `examples/hololand-central/src/api/client.ts`:**

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API methods
export const api = {
  auth: {
    signup: (data: any) => apiClient.post('/auth/signup', data),
    login: (data: any) => apiClient.post('/auth/login', data),
    web3: (data: any) => apiClient.post('/auth/web3', data),
    me: () => apiClient.get('/auth/me'),
  },

  worlds: {
    list: (params?: any) => apiClient.get('/worlds', { params }),
    get: (id: string) => apiClient.get(`/worlds/${id}`),
    create: (data: any) => apiClient.post('/worlds', data),
    update: (id: string, data: any) => apiClient.put(`/worlds/${id}`, data),
    delete: (id: string) => apiClient.delete(`/worlds/${id}`),
  },

  ai: {
    chat: (data: any) => apiClient.post('/ai/chat', data),
    buildWorld: (data: any) => apiClient.post('/ai/build-world', data),
  },

  themes: {
    get: () => apiClient.get('/themes'),
    set: (data: any) => apiClient.post('/themes/set', data),
  },
};
```

### 4.2 Update Admin Panel to Use Real API

**Modify `examples/hololand-central/src/admin/AdminPanel.tsx`:**

```typescript
import { api } from '../api/client';

// In theme management section:
const handleThemeChange = async (themeName: string) => {
  try {
    await api.themes.set({ name: themeName });
    onThemeChange(themeName);
  } catch (error) {
    console.error('Failed to change theme:', error);
  }
};
```

### 4.3 Update Brittney Integration in Infinity Shop

**Modify `examples/hololand-central/src/worlds/InfinityShop.tsx`:**

```typescript
import { api } from '../api/client';

// Add AI chat functionality
const [chatOpen, setChatOpen] = useState(false);
const [chatMessage, setChatMessage] = useState('');

const handleChatWithBrittney = async () => {
  if (!chatMessage.trim()) return;

  try {
    const response = await api.ai.chat({
      message: chatMessage,
      agent: 'brittney',
      worldId: 'infinity-shop',
    });

    // Display response
    console.log('Brittney:', response.data);

    // If HoloScript was generated, offer to execute
    if (response.data.holoScript) {
      // Show preview or execute
    }
  } catch (error) {
    console.error('Chat error:', error);
  }
};
```

---

## Phase 5: Test End-to-End Flow (30 min)

### Test 1: Agent Creates World via MCP

**In uaa2-service:**

```typescript
// Test agent spawning world
const testAgent = new BuilderAgent();

const world = await testAgent.useMcpTool('hololand', 'create_world', {
  name: 'Test Agent Workspace',
  template: 'office',
  privacy: 'agent-only',
});

console.log('World created:', world);
// Should return: { worldId: '...', portalUrl: '...' }
```

### Test 2: Execute HoloScript from Agent

```typescript
const holoScript = `
  world {
    cube {
      position: [0, 1, 0]
      color: #ff0000
    }
  }
`;

const result = await testAgent.useMcpTool('hololand', 'execute_holoscript', {
  worldId: world.worldId,
  code: holoScript,
});

console.log('Execution result:', result);
```

### Test 3: Brittney AI Chat in VR

**In Hololand Central:**

1. Navigate to Infinity Shop
2. Click Brittney hologram 5 times
3. Admin panel appears (if wallet authorized)
4. Click "Ask Brittney" (once feature added)
5. Type: "Help me build a space station"
6. Brittney generates HoloScript
7. Preview appears in new world

### Test 4: Multi-Agent Collaboration

```typescript
// CEO agent creates meeting room
const ceo = new CEOAgent();
const meetingRoom = await ceo.useMcpTool('hololand', 'create_world', {
  name: 'Q1 Strategy Session',
  template: 'collaboration',
});

// Invite builder agent
await ceo.useMcpTool('hololand', 'invite_agent', {
  worldId: meetingRoom.worldId,
  agentId: builderAgent.id,
});

// Both agents can now interact in VR
```

---

## Phase 6: Deploy to Production (varies)

### 6.1 Hololand Backend

**Railway/Fly.io:**

```bash
# Build
npm run build

# Deploy
railway up
# or
fly deploy
```

**Environment variables to set:**
- DATABASE_URL (production PostgreSQL)
- REDIS_URL (production Redis)
- JWT_SECRET (strong secret)
- UAA2_API_URL (production uaa2 URL)
- CORS_ORIGINS (production domains)

### 6.2 uaa2-service with Hololand Extension

Deploy uaa2-service with MCP configuration pointing to production Hololand API.

### 6.3 Frontend (Hololand Central)

```bash
cd examples/hololand-central

# Build
npm run build

# Deploy to Vercel/Netlify
vercel --prod
```

---

## 🎯 Success Criteria

### ✅ Backend
- [ ] Server starts without errors
- [ ] Database migrations run successfully
- [ ] Health check endpoint returns 200
- [ ] Can create user via /auth/signup
- [ ] Can authenticate with JWT
- [ ] Can create world via /worlds

### ✅ MCP Integration
- [ ] MCP server starts in uaa2-service
- [ ] Agent can call create_world tool
- [ ] World is created in Hololand database
- [ ] Agent receives worldId back

### ✅ Frontend
- [ ] Can login with email/password
- [ ] Can login with Web3 wallet
- [ ] Admin panel appears for authorized wallets
- [ ] Theme changes work
- [ ] Worlds render in VR

### ✅ End-to-End
- [ ] Agent spawns VR world
- [ ] HoloScript executes successfully
- [ ] Brittney responds to chat in VR
- [ ] Multi-agent collaboration works
- [ ] Real-time updates via WebSocket

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check database connection
npm run docker:up
docker ps  # Verify postgres + redis running

# Check logs
npm run dev  # Look for specific errors
```

### MCP tools not available
```bash
# Verify MCP server is built
cd packages/mcp-server
npm run build
ls dist/  # Should see index.js

# Check uaa2 MCP config
# Ensure path to index.js is correct
```

### Frontend can't connect to backend
```bash
# Check CORS settings in backend .env
CORS_ORIGINS=http://localhost:5173

# Check frontend API URL
# examples/hololand-central/.env
VITE_API_URL=http://localhost:3001
```

### Database migration errors
```bash
# Reset database (⚠️ destroys data)
npm run migrate:reset

# Or manually fix
npm run db:studio  # Opens Prisma Studio
```

---

## 📚 Next Steps

### Immediate
1. Complete HoloScript parser implementation
2. Add file upload for world assets
3. Implement world thumbnail generation
4. Add WebSocket events for real-time updates

### Short-term
1. Payment system (Stripe)
2. World marketplace
3. Advanced analytics
4. Content moderation

### Long-term
1. Voice chat in VR
2. Mobile VR support
3. Cross-platform avatars
4. Developer API & SDK

---

## 🆘 Support

### Issues
- GitHub: https://github.com/brianonbased-dev/Hololand/issues

### Documentation
- Backend API: `/platform/backend/README.md`
- MCP Server: `/packages/mcp-server/README.md`
- Architecture: `/HYBRID_ARCHITECTURE.md`
- Backend Status: `/BACKEND_STATUS.md`

### Contact
- Email: [email protected]
- Discord: https://discord.gg/hololand

---

**🌌 Building the future of AI-native VR, one agent at a time.**
