/**
 * Template Seed Script
 *
 * Seeds the 10 Hero Templates into the database
 * Run with: pnpm tsx prisma/seedTemplates.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Template metadata
const HERO_TEMPLATES = [
  {
    id: 'modern-office',
    name: 'Modern Office',
    description: 'A professional workspace with desk, monitors, and ambient lighting. Perfect for productivity demos or virtual offices.',
    category: 'professional',
    tags: ['office', 'workspace', 'professional', 'productivity'],
    difficulty: 'beginner',
    estimatedPlayTime: 5,
  },
  {
    id: 'art-gallery',
    name: 'Art Gallery',
    description: 'A minimalist gallery space with white walls and spotlit paintings. Ideal for showcasing digital art or exhibitions.',
    category: 'entertainment',
    tags: ['art', 'gallery', 'museum', 'minimalist'],
    difficulty: 'beginner',
    estimatedPlayTime: 10,
  },
  {
    id: 'meditation-garden',
    name: 'Meditation Garden',
    description: 'A peaceful zen garden with water features and natural elements. Great for relaxation and mindfulness experiences.',
    category: 'nature',
    tags: ['zen', 'meditation', 'peaceful', 'garden', 'nature'],
    difficulty: 'beginner',
    estimatedPlayTime: 15,
  },
  {
    id: 'cyberpunk-alley',
    name: 'Cyberpunk Alley',
    description: 'A neon-lit futuristic alleyway with holographic signs. Perfect for sci-fi narratives and urban exploration.',
    category: 'scifi',
    tags: ['cyberpunk', 'neon', 'futuristic', 'urban', 'night'],
    difficulty: 'intermediate',
    estimatedPlayTime: 10,
  },
  {
    id: 'space-station',
    name: 'Space Station',
    description: 'A futuristic station interior with viewports and control panels. Ideal for sci-fi adventures and space exploration.',
    category: 'scifi',
    tags: ['space', 'station', 'scifi', 'futuristic', 'spaceship'],
    difficulty: 'intermediate',
    estimatedPlayTime: 15,
  },
  {
    id: 'forest',
    name: 'Enchanted Forest',
    description: 'A peaceful woodland scene with trees, rocks, mushrooms, and atmospheric fog. Great for nature walks and RPG quests.',
    category: 'nature',
    tags: ['forest', 'nature', 'trees', 'peaceful', 'outdoors'],
    difficulty: 'beginner',
    estimatedPlayTime: 20,
  },
  {
    id: 'boss-arena',
    name: 'Boss Arena',
    description: 'An epic circular battle arena with dramatic lighting and lava. Perfect for combat games and boss battles.',
    category: 'gaming',
    tags: ['arena', 'combat', 'battle', 'boss', 'lava', 'dramatic'],
    difficulty: 'advanced',
    estimatedPlayTime: 15,
  },
  {
    id: 'dashboard',
    name: 'Data Dashboard',
    description: 'A data visualization space with floating screens and analytics displays. Ideal for presenting metrics and insights.',
    category: 'professional',
    tags: ['dashboard', 'data', 'analytics', 'visualization', 'tech'],
    difficulty: 'intermediate',
    estimatedPlayTime: 10,
  },
  {
    id: 'meeting-room',
    name: 'Meeting Room',
    description: 'A professional conference room with table, chairs, and presentation screen. Perfect for virtual meetings and presentations.',
    category: 'professional',
    tags: ['meeting', 'conference', 'presentation', 'business', 'professional'],
    difficulty: 'beginner',
    estimatedPlayTime: 5,
  },
  {
    id: 'beach',
    name: 'Tropical Beach',
    description: 'A relaxing beach with ocean, sand, and palm trees. Great for vacation experiences and relaxation.',
    category: 'nature',
    tags: ['beach', 'tropical', 'ocean', 'relaxing', 'vacation', 'summer'],
    difficulty: 'beginner',
    estimatedPlayTime: 20,
  },
];

async function main() {
  console.log('🎨 Seeding Hero Templates...\n');

  // Create system user for templates (if doesn't exist)
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@holoverse.io' },
    update: {},
    create: {
      email: 'system@holoverse.io',
      passwordHash: 'SYSTEM_ACCOUNT_NO_LOGIN',
      isVerified: true,
      subscriptionTier: 'admin',
      profile: {
        create: {
          username: 'system',
          displayName: 'Hololand Templates',
          bio: 'Official Holoverse template library',
          avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=holoverse',
        }
      }
    },
    include: { profile: true }
  });

  console.log(`✅ System user ready: ${systemUser.profile?.username}\n`);

  // Seed each template
  let templateCount = 0;
  const templatesPath = path.join(__dirname, '..', 'templates');

  for (const template of HERO_TEMPLATES) {
    try {
      // Read the .holo file
      const holoFilePath = path.join(templatesPath, `${template.id}.holo`);
      const holoScript = fs.readFileSync(holoFilePath, 'utf-8');

      // Check if template already exists (by matching metadata.templateId)
      const existing = await prisma.userWorld.findFirst({
        where: {
          creatorId: systemUser.id,
          metadata: {
            path: ['templateId'],
            equals: template.id
          }
        }
      });

      let world;
      if (existing) {
        // Update existing template
        world = await prisma.userWorld.update({
          where: { id: existing.id },
          data: {
            title: template.name,
            description: template.description,
            holoscriptSource: holoScript,
            tags: template.tags,
            isPublished: true,
            isFeatured: true,
            publishedAt: new Date(),
            metadata: {
              templateId: template.id,
              category: template.category,
              difficulty: template.difficulty,
              estimatedPlayTime: template.estimatedPlayTime,
              isTemplate: true,
              templateVersion: '1.0',
            }
          }
        });
      } else {
        // Create new template
        world = await prisma.userWorld.create({
          data: {
            creatorId: systemUser.id,
            title: template.name,
            description: template.description,
            holoscriptSource: holoScript,
            thumbnailUrl: `https://picsum.photos/seed/${template.id}/800/600`,
            isPublished: true,
            isFeatured: true,
            publishedAt: new Date(),
            tags: template.tags,
            metadata: {
              templateId: template.id,
              category: template.category,
              difficulty: template.difficulty,
              estimatedPlayTime: template.estimatedPlayTime,
              isTemplate: true,
              templateVersion: '1.0',
            }
          }
        });
      }

      templateCount++;
      console.log(`  ✅ [${templateCount}/10] ${template.name} (${template.category})`);

    } catch (error) {
      console.error(`  ❌ Failed to seed ${template.name}:`, error);
    }
  }

  console.log(`\n✨ Successfully seeded ${templateCount}/10 hero templates!\n`);

  // Print summary
  const totalWorlds = await prisma.userWorld.count();
  const templateWorlds = await prisma.userWorld.count({
    where: {
      creatorId: systemUser.id
    }
  });

  console.log('📊 Database Summary:');
  console.log(`  - Total Worlds: ${totalWorlds}`);
  console.log(`  - Templates: ${templateWorlds}`);
  console.log(`  - Featured: ${await prisma.userWorld.count({ where: { isFeatured: true } })}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Template seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
