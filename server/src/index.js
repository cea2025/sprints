require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const path = require('path');
const { Pool } = require('pg');

// Import routes (legacy)
const authRoutes = require('./routes/auth');
const objectivesRoutes = require('./routes/objectives');
const rocksRoutes = require('./routes/rocks');
const sprintsRoutes = require('./routes/sprints');
const storiesRoutes = require('./routes/stories');
const tasksRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/team');
const teamsRoutes = require('./routes/teams');
const labelsRoutes = require('./routes/labels');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const superAdminRoutes = require('./routes/super-admin');
const debugRoutes = require('./routes/debug');

// Import new module routes
const organizationRoutes = require('./modules/organization/organization.routes');
const auditRoutes = require('./modules/audit/audit.routes');

// Import middleware
const { errorHandler, notFoundHandler } = require('./shared/middleware/error.middleware');
const { attachPrincipal } = require('./middleware/principal');

// Import passport config
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Render (needed for secure cookies behind proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ==================== MIDDLEWARE ====================

// CORS - allow frontend to connect (only needed in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }));
}

// Parse JSON bodies
app.use(express.json());

// Session configuration with PostgreSQL store
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year - stay logged in until manual logout
  }
};

// Use PostgreSQL session store when DATABASE_URL is available
if (process.env.DATABASE_URL) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  sessionConfig.store = new pgSession({
    pool: pool,
    tableName: 'session', // Table name for sessions
    createTableIfMissing: true // Auto-create table if it doesn't exist
  });
  
  if (process.env.NODE_ENV === 'production') {
    sessionConfig.proxy = true;
  }
  
  console.log('✅ Using PostgreSQL session store');
} else {
  console.log('⚠️ Using MemoryStore for sessions (development only)');
}

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Attach org-scoped principal + feature flags (RBAC v2 foundation)
// Safe: does not enforce permissions; only enriches req/principal.
app.use('/api', attachPrincipal);

// ==================== API ROUTES ====================

// Auth routes
app.use('/api/auth', authRoutes);

// Organization routes (new module structure)
app.use('/api/organizations', organizationRoutes);

// Super Admin routes (platform-wide)
app.use('/api/super-admin', superAdminRoutes);

// Legacy routes (will be migrated to modules later)
app.use('/api/objectives', objectivesRoutes);
app.use('/api/rocks', rocksRoutes);
app.use('/api/sprints', sprintsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/labels', labelsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Audit routes (new module)
app.use('/api/audit', auditRoutes);

// Orphans routes (unlinked entities)
const orphansRoutes = require('./routes/orphans');
app.use('/api/orphans', orphansRoutes);

// Debug routes (for troubleshooting multi-tenant issues) - ONLY in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
  console.log('⚠️ Debug routes enabled (development mode)');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0' // Updated version
  });
});

// ==================== PRODUCTION: Serve Frontend ====================

if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// ==================== ERROR HANDLING ====================

// 404 handler (must be after all routes)
app.use('/api/*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ==================== START SERVER ====================

// Import keep-alive utility
const { startKeepAlive } = require('./utils/keep-alive');
const { bootstrap } = require('./utils/bootstrap');

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Architecture: Multi-tenant ready`);

  // Bootstrap safe idempotent tasks (feature flags, etc.)
  bootstrap();
  
  // Start keep-alive pinger to prevent Render free tier from sleeping
  startKeepAlive();
});
