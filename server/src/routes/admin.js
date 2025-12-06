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
      totalStories
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.rock.count(),
      prisma.sprint.count(),
      prisma.story.count()
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
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הסטטיסטיקות' });
  }
});

module.exports = router;

