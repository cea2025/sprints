const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Super Admin emails - these get automatic SA status
const SUPER_ADMIN_EMAILS = [
  'a0504105090@gmail.com'
];

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { teamMember: true }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy - only configure if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();
        const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email);
        
        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id }
        });

        if (user) {
          // User exists - check if still active
          if (!user.isActive) {
            return done(null, false, { message: 'account_disabled' });
          }
          
          // Update user info (and potentially upgrade to super admin)
          const updateData = {
            name: profile.displayName,
            picture: profile.photos?.[0]?.value
          };
          
          // Auto-upgrade to Super Admin if in the list
          if (isSuperAdminEmail && !user.isSuperAdmin) {
            updateData.isSuperAdmin = true;
            console.log(`🛡️ Auto-upgrading ${email} to Super Admin`);
          }
          
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData
          });
          
          return done(null, user);
        }
        
        // New user - check allowed emails
        // First check for any allowed email entries for this user
        const allowedEmails = await prisma.allowedEmail.findMany({
          where: { email: email }
        });

        // Super admin can always register
        if (allowedEmails.length === 0 && !isSuperAdminEmail) {
          console.log(`❌ Login rejected: ${email} not in allowed list`);
          return done(null, false, { message: 'unauthorized' });
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            googleId: profile.id,
            email: email,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            role: 'VIEWER', // Legacy field
            isSuperAdmin: isSuperAdminEmail
          }
        });

        console.log(`✅ New user created: ${email}${isSuperAdminEmail ? ' (Super Admin)' : ''}`);

        // Add user to organizations based on AllowedEmail entries
        for (const allowedEmail of allowedEmails) {
          if (allowedEmail.organizationId) {
            try {
              await prisma.organizationMember.create({
                data: {
                  userId: user.id,
                  organizationId: allowedEmail.organizationId,
                  role: allowedEmail.role || 'VIEWER'
                }
              });
              console.log(`   ➕ Added to organization ${allowedEmail.organizationId} as ${allowedEmail.role || 'VIEWER'}`);
            } catch (e) {
              // Ignore if already member
              console.log(`   ℹ️ Already member of organization ${allowedEmail.organizationId}`);
            }
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('Passport error:', error);
        return done(error, null);
      }
    }
  ));
  console.log('✅ Google OAuth configured');
} else {
  console.log('⚠️ Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

module.exports = passport;
