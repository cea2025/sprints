const express = require('express');
const passport = require('passport');
const router = express.Router();

const isGoogleOAuthConfigured = () => {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
};

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
router.get('/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({ 
      error: 'Google OAuth not configured',
      message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
    });
  }
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
});

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback - redirects based on user's organizations
router.get('/google/callback', (req, res, next) => {
  const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173';
  
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(`${baseUrl}/login?error=oauth_not_configured`);
  }
  
  passport.authenticate('google', async (err, user, info) => {
    // Handle errors
    if (err) {
      console.error('OAuth error:', err);
      return res.redirect(`${baseUrl}/login?error=server_error`);
    }
    
    // User not authorized (not in test users list or other Google restriction)
    if (!user) {
      const errorType = info?.message || 'unauthorized';
      return res.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorType)}`);
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.redirect(`${baseUrl}/login?error=account_disabled`);
    }
    
    // Login the user
    req.logIn(user, async (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.redirect(`${baseUrl}/login?error=login_failed`);
      }
      
      try {
        // Super Admin - redirect to super admin dashboard
        if (user.isSuperAdmin) {
          return res.redirect(`${baseUrl}/super-admin`);
        }
        
        // Get user's organizations
        const prisma = require('../lib/prisma');
        const memberships = await prisma.organizationMember.findMany({
          where: {
            userId: user.id,
            isActive: true,
            organization: { isActive: true }
          },
          include: {
            organization: {
              select: { slug: true }
            }
          }
        });
        
        if (memberships.length === 0) {
          // No organizations - redirect to create or join
          return res.redirect(`${baseUrl}/no-organization`);
        } else if (memberships.length === 1) {
          // Single organization - redirect directly to their dashboard
          const slug = memberships[0].organization.slug;
          req.session.organizationId = memberships[0].organizationId;
          return res.redirect(`${baseUrl}/${slug}/dashboard`);
        } else {
          // Multiple organizations - let user choose
          return res.redirect(`${baseUrl}/select-organization`);
        }
      } catch (error) {
        console.error('Error determining redirect:', error);
        return res.redirect(`${baseUrl}/dashboard`);
      }
    });
  })(req, res, next);
});

// @route   GET /api/auth/me
// @desc    Get current user with organizations
router.get('/me', async (req, res) => {
  if (req.user) {
    try {
      const prisma = require('../lib/prisma');
      
      // Get user's organizations
      const memberships = await prisma.organizationMember.findMany({
        where: {
          userId: req.user.id,
          isActive: true,
          organization: { isActive: true }
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true
            }
          }
        }
      });

      const organizations = memberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logo: m.organization.logo,
        role: m.role
      }));

      // Get all memberships for this user (one per organization) - NEW
      const memberships = req.user.memberships || [];
      
      // LEGACY: Also include teamMembers for backwards compatibility
      const teamMembers = req.user.teamMembers || [];
      
      console.log('🔍 [auth/me] User memberships:', memberships.map(m => ({ 
        id: m.id, 
        name: m.name, 
        email: m.email,
        role: m.role,
        organizationId: m.organizationId 
      })));

      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
          role: req.user.role,
          isActive: req.user.isActive,
          isSuperAdmin: req.user.isSuperAdmin || false,
          memberships,  // NEW: Array of all memberships across orgs
          teamMembers,  // LEGACY: Keep for backwards compatibility
          organizations,
          organizationCount: organizations.length
        }
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
          role: req.user.role,
          isActive: req.user.isActive,
          isSuperAdmin: req.user.isSuperAdmin || false,
          memberships: req.user.memberships || [],
          teamMembers: req.user.teamMembers || [],
          organizations: [],
          organizationCount: 0
        }
      });
    }
  } else {
    res.status(401).json({ user: null });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// @route   GET /api/auth/status
// @desc    Check OAuth configuration status
router.get('/status', (req, res) => {
  res.json({
    googleOAuth: isGoogleOAuthConfigured(),
    authenticated: !!req.user
  });
});

module.exports = router;
