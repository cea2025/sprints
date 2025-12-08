/**
 * Super Admin Routes
 * נתיבים למנהלי פלטפורמה (Super Admin)
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Middleware - require super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'נדרשת הרשאת Super Admin' });
  }
  next();
};

router.use(isAuthenticated);
router.use(requireSuperAdmin);

// @route   GET /api/super-admin/organizations
// @desc    Get all organizations with stats
router.get('/organizations', async (req, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            members: true,
            objectives: true,
            rocks: true,
            sprints: true,
            stories: true,
            teamMembers: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json([]);
  }
});

// @route   GET /api/super-admin/stats
// @desc    Get platform-wide statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      organizationCount,
      userCount,
      rockCount,
      storyCount,
      activeOrgs
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.rock.count(),
      prisma.story.count(),
      prisma.organization.count({ where: { isActive: true } })
    ]);

    res.json({
      organizations: {
        total: organizationCount,
        active: activeOrgs
      },
      users: userCount,
      rocks: rockCount,
      stories: storyCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// @route   POST /api/super-admin/organizations
// @desc    Create organization (as super admin)
router.post('/organizations', async (req, res) => {
  try {
    const { name, slug, logo } = req.body;

    // Check if slug is unique
    const existing = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existing) {
      return res.status(400).json({ error: 'שם URL כבר תפוס' });
    }

    // Create organization AND add creator as admin member
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        logo: logo || null,
        createdBy: req.user.id,
        // Add the creator as an admin of this organization
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: true,
        _count: {
          select: { rocks: true, stories: true, members: true }
        }
      }
    });

    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// @route   PUT /api/super-admin/organizations/:id
// @desc    Update organization (as super admin)
router.put('/organizations/:id', async (req, res) => {
  try {
    const { name, slug, logo, isActive } = req.body;

    // If changing slug, check uniqueness
    if (slug) {
      const existing = await prisma.organization.findFirst({
        where: {
          slug,
          id: { not: req.params.id }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'שם URL כבר תפוס' });
      }
    }

    const organization = await prisma.organization.update({
      where: { id: req.params.id },
      data: { name, slug, logo, isActive }
    });

    res.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// @route   DELETE /api/super-admin/organizations/:id
// @desc    Delete organization (soft delete)
router.delete('/organizations/:id', async (req, res) => {
  try {
    await prisma.organization.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Organization deactivated' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// @route   GET /api/super-admin/users
// @desc    Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        organizations: {
          include: {
            organization: {
              select: { name: true, slug: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json([]);
  }
});

// @route   PUT /api/super-admin/users/:id/super-admin
// @desc    Toggle super admin status
router.put('/users/:id/super-admin', async (req, res) => {
  try {
    const { isSuperAdmin } = req.body;

    // Prevent removing own super admin status
    if (req.params.id === req.user.id && !isSuperAdmin) {
      return res.status(400).json({ error: 'לא ניתן להסיר את הרשאת Super Admin של עצמך' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isSuperAdmin }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// @route   POST /api/super-admin/impersonate/:orgId
// @desc    Enter an organization as super admin (view mode)
router.post('/impersonate/:orgId', async (req, res) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.orgId }
    });

    if (!organization) {
      return res.status(404).json({ error: 'ארגון לא נמצא' });
    }

    // Set session to view this organization
    req.session.organizationId = organization.id;
    req.session.impersonating = true;

    res.json({
      organizationId: organization.id,
      organizationName: organization.name,
      slug: organization.slug
    });
  } catch (error) {
    console.error('Error impersonating:', error);
    res.status(500).json({ error: 'Failed to impersonate' });
  }
});

// @route   GET /api/super-admin/audit-log
// @desc    Get platform audit log
router.get('/audit-log', async (req, res) => {
  try {
    const { limit = 100, organizationId } = req.query;

    const where = {};
    if (organizationId) where.organizationId = organizationId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json([]);
  }
});

module.exports = router;

