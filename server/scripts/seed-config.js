/**
 * Seed Configuration Tables
 * מאכלס את טבלאות ההגדרה עם ערכי ברירת מחדל
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedConfig() {
  console.log('🌱 Seeding configuration tables...\n');

  // 1. Super Admin Emails
  console.log('📧 Seeding SuperAdminEmail...');
  await prisma.superAdminEmail.upsert({
    where: { email: 'a0504105090@gmail.com' },
    update: {},
    create: {
      email: 'a0504105090@gmail.com',
      note: 'Platform owner',
      isActive: true
    }
  });
  console.log('   ✓ Super admin emails configured');

  // 2. Permissions
  console.log('\n🔐 Seeding Permissions...');
  const permissions = [
    // Rocks
    { code: 'rocks:read', name: 'צפייה בסלעים', category: 'rocks' },
    { code: 'rocks:create', name: 'יצירת סלעים', category: 'rocks' },
    { code: 'rocks:update', name: 'עריכת סלעים', category: 'rocks' },
    { code: 'rocks:delete', name: 'מחיקת סלעים', category: 'rocks' },
    
    // Sprints
    { code: 'sprints:read', name: 'צפייה בספרינטים', category: 'sprints' },
    { code: 'sprints:create', name: 'יצירת ספרינטים', category: 'sprints' },
    { code: 'sprints:update', name: 'עריכת ספרינטים', category: 'sprints' },
    { code: 'sprints:delete', name: 'מחיקת ספרינטים', category: 'sprints' },
    
    // Stories
    { code: 'stories:read', name: 'צפייה באבני דרך', category: 'stories' },
    { code: 'stories:create', name: 'יצירת אבני דרך', category: 'stories' },
    { code: 'stories:update', name: 'עריכת אבני דרך', category: 'stories' },
    { code: 'stories:update-own', name: 'עריכת אבני דרך שלי', category: 'stories' },
    { code: 'stories:delete', name: 'מחיקת אבני דרך', category: 'stories' },
    
    // Team
    { code: 'team:read', name: 'צפייה בצוות', category: 'team' },
    { code: 'team:manage', name: 'ניהול צוות', category: 'team' },
    
    // Admin
    { code: 'admin:access', name: 'גישה לניהול מערכת', category: 'admin' },
    { code: 'admin:users', name: 'ניהול משתמשים', category: 'admin' },
    { code: 'admin:settings', name: 'ניהול הגדרות', category: 'admin' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, category: perm.category },
      create: perm
    });
  }
  console.log(`   ✓ ${permissions.length} permissions created`);

  // 3. Roles
  console.log('\n👤 Seeding Roles...');
  const roles = [
    { code: 'ADMIN', name: 'מנהל', description: 'גישה מלאה לכל הפעולות', hierarchy: 0, isSystem: true, color: '#EF4444' },
    { code: 'MANAGER', name: 'מנהל פרויקט', description: 'יצירה ועריכה של סלעים, ספרינטים ואבני דרך', hierarchy: 10, isSystem: true, color: '#F59E0B' },
    { code: 'MEMBER', name: 'חבר צוות', description: 'צפייה בהכל, עריכת אבני דרך משלו', hierarchy: 20, isSystem: true, color: '#10B981' },
    { code: 'VIEWER', name: 'צופה', description: 'צפייה בלבד', hierarchy: 30, isSystem: true, color: '#6B7280' },
  ];

  const createdRoles = {};
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, hierarchy: role.hierarchy, color: role.color },
      create: role
    });
    createdRoles[role.code] = created.id;
  }
  console.log(`   ✓ ${roles.length} roles created`);

  // 4. Role-Permission Mapping
  console.log('\n🔗 Seeding RolePermissions...');
  
  // Get all permissions
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = {};
  allPermissions.forEach(p => permissionMap[p.code] = p.id);

  // Define role permissions
  const rolePermissions = {
    ADMIN: Object.keys(permissionMap), // All permissions
    MANAGER: [
      'rocks:read', 'rocks:create', 'rocks:update', 'rocks:delete',
      'sprints:read', 'sprints:create', 'sprints:update', 'sprints:delete',
      'stories:read', 'stories:create', 'stories:update', 'stories:delete',
      'team:read', 'team:manage'
    ],
    MEMBER: [
      'rocks:read', 'sprints:read', 'stories:read', 'stories:create', 'stories:update-own', 'team:read'
    ],
    VIEWER: [
      'rocks:read', 'sprints:read', 'stories:read', 'team:read'
    ]
  };

  // Clear existing role permissions
  await prisma.rolePermission.deleteMany({});

  // Create new role permissions
  let rpCount = 0;
  for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
    for (const permCode of permCodes) {
      if (permissionMap[permCode] && createdRoles[roleCode]) {
        await prisma.rolePermission.create({
          data: {
            roleId: createdRoles[roleCode],
            permissionId: permissionMap[permCode]
          }
        });
        rpCount++;
      }
    }
  }
  console.log(`   ✓ ${rpCount} role-permission mappings created`);

  // 5. System Settings
  console.log('\n⚙️ Seeding SystemSettings...');
  const settings = [
    { key: 'default_sprint_duration_days', value: 14, description: 'Default sprint duration in days' },
    { key: 'default_quarter_start_month', value: 1, description: 'First month of Q1 (1-12)' },
    { key: 'allow_user_registration', value: false, description: 'Allow self-registration (vs whitelist only)' },
    { key: 'require_story_owner', value: false, description: 'Require owner for new stories' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting
    });
  }
  console.log(`   ✓ ${settings.length} system settings configured`);

  // 6. Feature Flags (global)
  console.log('\n🚩 Seeding FeatureFlags...');
  const flags = [
    { key: 'dark_mode', isEnabled: true, description: 'Enable dark mode toggle' },
    { key: 'ai_assistant', isEnabled: false, description: 'Enable AI assistant feature' },
    { key: 'export_pdf', isEnabled: false, description: 'Enable PDF export' },
    { key: 'notifications', isEnabled: false, description: 'Enable email notifications' },
  ];

  for (const flag of flags) {
    // Check if exists first (for global flags with null organizationId)
    const existing = await prisma.featureFlag.findFirst({
      where: { key: flag.key, organizationId: null }
    });
    
    if (existing) {
      await prisma.featureFlag.update({
        where: { id: existing.id },
        data: { isEnabled: flag.isEnabled, description: flag.description }
      });
    } else {
      await prisma.featureFlag.create({
        data: { ...flag, organizationId: null }
      });
    }
  }
  console.log(`   ✓ ${flags.length} feature flags configured`);

  console.log('\n✅ Configuration seeding complete!');
  
  await prisma.$disconnect();
}

seedConfig().catch(console.error);

