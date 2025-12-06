/**
 * Admin Routes
 * 
 * Routes for user management and system administration.
 * All routes require ADMIN role.
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/permissions');
const { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, getPermissionsForRole } = require('../constants/roles');

const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(requireAuth);

// ==================== USERS ====================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with their roles
 * @access  Admin only
 */
router.get('/users', requirePermission('users:read'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        teamMember: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'שגיאה בטעינת המשתמשים' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user
 * @access  Admin only
 */
router.get('/users/:id', requirePermission('users:read'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        teamMember: {
          include: {
            ownedRocks: true,
            ownedStories: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'שגיאה בטעינת המשתמש' });
  }
});

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch('/users/:id/role', requirePermission('users:manage-roles'), async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ 
        error: 'תפקיד לא חוקי',
        validRoles: Object.values(ROLES)
      });
    }

    // Prevent changing own role
    if (id === req.user.id) {
      return res.status(400).json({ 
        error: 'לא ניתן לשנות את התפקיד של עצמך'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      include: { teamMember: true }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'שגיאה בעדכון התפקיד' });
  }
});

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Enable/disable user
 * @access  Admin only
 */
router.patch('/users/:id/status', requirePermission('users:update'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const { id } = req.params;

    // Prevent disabling own account
    if (id === req.user.id) {
      return res.status(400).json({ 
        error: 'לא ניתן לבטל את החשבון של עצמך'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      include: { teamMember: true }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'שגיאה בעדכון הסטטוס' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/users/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (id === req.user.id) {
      return res.status(400).json({ 
        error: 'לא ניתן למחוק את החשבון של עצמך'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'המשתמש נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'שגיאה במחיקת המשתמש' });
  }
});

// ==================== ROLES INFO ====================

/**
 * @route   GET /api/admin/roles
 * @desc    Get all available roles and their permissions
 * @access  Admin only
 */
router.get('/roles', requirePermission('users:read'), (req, res) => {
  const roles = Object.values(ROLES).map(role => ({
    id: role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
    permissions: getPermissionsForRole(role)
  }));

  res.json(roles);
});

// ==================== STATS ====================

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics
 * @access  Admin only
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      totalRocks,
      totalSprints,
      totalStories,
      totalAllowedEmails
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.rock.count(),
      prisma.sprint.count(),
      prisma.story.count(),
      prisma.allowedEmail.count()
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count.role;
          return acc;
        }, {})
      },
      content: {
        rocks: totalRocks,
        sprints: totalSprints,
        stories: totalStories
      },
      allowedEmails: totalAllowedEmails
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הסטטיסטיקות' });
  }
});

// ==================== ALLOWED EMAILS (WHITELIST) ====================

/**
 * @route   GET /api/admin/allowed-emails
 * @desc    Get all allowed emails
 * @access  Admin only
 */
router.get('/allowed-emails', requirePermission('users:read'), async (req, res) => {
  try {
    const allowedEmails = await prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Check which emails have registered
    const registeredEmails = await prisma.user.findMany({
      where: {
        email: {
          in: allowedEmails.map(ae => ae.email)
        }
      },
      select: { email: true, name: true, role: true, createdAt: true }
    });

    const registeredMap = registeredEmails.reduce((acc, user) => {
      acc[user.email] = user;
      return acc;
    }, {});

    const result = allowedEmails.map(ae => ({
      ...ae,
      isRegistered: !!registeredMap[ae.email],
      registeredUser: registeredMap[ae.email] || null
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching allowed emails:', error);
    res.status(500).json({ error: 'שגיאה בטעינת רשימת המיילים' });
  }
});

/**
 * @route   POST /api/admin/allowed-emails
 * @desc    Add new allowed email
 * @access  Admin only
 */
router.post('/allowed-emails', requirePermission('users:create'), async (req, res) => {
  try {
    const { email, name, role, note } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'נדרש מייל' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'כתובת מייל לא תקינה' });
    }

    // Check if already exists
    const existing = await prisma.allowedEmail.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(400).json({ error: 'מייל זה כבר קיים ברשימה' });
    }

    const allowedEmail = await prisma.allowedEmail.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        role: role || 'VIEWER',
        note: note || null,
        addedBy: req.user.id
      }
    });

    res.status(201).json(allowedEmail);
  } catch (error) {
    console.error('Error adding allowed email:', error);
    res.status(500).json({ error: 'שגיאה בהוספת המייל' });
  }
});

/**
 * @route   PUT /api/admin/allowed-emails/:id
 * @desc    Update allowed email
 * @access  Admin only
 */
router.put('/allowed-emails/:id', requirePermission('users:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, note } = req.body;

    const allowedEmail = await prisma.allowedEmail.update({
      where: { id },
      data: {
        name: name || null,
        role: role || 'VIEWER',
        note: note || null
      }
    });

    res.json(allowedEmail);
  } catch (error) {
    console.error('Error updating allowed email:', error);
    res.status(500).json({ error: 'שגיאה בעדכון המייל' });
  }
});

/**
 * @route   DELETE /api/admin/allowed-emails/:id
 * @desc    Remove allowed email
 * @access  Admin only
 */
router.delete('/allowed-emails/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.allowedEmail.delete({
      where: { id }
    });

    res.json({ message: 'המייל הוסר מהרשימה' });
  } catch (error) {
    console.error('Error deleting allowed email:', error);
    res.status(500).json({ error: 'שגיאה במחיקת המייל' });
  }
});

/**
 * @route   POST /api/admin/allowed-emails/bulk
 * @desc    Add multiple allowed emails at once
 * @access  Admin only
 */
router.post('/allowed-emails/bulk', requirePermission('users:create'), async (req, res) => {
  try {
    const { emails } = req.body; // Array of { email, name?, role?, note? }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'נדרשת רשימת מיילים' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(e => e.email && emailRegex.test(e.email));

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'לא נמצאו מיילים תקינים' });
    }

    // Get existing emails to skip
    const existingEmails = await prisma.allowedEmail.findMany({
      where: {
        email: {
          in: validEmails.map(e => e.email.toLowerCase())
        }
      },
      select: { email: true }
    });

    const existingSet = new Set(existingEmails.map(e => e.email));
    const newEmails = validEmails.filter(e => !existingSet.has(e.email.toLowerCase()));

    if (newEmails.length === 0) {
      return res.status(400).json({ error: 'כל המיילים כבר קיימים ברשימה' });
    }

    const created = await prisma.allowedEmail.createMany({
      data: newEmails.map(e => ({
        email: e.email.toLowerCase(),
        name: e.name || null,
        role: e.role || 'VIEWER',
        note: e.note || null,
        addedBy: req.user.id
      }))
    });

    res.status(201).json({ 
      message: `נוספו ${created.count} מיילים`,
      added: created.count,
      skipped: validEmails.length - newEmails.length
    });
  } catch (error) {
    console.error('Error adding bulk emails:', error);
    res.status(500).json({ error: 'שגיאה בהוספת המיילים' });
  }
});

module.exports = router;

