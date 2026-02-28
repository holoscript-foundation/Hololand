/**
 * API Integration Tests
 *
 * Tests the complete tRPC API layer end-to-end:
 * - Authentication flows
 * - Quest management
 * - User profile operations
 * - Portal unlocks
 * - Companion conversations
 * - Creator world management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { appRouter } from '../root';
import { createContext } from '../trpc';
import type { Context } from '../trpc';

// ============================================================================
// TEST SETUP
// ============================================================================

const prisma = new PrismaClient();

// Helper to create test context
async function createTestContext(userId?: string): Promise<Context> {
  const req = {
    headers: {
      authorization: userId ? `Bearer test-token-${userId}` : '',
    },
  };

  return createContext({ req });
}

// Test user data
const testUser = {
  email: 'test@holoverse.io',
  username: 'testuser',
  password: 'TestPassword123!',
};

let testUserId: string;
let testSessionToken: string;

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

beforeAll(async () => {
  // Clean up test data
  await prisma.user.deleteMany({
    where: { email: testUser.email },
  });

  console.log('[Tests] Database cleaned');
});

afterAll(async () => {
  // Clean up after tests
  await prisma.user.deleteMany({
    where: { email: testUser.email },
  });

  await prisma.$disconnect();
  console.log('[Tests] Database disconnected');
});

// ============================================================================
// AUTH ROUTER TESTS
// ============================================================================

describe('Auth Router', () => {
  describe('signUp', () => {
    it('should create a new user account', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.signUp({
        email: testUser.email,
        username: testUser.username,
        password: testUser.password,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.user.email).toBe(testUser.email);
      expect(result.session).toHaveProperty('token');

      testUserId = result.user.id;
      testSessionToken = result.session.token;
    });

    it('should reject duplicate email', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.signUp({
          email: testUser.email,
          username: 'anotheruser',
          password: testUser.password,
        })
      ).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    it('should authenticate with correct credentials', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.signIn({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.user.email).toBe(testUser.email);
    });

    it('should reject invalid credentials', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.signIn({
          email: testUser.email,
          password: 'WrongPassword!',
        })
      ).rejects.toThrow();
    });
  });

  describe('getSession', () => {
    it('should return current user when authenticated', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.getSession();

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testUserId);
    });

    it('should return null when not authenticated', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.getSession();

      expect(result).toBeNull();
    });
  });

  describe('checkEmail', () => {
    it('should return available=false for existing email', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.checkEmail({
        email: testUser.email,
      });

      expect(result.available).toBe(false);
    });

    it('should return available=true for new email', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.checkEmail({
        email: 'newemail@holoverse.io',
      });

      expect(result.available).toBe(true);
    });
  });
});

// ============================================================================
// QUEST ROUTER TESTS
// ============================================================================

describe('Quest Router', () => {
  let testQuestId: string;

  describe('start', () => {
    it('should start a new quest', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quest.start({
        questId: 'test-quest-1',
        metadata: { genre: 'adventure' },
      });

      expect(result.questId).toBe('test-quest-1');
      expect(result.status).toBe('active');
      expect(result.progress).toBe(0);

      testQuestId = result.id;
    });

    it('should require authentication', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.quest.start({ questId: 'test-quest-1' })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('updateProgress', () => {
    it('should update quest progress', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quest.updateProgress({
        questId: 'test-quest-1',
        progress: 50,
        currentStage: 2,
      });

      expect(result.progress).toBe(50);
      expect(result.currentStage).toBe(2);
    });
  });

  describe('complete', () => {
    it('should complete quest with rewards', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quest.complete({
        questId: 'test-quest-1',
        rewards: {
          skills: { courage: 10, wisdom: 5 },
          badges: ['test-badge'],
          unlocks: ['fantasy-portal'],
        },
      });

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.completedAt).not.toBeNull();

      // Verify skills were awarded
      const skills = await caller.user.getSkills();
      const courageSkill = skills.find((s) => s.skillName === 'courage');
      expect(courageSkill?.level).toBe(10);

      // Verify badges were awarded
      const badges = await caller.user.getBadges();
      expect(badges.some((b) => b.badgeName === 'test-badge')).toBe(true);

      // Verify portal was unlocked
      const portalCheck = await caller.portal.isUnlocked({
        portalId: 'fantasy-portal',
      });
      expect(portalCheck.unlocked).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return all quests for user', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quest.getAll();

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((q) => q.questId === 'test-quest-1')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return quest statistics', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quest.getStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('active');
      expect(result.completed).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// USER ROUTER TESTS
// ============================================================================

describe('User Router', () => {
  describe('getProfile', () => {
    it('should return full user profile', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.getProfile();

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testUserId);
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('skillLevels');
      expect(result).toHaveProperty('badges');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.updateProfile({
        displayName: 'Test Hero',
        bio: 'Brave adventurer',
      });

      expect(result.displayName).toBe('Test Hero');
      expect(result.bio).toBe('Brave adventurer');
    });
  });

  describe('getSkills', () => {
    it('should return all skill levels', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.getSkills();

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((s) => s.skillName === 'courage')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive user stats', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.user.getStats();

      expect(result).toHaveProperty('totalSkills');
      expect(result).toHaveProperty('totalBadges');
      expect(result).toHaveProperty('totalPortals');
      expect(result).toHaveProperty('totalQuests');
    });
  });
});

// ============================================================================
// PORTAL ROUTER TESTS
// ============================================================================

describe('Portal Router', () => {
  describe('getUnlocked', () => {
    it('should return unlocked portals', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portal.getUnlocked();

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((p) => p.portalId === 'fantasy-portal')).toBe(true);
    });
  });

  describe('unlock', () => {
    it('should manually unlock a portal', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portal.unlock({
        portalId: 'science-portal',
        unlockedBy: 'test-purchase',
      });

      expect(result.portalId).toBe('science-portal');
      expect(result.unlockedBy).toBe('test-purchase');
    });

    it('should not duplicate unlocks', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      // Try to unlock again
      const result = await caller.portal.unlock({
        portalId: 'science-portal',
      });

      // Should return existing unlock
      expect(result.portalId).toBe('science-portal');
    });
  });

  describe('recordVisit', () => {
    it('should track portal visits', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portal.recordVisit({
        portalId: 'fantasy-portal',
        duration: 120,
      });

      expect(result.visitCount).toBeGreaterThan(0);
      expect(result.lastVisited).not.toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all available portals', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portal.getAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// COMPANION ROUTER TESTS
// ============================================================================

describe('Companion Router', () => {
  let conversationId: string;

  describe('startConversation', () => {
    it('should start new conversation', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.companion.startConversation({
        companionId: 'captain-compass',
        context: 'First meeting',
      });

      expect(result.companionId).toBe('captain-compass');
      expect(result.context).toBe('First meeting');

      conversationId = result.id;
    });
  });

  describe('sendMessage', () => {
    it('should send user message', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.companion.sendMessage({
        conversationId,
        content: 'Hello, Captain!',
      });

      expect(result.role).toBe('user');
      expect(result.content).toBe('Hello, Captain!');
    });
  });

  describe('saveResponse', () => {
    it('should save companion response', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.companion.saveResponse({
        conversationId,
        content: 'Ahoy, brave adventurer!',
      });

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Ahoy, brave adventurer!');
    });
  });

  describe('getMessages', () => {
    it('should retrieve conversation messages', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.companion.getMessages({
        conversationId,
      });

      expect(result.length).toBe(2); // user + assistant
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });
  });

  describe('getCompanions', () => {
    it('should return all available companions', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.companion.getCompanions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((c) => c.id === 'captain-compass')).toBe(true);
    });
  });
});

// ============================================================================
// CREATOR ROUTER TESTS
// ============================================================================

describe('Creator Router', () => {
  let worldId: string;

  describe('createWorld', () => {
    it('should create new world', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creator.createWorld({
        name: 'Test Island',
        description: 'A beautiful test island',
        holoScriptSource: 'cube #test { color: "blue" }',
        isPublic: false,
        tags: ['test', 'demo'],
      });

      expect(result.name).toBe('Test Island');
      expect(result.creatorId).toBe(testUserId);
      expect(result.isPublic).toBe(false);

      worldId = result.id;
    });
  });

  describe('getMyWorlds', () => {
    it('should return creator worlds', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creator.getMyWorlds();

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((w) => w.id === worldId)).toBe(true);
    });
  });

  describe('updateWorld', () => {
    it('should update world', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creator.updateWorld({
        worldId,
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });
  });

  describe('publishWorld', () => {
    it('should publish world to marketplace', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creator.publishWorld({
        worldId,
        price: 0,
        licenseType: 'free',
      });

      expect(result.isPublic).toBe(true);
      expect(result.publishedAt).not.toBeNull();
    });
  });

  describe('browseWorlds', () => {
    it('should browse public worlds', async () => {
      const ctx = await createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creator.browseWorlds({
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((w) => w.id === worldId)).toBe(true);
    });
  });

  describe('getCreatorStats', () => {
    it('should return creator analytics', async () => {
      const ctx = await createTestContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creator.getCreatorStats();

      expect(result).toHaveProperty('totalWorlds');
      expect(result).toHaveProperty('publishedWorlds');
      expect(result).toHaveProperty('totalViews');
      expect(result.totalWorlds).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// END-TO-END WORKFLOW TESTS
// ============================================================================

describe('End-to-End Workflows', () => {
  it('should complete full quest workflow', async () => {
    const ctx = await createTestContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // 1. Start quest
    const quest = await caller.quest.start({ questId: 'e2e-test-quest' });
    expect(quest.status).toBe('active');

    // 2. Update progress
    await caller.quest.updateProgress({
      questId: 'e2e-test-quest',
      progress: 75,
    });

    // 3. Complete with rewards
    const completed = await caller.quest.complete({
      questId: 'e2e-test-quest',
      rewards: {
        skills: { imagination: 15 },
        badges: ['e2e-hero'],
        unlocks: ['history-portal'],
      },
    });

    expect(completed.status).toBe('completed');

    // 4. Verify rewards applied
    const stats = await caller.user.getStats();
    expect(stats.totalBadges).toBeGreaterThan(0);

    const portals = await caller.portal.getUnlocked();
    expect(portals.some((p) => p.portalId === 'history-portal')).toBe(true);
  });
});
