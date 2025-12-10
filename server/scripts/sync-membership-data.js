/**
 * Sync Membership Data Script
 * 
 * This script ensures all data is properly synchronized:
 * 1. Links Users to Memberships by email
 * 2. Copies ownerId (TeamMember) to membershipId (Membership) for all entities
 * 3. Reports any orphaned or unlinked data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncData() {
  console.log('🔄 Starting data synchronization...\n');
  
  try {
    // ==================== STEP 1: Link Users to Memberships ====================
    console.log('📌 STEP 1: Linking Users to Memberships by email...');
    console.log('='.repeat(50));
    
    const users = await prisma.user.findMany();
    let usersLinked = 0;
    
    for (const user of users) {
      const result = await prisma.membership.updateMany({
        where: {
          email: user.email.toLowerCase(),
          userId: null
        },
        data: {
          userId: user.id,
          joinedAt: new Date()
        }
      });
      
      if (result.count > 0) {
        console.log(`   ✅ Linked ${user.email} to ${result.count} membership(s)`);
        usersLinked += result.count;
      }
    }
    console.log(`   Total: ${usersLinked} new links created\n`);

    // ==================== STEP 2: Sync TeamMember → Membership for entities ====================
    console.log('📌 STEP 2: Syncing entity ownership (TeamMember → Membership)...');
    console.log('='.repeat(50));
    
    const organizations = await prisma.organization.findMany();
    
    for (const org of organizations) {
      console.log(`\n   📁 ${org.name}`);
      
      // Build TeamMember → Membership mapping
      const teamMembers = await prisma.teamMember.findMany({
        where: { organizationId: org.id }
      });
      
      const memberships = await prisma.membership.findMany({
        where: { organizationId: org.id }
      });
      
      // Create mapping by userId
      const tmToMembership = new Map();
      for (const tm of teamMembers) {
        if (tm.userId) {
          const membership = memberships.find(m => m.userId === tm.userId);
          if (membership) {
            tmToMembership.set(tm.id, membership.id);
          }
        }
      }
      
      // Also try to match by name
      for (const tm of teamMembers) {
        if (!tmToMembership.has(tm.id)) {
          const membership = memberships.find(m => 
            m.name && tm.name && 
            (m.name.includes(tm.name) || tm.name.includes(m.name))
          );
          if (membership) {
            tmToMembership.set(tm.id, membership.id);
          }
        }
      }
      
      console.log(`      Mapped ${tmToMembership.size} TeamMembers to Memberships`);
      
      // Update Objectives
      let objCount = 0;
      for (const [tmId, membershipId] of tmToMembership) {
        const result = await prisma.objective.updateMany({
          where: { 
            ownerId: tmId, 
            organizationId: org.id,
            membershipId: null 
          },
          data: { membershipId }
        });
        objCount += result.count;
      }
      if (objCount > 0) console.log(`      ✅ ${objCount} Objectives updated`);
      
      // Update Rocks
      let rockCount = 0;
      for (const [tmId, membershipId] of tmToMembership) {
        const result = await prisma.rock.updateMany({
          where: { 
            ownerId: tmId, 
            organizationId: org.id,
            membershipId: null 
          },
          data: { membershipId }
        });
        rockCount += result.count;
      }
      if (rockCount > 0) console.log(`      ✅ ${rockCount} Rocks updated`);
      
      // Update Stories
      let storyCount = 0;
      for (const [tmId, membershipId] of tmToMembership) {
        const result = await prisma.story.updateMany({
          where: { 
            ownerId: tmId, 
            organizationId: org.id,
            membershipId: null 
          },
          data: { membershipId }
        });
        storyCount += result.count;
      }
      if (storyCount > 0) console.log(`      ✅ ${storyCount} Stories updated`);
      
      // Update Tasks (owner)
      let taskCount = 0;
      for (const [tmId, membershipId] of tmToMembership) {
        const result = await prisma.task.updateMany({
          where: { 
            ownerId: tmId, 
            organizationId: org.id,
            membershipId: null 
          },
          data: { membershipId }
        });
        taskCount += result.count;
      }
      if (taskCount > 0) console.log(`      ✅ ${taskCount} Tasks updated`);
      
      // Update Tasks (creator)
      let creatorCount = 0;
      for (const [tmId, membershipId] of tmToMembership) {
        const result = await prisma.task.updateMany({
          where: { 
            createdById: tmId, 
            organizationId: org.id,
            creatorMembershipId: null 
          },
          data: { creatorMembershipId: membershipId }
        });
        creatorCount += result.count;
      }
      if (creatorCount > 0) console.log(`      ✅ ${creatorCount} Task creators updated`);
    }

    // ==================== STEP 3: Report status ====================
    console.log('\n📌 STEP 3: Final Status Report');
    console.log('='.repeat(50));
    
    const totalMemberships = await prisma.membership.count();
    const linkedMemberships = await prisma.membership.count({ where: { userId: { not: null } } });
    const unlinkedMemberships = await prisma.membership.count({ where: { userId: null } });
    
    const totalObjectives = await prisma.objective.count();
    const objectivesWithMembership = await prisma.objective.count({ where: { membershipId: { not: null } } });
    
    const totalRocks = await prisma.rock.count();
    const rocksWithMembership = await prisma.rock.count({ where: { membershipId: { not: null } } });
    
    const totalStories = await prisma.story.count();
    const storiesWithMembership = await prisma.story.count({ where: { membershipId: { not: null } } });
    
    const totalTasks = await prisma.task.count();
    const tasksWithMembership = await prisma.task.count({ where: { membershipId: { not: null } } });
    
    console.log(`
   📊 Memberships:
      Total: ${totalMemberships}
      Linked to Users: ${linkedMemberships}
      Unlinked (pending): ${unlinkedMemberships}
   
   📊 Entities with membershipId:
      Objectives: ${objectivesWithMembership}/${totalObjectives}
      Rocks: ${rocksWithMembership}/${totalRocks}
      Stories: ${storiesWithMembership}/${totalStories}
      Tasks: ${tasksWithMembership}/${totalTasks}
    `);
    
    // List unlinked memberships
    if (unlinkedMemberships > 0) {
      console.log('   ⚠️ Unlinked Memberships (user not yet logged in):');
      const unlinked = await prisma.membership.findMany({
        where: { userId: null },
        select: { email: true, name: true, organization: { select: { name: true } } }
      });
      unlinked.forEach(m => {
        console.log(`      - ${m.name} <${m.email}> [${m.organization?.name}]`);
      });
    }
    
    console.log('\n✨ Synchronization completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
syncData().catch(console.error);

