/**
 * Debug Routes - ONLY for troubleshooting multi-tenant issues
 * Should be removed in production!
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');

const router = express.Router();

router.use(isAuthenticated);

// Debug endpoint to check what's happening with organization context
router.get('/org-context', async (req, res) => {
  try {
    const headerOrgId = req.headers['x-organization-id'];
    const sessionOrgId = req.session?.organizationId;
    const resolvedOrgId = await getOrganizationId(req);
    
    // Get user's memberships
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    // Count data per org
    const orgDataCounts = {};
    for (const m of memberships) {
      const orgId = m.organization.id;
      orgDataCounts[m.organization.slug] = {
        rocks: await prisma.rock.count({ where: { organizationId: orgId } }),
        sprints: await prisma.sprint.count({ where: { organizationId: orgId } }),
        stories: await prisma.story.count({ where: { organizationId: orgId } }),
        objectives: await prisma.objective.count({ where: { organizationId: orgId } })
      };
    }

    res.json({
      debug: {
        receivedHeader: headerOrgId || 'NOT SET',
        sessionOrgId: sessionOrgId || 'NOT SET',
        resolvedOrgId: resolvedOrgId || 'NULL',
        user: {
          id: req.user.id,
          email: req.user.email,
          isSuperAdmin: req.user.isSuperAdmin || false
        },
        memberships: memberships.map(m => ({
          orgId: m.organization.id,
          orgName: m.organization.name,
          orgSlug: m.organization.slug,
          role: m.role
        })),
        dataPerOrg: orgDataCounts,
        headers: {
          'x-organization-id': req.headers['x-organization-id'],
          'content-type': req.headers['content-type'],
          'cookie': req.headers['cookie'] ? 'SET (hidden)' : 'NOT SET'
        }
      },
      recommendation: headerOrgId === resolvedOrgId 
        ? '✅ Header matches resolved org' 
        : '⚠️ MISMATCH! Header vs resolved org!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;

