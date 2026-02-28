/**
 * Holoverse Database Seed Script
 *
 * Creates initial data for development and testing:
 * - Test users
 * - Initial portal unlocks
 * - Sample quests
 * - Skill initialization
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // CREATE TEST USERS
  // ============================================================================

  console.log('👤 Creating test users...');

  // Test User 1: Email auth
  const testUser1 = await prisma.user.upsert({
    where: { email: 'test@holoverse.io' },
    update: {},
    create: {
      email: 'test@holoverse.io',
      passwordHash: await bcrypt.hash('password123', 10),
      isVerified: true,
      subscriptionTier: 'free',
      profile: {
        create: {
          username: 'testuser',
          displayName: 'Test User',
          bio: 'I am a test account for development',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser',
          preferences: {
            theme: 'dark',
            notifications: true,
          }
        }
      }
    },
    include: { profile: true }
  });
  console.log(`  ✅ Created: ${testUser1.profile?.username} (${testUser1.email})`);

  // Test User 2: Premium subscriber
  const testUser2 = await prisma.user.upsert({
    where: { email: 'premium@holoverse.io' },
    update: {},
    create: {
      email: 'premium@holoverse.io',
      passwordHash: await bcrypt.hash('password123', 10),
      isVerified: true,
      subscriptionTier: 'premium',
      profile: {
        create: {
          username: 'premiumuser',
          displayName: 'Premium User',
          bio: 'I support Holoverse! ✨',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=premiumuser',
          preferences: {
            theme: 'light',
            notifications: true,
          }
        }
      }
    },
    include: { profile: true }
  });
  console.log(`  ✅ Created: ${testUser2.profile?.username} (${testUser2.email})`);

  // Test User 3: Pro creator
  const testUser3 = await prisma.user.upsert({
    where: { email: 'creator@holoverse.io' },
    update: {},
    create: {
      email: 'creator@holoverse.io',
      passwordHash: await bcrypt.hash('password123', 10),
      isVerified: true,
      subscriptionTier: 'pro',
      profile: {
        create: {
          username: 'procreator',
          displayName: 'Pro Creator',
          bio: 'Building amazing worlds! 🌎',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=procreator',
          website: 'https://procreator.holoverse.io',
          preferences: {
            theme: 'dark',
            notifications: true,
          }
        }
      }
    },
    include: { profile: true }
  });
  console.log(`  ✅ Created: ${testUser3.profile?.username} (${testUser3.email})\n`);

  // ============================================================================
  // INITIALIZE SKILLS
  // ============================================================================

  console.log('⭐ Initializing skills...');

  const skills = ['courage', 'imagination', 'resilience', 'wisdom', 'knowledge'];
  const users = [testUser1, testUser2, testUser3];

  for (const user of users) {
    for (const skillName of skills) {
      await prisma.skillLevel.upsert({
        where: {
          user_id_skill_name: {
            userId: user.id,
            skillName,
          }
        },
        update: {},
        create: {
          userId: user.id,
          skillName,
          level: user.subscriptionTier === 'pro' ? 25 : 0,  // Give pro users head start
          experience: user.subscriptionTier === 'pro' ? 250 : 0,
        }
      });
    }
    console.log(`  ✅ Initialized skills for ${user.profile?.username}`);
  }
  console.log('');

  // ============================================================================
  // UNLOCK PORTALS
  // ============================================================================

  console.log('🚪 Unlocking portals...');

  // Free user: Adventure portal only
  await prisma.portalUnlock.upsert({
    where: {
      user_id_portal_id: {
        userId: testUser1.id,
        portalId: 'adventure',
      }
    },
    update: {},
    create: {
      userId: testUser1.id,
      portalId: 'adventure',
      unlockedBy: 'initial_grant',
    }
  });
  console.log(`  ✅ Unlocked Adventure portal for ${testUser1.profile?.username}`);

  // Premium user: Adventure + Fantasy
  for (const portalId of ['adventure', 'fantasy']) {
    await prisma.portalUnlock.upsert({
      where: {
        user_id_portal_id: {
          userId: testUser2.id,
          portalId,
        }
      },
      update: {},
      create: {
        userId: testUser2.id,
        portalId,
        unlockedBy: 'premium_subscription',
      }
    });
  }
  console.log(`  ✅ Unlocked Adventure + Fantasy for ${testUser2.profile?.username}`);

  // Pro user: All portals
  for (const portalId of ['adventure', 'fantasy', 'horror', 'history', 'science']) {
    await prisma.portalUnlock.upsert({
      where: {
        user_id_portal_id: {
          userId: testUser3.id,
          portalId,
        }
      },
      update: {},
      create: {
        userId: testUser3.id,
        portalId,
        unlockedBy: 'pro_subscription',
      }
    });
  }
  console.log(`  ✅ Unlocked all portals for ${testUser3.profile?.username}\n`);

  // ============================================================================
  // CREATE SAMPLE QUESTS
  // ============================================================================

  console.log('📋 Creating sample quests...');

  // Quest for premium user (active)
  await prisma.questProgress.upsert({
    where: {
      user_id_quest_id: {
        userId: testUser2.id,
        questId: 'treasure_island_intro',
      }
    },
    update: {},
    create: {
      userId: testUser2.id,
      questId: 'treasure_island_intro',
      status: 'active',
      progress: 50,
      currentStage: 2,
      timeSpentSeconds: 1200, // 20 minutes
      metadata: {
        title: 'Treasure Island: The Beginning',
        genre: 'adventure',
        difficulty: 'beginner',
      }
    }
  });
  console.log(`  ✅ Created active quest for ${testUser2.profile?.username}`);

  // Completed quest for pro user
  await prisma.questProgress.upsert({
    where: {
      user_id_quest_id: {
        userId: testUser3.id,
        questId: 'dragon_lair_mystery',
      }
    },
    update: {},
    create: {
      userId: testUser3.id,
      questId: 'dragon_lair_mystery',
      status: 'completed',
      progress: 100,
      currentStage: 5,
      startedAt: new Date('2026-02-01'),
      completedAt: new Date('2026-02-05'),
      timeSpentSeconds: 7200, // 2 hours
      rewards: {
        skills: { courage: 15, wisdom: 10 },
        badges: ['Dragon Slayer', 'Quest Master'],
        unlocks: ['fantasy_advanced'],
      },
      metadata: {
        title: 'The Dragon Lair Mystery',
        genre: 'fantasy',
        difficulty: 'intermediate',
      }
    }
  });
  console.log(`  ✅ Created completed quest for ${testUser3.profile?.username}\n`);

  // ============================================================================
  // AWARD BADGES
  // ============================================================================

  console.log('🏆 Awarding badges...');

  // Pro user badges
  const badges = [
    { name: 'Early Adopter', metadata: { rarity: 'legendary' } },
    { name: 'Dragon Slayer', metadata: { rarity: 'epic' } },
    { name: 'Quest Master', metadata: { rarity: 'rare' } },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: {
        user_id_badge_name: {
          userId: testUser3.id,
          badgeName: badge.name,
        }
      },
      update: {},
      create: {
        userId: testUser3.id,
        badgeName: badge.name,
        metadata: badge.metadata,
      }
    });
  }
  console.log(`  ✅ Awarded ${badges.length} badges to ${testUser3.profile?.username}\n`);

  // ============================================================================
  // CREATE NPC CONVERSATIONS
  // ============================================================================

  console.log('💬 Creating NPC conversations...');

  // Sample conversation with Captain Compass
  const conversationMessages = [
    { role: 'user', content: 'Hello! I\'m new here.' },
    { role: 'assistant', content: 'Ahoy, brave adventurer! Welcome to the Grand Hall! I\'m Captain Compass, your guide to the world of adventure. Fortune favors the bold!' },
    { role: 'user', content: 'What should I do first?' },
    { role: 'assistant', content: 'Start with the Adventure Portal! It\'s the perfect place for newcomers. You\'ll find treasures, mysteries, and exciting challenges. Are you ready to embark?' },
  ];

  for (const msg of conversationMessages) {
    await prisma.npcConversation.create({
      data: {
        userId: testUser1.id,
        npcId: 'adventure_guide',
        messageRole: msg.role,
        messageContent: msg.content,
        metadata: {
          companionName: 'Captain Compass',
        }
      }
    });
  }
  console.log(`  ✅ Created conversation history for ${testUser1.profile?.username}\n`);

  // ============================================================================
  // CREATE SAMPLE WORLD (by pro creator)
  // ============================================================================

  console.log('🌎 Creating sample world...');

  const sampleWorld = await prisma.userWorld.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      creatorId: testUser3.id,
      title: 'Mystic Forest Quest',
      description: 'Explore an enchanted forest filled with magical creatures and ancient secrets. Perfect for beginners!',
      holoscriptSource: `
// Mystic Forest Quest
composition "MysticForest" {
  environment {
    background: "#1a5f3e"
    fog: { type: "exponential", color: "#c8e6c9", density: 0.02 }
  }

  portal "EntrancePortal" @spatial @interactive {
    position: [0, 0, 0]
    geometry: { type: "cylinder", args: [2, 2, 0.5, 32] }
    material: { color: "#4caf50", emissive: "#4caf50", emissiveIntensity: 0.5 }
  }

  npc "ForestGuide" @interactive {
    position: [5, 0, 5]
    name: "Eldrin the Wise"
    dialogue: "Welcome, traveler! The forest has many secrets..."
  }

  quest "FindCrystal" {
    title: "The Lost Crystal"
    stages: 3
    rewards: { courage: 10, wisdom: 5 }
  }
}
      `.trim(),
      thumbnailUrl: 'https://picsum.photos/seed/mystic-forest/800/600',
      isPublished: true,
      isFeatured: true,
      priceCents: 99, // $0.99
      revenueSplit: 70,
      publishedAt: new Date('2026-02-10'),
      totalVisits: 127,
      totalRevenueCents: 4950, // $49.50 (50 purchases)
      tags: ['fantasy', 'beginner', 'forest', 'quest'],
      metadata: {
        estimatedPlayTime: 15,
        difficulty: 'easy',
        features: ['guided', 'story-driven', 'no-combat'],
      }
    }
  });
  console.log(`  ✅ Created world: "${sampleWorld.title}" by ${testUser3.profile?.username}\n`);

  // ============================================================================
  // CREATE SAMPLE TRANSACTION
  // ============================================================================

  console.log('💰 Creating sample transaction...');

  await prisma.worldTransaction.create({
    data: {
      worldId: sampleWorld.id,
      buyerId: testUser2.id,
      creatorId: testUser3.id,
      amountCents: 99,
      creatorShareCents: 69, // 70%
      platformShareCents: 30, // 30%
      paymentMethod: 'stripe',
      paymentId: 'pi_test_1234567890',
      metadata: {
        purchasedAt: new Date().toISOString(),
        bundleDiscount: false,
      }
    }
  });
  console.log(`  ✅ Created transaction: ${testUser2.profile?.username} → "${sampleWorld.title}"\n`);

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('✨ Seed complete!\n');
  console.log('📊 Database Summary:');
  console.log(`  - Users: ${(await prisma.user.count())} accounts`);
  console.log(`  - Skills: ${(await prisma.skillLevel.count())} skill entries`);
  console.log(`  - Portals: ${(await prisma.portalUnlock.count())} unlocks`);
  console.log(`  - Quests: ${(await prisma.questProgress.count())} quest progress entries`);
  console.log(`  - Badges: ${(await prisma.badge.count())} badges`);
  console.log(`  - Conversations: ${(await prisma.npcConversation.count())} messages`);
  console.log(`  - Worlds: ${(await prisma.userWorld.count())} created`);
  console.log(`  - Transactions: ${(await prisma.worldTransaction.count())} purchases\n`);

  console.log('🔐 Test Login Credentials:');
  console.log('  - Email: test@holoverse.io');
  console.log('  - Password: password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
