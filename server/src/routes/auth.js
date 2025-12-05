const express = require('express');
const passport = require('passport');
const router = express.Router();

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login?error=auth_failed' 
  }),
  (req, res) => {
    // Successful authentication
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? '/' 
      : 'http://localhost:5173/';
    res.redirect(redirectUrl);
  }
);

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

module.exports = router;
