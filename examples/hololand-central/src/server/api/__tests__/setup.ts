/**
 * Test Setup
 *
 * Global test configuration and utilities
 */

import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client for tests
export const testPrisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test',
    },
  },
});

beforeAll(async () => {
  console.log('[Test Setup] Connecting to test database...');

  try {
    await testPrisma.$connect();
    console.log('[Test Setup] Database connected successfully');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to database:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('[Test Setup] Disconnecting from test database...');
  await testPrisma.$disconnect();
});

// Helper: Create test user
export async function createTestUser(data: {
  email: string;
  username: string;
}) {
  return await testPrisma.user.create({
    data: {
      email: data.email,
      passwordHash: 'test-hash',
      profile: {
        create: {
          username: data.username,
        },
      },
    },
  });
}

// Helper: Clean up test data
export async function cleanupTestData(userId: string) {
  await testPrisma.questProgress.deleteMany({ where: { userId } });
  await testPrisma.skillLevel.deleteMany({ where: { userId } });
  await testPrisma.badge.deleteMany({ where: { userId } });
  await testPrisma.portalUnlock.deleteMany({ where: { userId } });
  await testPrisma.aIMessage.deleteMany({
    where: { conversation: { userId } },
  });
  await testPrisma.aIConversation.deleteMany({ where: { userId } });
  await testPrisma.world.deleteMany({ where: { creatorId: userId } });
  await testPrisma.userProfile.deleteMany({ where: { userId } });
  await testPrisma.userSession.deleteMany({ where: { userId } });
  await testPrisma.user.delete({ where: { id: userId } });
}
