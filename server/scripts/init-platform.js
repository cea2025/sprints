/**
 * Platform Initialization Script
 * Runs on deployment to ensure critical setup is complete:
 * 1. Set Super Admin for platform owner
 * 2. Create default organization if none exists
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Platform super admin emails - add your email here
const SUPER_ADMIN_EMAILS = [
  'a0504105090@gmail.com'
];

async function initPlatform() {
  console.log('🚀 Initializing platform...');

  try {
    // 1. Set Super Admin users
    console.log('\n📌 Setting Super Admin users...');
    for (const email of SUPER_ADMIN_EMAILS) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        if (!user.isSuperAdmin) {
          await prisma.user.update({
            where: { email },
            data: { isSuperAdmin: true }
          });
          console.log(`   ✅ ${email} - upgraded to Super Admin`);
        } else {
          console.log(`   ✓ ${email} - already Super Admin`);
        }
      } else {
        console.log(`   ⚠️ ${email} - not registered yet (will be set when they login)`);
        
        // Add to allowed emails to ensure they can register
        try {
          await prisma.allowedEmail.upsert({
            where: {
              organizationId_email: { 
                organizationId: null, 
                email 
              }
            },
            update: { role: 'ADMIN' },
            create: {
              email,
              role: 'ADMIN',
              name: 'Super Admin',
              note: 'Platform Super Admin - auto-created'
            }
          });
        } catch (e) {
          // Ignore if unique constraint fails
        }
      }
    }

    // 2. Check for existing organizations
    console.log('\n📊 Platform Statistics:');
    const [orgCount, userCount, rockCount, storyCount] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.rock.count(),
      prisma.story.count()
    ]);

    console.log(`   Organizations: ${orgCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Rocks: ${rockCount}`);
    console.log(`   Stories: ${storyCount}`);

    console.log('\n✅ Platform initialization complete!');
  } catch (error) {
    console.error('❌ Error during platform initialization:', error);
    // Don't exit with error - let the server start anyway
  } finally {
    await prisma.$disconnect();
  }
}

initPlatform();

