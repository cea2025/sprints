const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addUserToOrg() {
  const userEmail = 'a0504105090@gmail.com';
  const orgSlug = 'mashim';
  
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  
  if (!user) {
    console.log('❌ User not found:', userEmail);
    return;
  }
  
  if (!org) {
    console.log('❌ Organization not found:', orgSlug);
    return;
  }
  
  console.log('👤 User:', user.name, `(${user.id})`);
  console.log('🏢 Org:', org.name, `(${org.id})`);
  
  // Check if already a member
  const existing = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } }
  });
  
  if (existing) {
    console.log('✓ Already a member with role:', existing.role);
  } else {
    await prisma.organizationMember.create({
      data: { 
        userId: user.id, 
        organizationId: org.id, 
        role: 'ADMIN' 
      }
    });
    console.log('✅ Added as ADMIN');
  }
  
  await prisma.$disconnect();
}

addUserToOrg().catch(console.error);

