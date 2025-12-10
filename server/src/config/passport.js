const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Cache for super admin emails (refreshed periodically)
let superAdminEmailsCache = [];
let cacheLastUpdated = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get super admin emails from database (with caching)
 */
async function getSuperAdminEmails() {
  const now = Date.now();
  if (now - cacheLastUpdated < CACHE_TTL && superAdminEmailsCache.length > 0) {
    return superAdminEmailsCache;
  }
  
  try {
    const admins = await prisma.superAdminEmail.findMany({
      where: { isActive: true },
      select: { email: true }
    });
    superAdminEmailsCache = admins.map(a => a.email.toLowerCase());
    cacheLastUpdated = now;
  } catch (error) {
    // Table might not exist yet - use fallback
    console.log('SuperAdminEmail table not ready, using fallback');
    superAdminEmailsCache = ['a0504105090@gmail.com'];
  }
  
  return superAdminEmailsCache;
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session - now includes memberships
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { 
        memberships: true,  // NEW: Use memberships
        teamMembers: true   // LEGACY: Keep for backwards compatibility
      }
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
        const superAdminEmails = await getSuperAdminEmails();
        const isSuperAdminEmail = superAdminEmails.includes(email);
        
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
          
          // AUTO-LINK: Link user to any unlinked Memberships with matching email
          await autoLinkMemberships(user.id, email);
          
          return done(null, user);
        }
        
        // ==================== NEW USER ====================
        
        // Check if there's a Membership for this email (NEW way)
        const memberships = await prisma.membership.findMany({
          where: { email: email }
        });
        
        // Also check legacy AllowedEmail (for backwards compatibility)
        const allowedEmails = await prisma.allowedEmail.findMany({
          where: { email: email }
        });

        // Super admin can always register
        if (memberships.length === 0 && allowedEmails.length === 0 && !isSuperAdminEmail) {
          console.log(`❌ Login rejected: ${email} not in any organization`);
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

        // AUTO-LINK: Link user to all Memberships with matching email
        const linkedCount = await autoLinkMemberships(user.id, email);
        if (linkedCount > 0) {
          console.log(`   🔗 Auto-linked to ${linkedCount} memberships`);
        }

        // LEGACY: Add user to organizations based on AllowedEmail entries
        for (const allowedEmail of allowedEmails) {
          if (allowedEmail.organizationId) {
            try {
              await prisma.organizationMember.upsert({
                where: {
                  userId_organizationId: {
                    userId: user.id,
                    organizationId: allowedEmail.organizationId
                  }
                },
                create: {
                  userId: user.id,
                  organizationId: allowedEmail.organizationId,
                  role: allowedEmail.role || 'VIEWER'
                },
                update: {} // Don't update if exists
              });
              console.log(`   ➕ Added to organization ${allowedEmail.organizationId} (legacy)`);
            } catch (e) {
              // Ignore errors
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

/**
 * Auto-link user to Memberships by email
 * This is the key function that connects User to Membership automatically
 */
async function autoLinkMemberships(userId, email) {
  try {
    const result = await prisma.membership.updateMany({
      where: {
        email: email,
        userId: null  // Only link unlinked memberships
      },
      data: {
        userId: userId,
        joinedAt: new Date()
      }
    });
    
    if (result.count > 0) {
      console.log(`   🔗 Auto-linked ${email} to ${result.count} membership(s)`);
    }
    
    return result.count;
  } catch (error) {
    console.error('Error auto-linking memberships:', error);
    return 0;
  }
}

module.exports = passport;
