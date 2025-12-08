/**
 * Script to set a user as Super Admin
 * Usage: node scripts/set-super-admin.js <email>
 * Example: node scripts/set-super-admin.js a0504105090@gmail.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setSuperAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ נא לספק כתובת אימייל');
    console.log('שימוש: node scripts/set-super-admin.js <email>');
    console.log('דוגמה: node scripts/set-super-admin.js a0504105090@gmail.com');
    process.exit(1);
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user
      const user = await prisma.user.update({
        where: { email },
        data: { isSuperAdmin: true }
      });
      
      console.log('✅ המשתמש עודכן ל-Super Admin:');
      console.log(`   שם: ${user.name}`);
      console.log(`   אימייל: ${user.email}`);
      console.log(`   isSuperAdmin: ${user.isSuperAdmin}`);
    } else {
      // Create allowed email for future registration
      console.log(`⚠️  המשתמש ${email} עדיין לא נרשם למערכת`);
      console.log('   כשהוא יירשם, יצטרך להפעיל את הסקריפט שוב');
      console.log('');
      console.log('   לחילופין, ניתן להוסיף את האימייל לרשימת המורשים:');
      
      // Add to global allowed emails (no organization)
      await prisma.allowedEmail.upsert({
        where: {
          organizationId_email: { 
            organizationId: '', 
            email 
          }
        },
        update: { role: 'ADMIN' },
        create: {
          email,
          role: 'ADMIN',
          name: 'Super Admin',
          note: 'Platform Super Admin'
        }
      });
      
      console.log(`   ✅ האימייל ${email} נוסף לרשימת המורשים`);
    }
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    
    // If the upsert failed, try without the unique constraint
    if (error.code === 'P2002') {
      try {
        await prisma.allowedEmail.create({
          data: {
            email,
            role: 'ADMIN',
            name: 'Super Admin',
            note: 'Platform Super Admin',
            organizationId: null
          }
        });
        console.log(`   ✅ האימייל ${email} נוסף לרשימת המורשים`);
      } catch (e) {
        console.log('   האימייל כבר קיים ברשימה');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

setSuperAdmin();

