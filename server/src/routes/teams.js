const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { requireRole } = require('../middleware/permissions');
const { auditMiddleware, captureOldEntity } = require('../modules/audit/audit.middleware');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * @route   GET /api/teams
 * @desc    List teams for current organization
 * @access  MANAGER+
 */
router.get('/', requireRole('MANAGER'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const teams = await prisma.team.findMany({
      where: { organizationId, isActive: true },
      include: {
        _count: { select: { members: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'שגיאה בטעינת צוותים' });
  }
});

/**
 * @route   GET /api/teams/me
 * @desc    List teams for current membership
 * @access  Any authenticated user with membership
 */
router.get('/me', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const membershipId = req.principal?.membershipId;
    if (!membershipId) return res.json([]);

    const teams = await prisma.teamMembership.findMany({
      where: { membershipId, team: { organizationId, isActive: true } },
      select: {
        roleCode: true,
        team: { select: { id: true, name: true, description: true, isActive: true } }
      },
      orderBy: { team: { name: 'asc' } }
    });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching my teams:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הצוותים שלי' });
  }
});

/**
 * @route   POST /api/teams
 * @desc    Create a team
 * @access  MANAGER+
 */
router.post('/', requireRole('MANAGER'), auditMiddleware('Team'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'נדרש שם צוות' });
    }

    const team = await prisma.team.create({
      data: {
        organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: req.user.id
      }
    });

    res.locals.entity = team;
    res.json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'שגיאה ביצירת צוות' });
  }
});

/**
 * @route   GET /api/teams/:id
 * @desc    Get a team with members
 * @access  MANAGER+
 */
router.get('/:id', requireRole('MANAGER'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const team = await prisma.team.findFirst({
      where: { id: req.params.id, organizationId },
      include: {
        members: {
          include: {
            membership: { select: { id: true, name: true, email: true, role: true, isActive: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!team) return res.status(404).json({ error: 'צוות לא נמצא' });
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'שגיאה בטעינת צוות' });
  }
});

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team details
 * @access  MANAGER+
 */
router.put(
  '/:id',
  requireRole('MANAGER'),
  captureOldEntity(prisma.team),
  auditMiddleware('Team'),
  async (req, res) => {
    try {
      const organizationId = await getOrganizationId(req);
      if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

      const { name, description, isActive } = req.body;

      const existing = await prisma.team.findFirst({
        where: { id: req.params.id, organizationId },
        select: { id: true }
      });
      if (!existing) return res.status(404).json({ error: 'צוות לא נמצא' });

      const team = await prisma.team.update({
        where: { id: req.params.id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          description: description !== undefined ? (description?.trim() || null) : undefined,
          isActive: isActive !== undefined ? !!isActive : undefined
        }
      });

      res.locals.entity = team;
      res.json(team);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'שגיאה בעדכון צוות' });
    }
  }
);

/**
 * @route   POST /api/teams/:id/members
 * @desc    Add member to team
 * @access  MANAGER+
 */
router.post('/:id/members', requireRole('MANAGER'), auditMiddleware('TeamMembership'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const { membershipId, roleCode } = req.body;
    if (!membershipId) return res.status(400).json({ error: 'נדרש membershipId' });

    // Ensure team belongs to org
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, organizationId },
      select: { id: true }
    });
    if (!team) return res.status(404).json({ error: 'צוות לא נמצא' });

    // Ensure membership belongs to same org
    const member = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId, isActive: true },
      select: { id: true }
    });
    if (!member) return res.status(400).json({ error: 'חבר לא נמצא בארגון' });

    const teamMember = await prisma.teamMembership.upsert({
      where: { teamId_membershipId: { teamId: team.id, membershipId } },
      update: { roleCode: roleCode || null },
      create: { teamId: team.id, membershipId, roleCode: roleCode || null }
    });

    res.locals.entity = teamMember;
    res.json(teamMember);
  } catch (error) {
    console.error('Error adding member to team:', error);
    res.status(500).json({ error: 'שגיאה בהוספת חבר לצוות' });
  }
});

/**
 * @route   DELETE /api/teams/:id/members/:membershipId
 * @desc    Remove member from team
 * @access  MANAGER+
 */
router.delete('/:id/members/:membershipId', requireRole('MANAGER'), auditMiddleware('TeamMembership'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const team = await prisma.team.findFirst({
      where: { id: req.params.id, organizationId },
      select: { id: true }
    });
    if (!team) return res.status(404).json({ error: 'צוות לא נמצא' });

    await prisma.teamMembership.delete({
      where: { teamId_membershipId: { teamId: team.id, membershipId: req.params.membershipId } }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error removing member from team:', error);
    res.status(500).json({ error: 'שגיאה בהסרת חבר מהצוות' });
  }
});

module.exports = router;


