const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
        
        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id }
        });

        if (user) {
          // User exists - check if still active
          if (!user.isActive) {
            return done(null, false, { message: 'account_disabled' });
          }
          
          // Update user info
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName,
              picture: profile.photos?.[0]?.value
            }
          });
          
          return done(null, user);
        }
        
        // New user - check if email is allowed
        const allowedEmail = await prisma.allowedEmail.findUnique({
          where: { email: email }
        });

        if (!allowedEmail) {
          // Email not in whitelist
          console.log(`❌ Login rejected: ${email} not in allowed list`);
          return done(null, false, { message: 'unauthorized' });
        }

        // Create new user with role from allowedEmail
        user = await prisma.user.create({
          data: {
            googleId: profile.id,
            email: email,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            role: allowedEmail.role || 'VIEWER'
          }
        });

        console.log(`✅ New user created: ${email} with role ${allowedEmail.role || 'VIEWER'}`);
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
