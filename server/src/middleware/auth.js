// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized - Please login' });
};

// Middleware to check if user has a team member profile
const hasTeamMember = (req, res, next) => {
  if (req.isAuthenticated() && req.user.teamMembers && req.user.teamMembers.length > 0) {
    return next();
  }
  res.status(403).json({ error: 'No team member profile found' });
};

module.exports = {
  isAuthenticated,
  hasTeamMember
};
