/**
 * Migration Script: TeamMember + OrganizationMember + AllowedEmail → Membership
 * 
 * This script:
 * 1. Creates Membership records from existing TeamMembers
 * 2. Links email from AllowedEmail where matching
 * 3. Links userId from User where email matches
 * 4. Links role from OrganizationMember or AllowedEmail
 * 5. Updates Rocks, Stories, Objectives, Tasks to point to new Membership
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting migration to Membership model...\n');
  
  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany();
    console.log(`Found ${organizations.length} organizations\n`);
    
    let totalMemberships = 0;
    let totalLinked = 0;
    
    for (const org of organizations) {
      console.log(`\n📁 Processing: ${org.name} (${org.id})`);
      console.log('='.repeat(50));
      
      // Get all TeamMembers in this org
      const teamMembers = await prisma.teamMember.findMany({
        where: { organizationId: org.id }
      });
      
      // Get all AllowedEmails in this org
      const allowedEmails = await prisma.allowedEmail.findMany({
        where: { organizationId: org.id }
      });
      
      // Get all OrganizationMembers in this org
      const orgMembers = await prisma.organizationMember.findMany({
        where: { organizationId: org.id },
        include: { user: true }
      });
      
      console.log(`   TeamMembers: ${teamMembers.length}`);
      console.log(`   AllowedEmails: ${allowedEmails.length}`);
      console.log(`   OrgMembers: ${orgMembers.length}`);
      
      // Build a map of email -> data
      const emailMap = new Map();
      
      // Start with AllowedEmails (they have email + role)
      for (const ae of allowedEmails) {
        emailMap.set(ae.email.toLowerCase(), {
          email: ae.email.toLowerCase(),
          name: ae.name || ae.email.split('@')[0],
          role: ae.role || 'VIEWER',
          userId: null,
          teamMemberId: null,
          jobTitle: null,
          capacity: null
        });
      }
      
      // Add/update from OrgMembers (they have userId + role)
      for (const om of orgMembers) {
        const email = om.user.email.toLowerCase();
        const existing = emailMap.get(email) || {};
        emailMap.set(email, {
          ...existing,
          email: email,
          name: om.user.name || existing.name || email.split('@')[0],
          role: om.role || existing.role || 'VIEWER',
          userId: om.userId,
          teamMemberId: existing.teamMemberId,
          jobTitle: existing.jobTitle,
          capacity: existing.capacity
        });
      }
      
      // Match TeamMembers by name to emails (fuzzy match)
      for (const tm of teamMembers) {
        // First, check if already linked via userId
        if (tm.userId) {
          const user = await prisma.user.findUnique({ where: { id: tm.userId } });
          if (user) {
            const email = user.email.toLowerCase();
            const existing = emailMap.get(email) || {};
            emailMap.set(email, {
              ...existing,
              email: email,
              name: tm.name || existing.name || user.name,
              role: existing.role || 'VIEWER',
              userId: tm.userId,
              teamMemberId: tm.id,
              jobTitle: tm.role, // TeamMember.role is job title
              capacity: tm.capacity
            });
            continue;
          }
        }
        
        // Try to find by name match in AllowedEmails
        let matched = false;
        for (const [email, data] of emailMap) {
          if (data.name && tm.name && 
              (data.name.includes(tm.name) || tm.name.includes(data.name) ||
               normalizeHebrew(data.name) === normalizeHebrew(tm.name))) {
            // Found a match!
            emailMap.set(email, {
              ...data,
              teamMemberId: tm.id,
              jobTitle: tm.role,
              capacity: tm.capacity
            });
            matched = true;
            console.log(`   ✓ Matched: "${tm.name}" → ${email}`);
            break;
          }
        }
        
        // If not matched, create a placeholder with generated email
        if (!matched) {
          const placeholderEmail = `${tm.id}@placeholder.local`;
          emailMap.set(placeholderEmail, {
            email: placeholderEmail,
            name: tm.name,
            role: 'VIEWER',
            userId: null,
            teamMemberId: tm.id,
            jobTitle: tm.role,
            capacity: tm.capacity,
            isPlaceholder: true
          });
          console.log(`   ⚠ No email for: "${tm.name}" - using placeholder`);
        }
      }
      
      // Create Membership records
      for (const [email, data] of emailMap) {
        try {
          // Check if membership already exists
          const existing = await prisma.membership.findFirst({
            where: { email: email, organizationId: org.id }
          });
          
          if (existing) {
            console.log(`   → Skipping existing: ${email}`);
            continue;
          }
          
          const membership = await prisma.membership.create({
            data: {
              email: email,
              name: data.name,
              role: data.role,
              userId: data.userId,
              organizationId: org.id,
              jobTitle: data.jobTitle,
              capacity: data.capacity,
              joinedAt: data.userId ? new Date() : null
            }
          });
          
          totalMemberships++;
          if (data.userId) totalLinked++;
          
          console.log(`   ✅ Created: ${data.name} <${email}> [${data.role}]${data.userId ? ' (linked)' : ''}`);
          
          // Update related records if we have teamMemberId
          if (data.teamMemberId) {
            // Update Objectives
            const objCount = await prisma.objective.updateMany({
              where: { ownerId: data.teamMemberId, organizationId: org.id },
              data: { membershipId: membership.id }
            });
            
            // Update Rocks
            const rockCount = await prisma.rock.updateMany({
              where: { ownerId: data.teamMemberId, organizationId: org.id },
              data: { membershipId: membership.id }
            });
            
            // Update Stories
            const storyCount = await prisma.story.updateMany({
              where: { ownerId: data.teamMemberId, organizationId: org.id },
              data: { membershipId: membership.id }
            });
            
            // Update Tasks (owner)
            const taskCount = await prisma.task.updateMany({
              where: { ownerId: data.teamMemberId, organizationId: org.id },
              data: { membershipId: membership.id }
            });
            
            // Update Tasks (creator)
            const taskCreatorCount = await prisma.task.updateMany({
              where: { createdById: data.teamMemberId, organizationId: org.id },
              data: { creatorMembershipId: membership.id }
            });
            
            if (objCount.count + rockCount.count + storyCount.count + taskCount.count > 0) {
              console.log(`      → Linked: ${objCount.count} objectives, ${rockCount.count} rocks, ${storyCount.count} stories, ${taskCount.count} tasks`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error creating membership for ${email}:`, err.message);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ Migration completed!');
    console.log(`   Total Memberships created: ${totalMemberships}`);
    console.log(`   Linked to Users: ${totalLinked}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to normalize Hebrew names for comparison
function normalizeHebrew(str) {
  if (!str) return '';
  return str
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Run migration
migrate().catch(console.error);

