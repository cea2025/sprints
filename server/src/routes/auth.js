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
// @desc    Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.redirect('/login?error=oauth_not_configured');
  }
  
  passport.authenticate('google', (err, user, info) => {
    // Handle errors
    if (err) {
      console.error('OAuth error:', err);
      return res.redirect('/login?error=server_error');
    }
    
    // User not authorized (not in test users list or other Google restriction)
    if (!user) {
      const errorType = info?.message || 'unauthorized';
      return res.redirect(`/login?error=${encodeURIComponent(errorType)}`);
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.redirect('/login?error=account_disabled');
    }
    
    // Login the user
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.redirect('/login?error=login_failed');
      }
      
      // Successful authentication
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? '/dashboard' 
        : 'http://localhost:5173/dashboard';
      res.redirect(redirectUrl);
    });
  })(req, res, next);
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', (req, res) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        role: req.user.role,
        isActive: req.user.isActive,
        teamMember: req.user.teamMember
      }
    });
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
