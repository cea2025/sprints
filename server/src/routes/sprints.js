const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { auditMiddleware, captureOldEntity } = require('../modules/audit/audit.middleware');
const { applyTeamReadScope } = require('../shared/teamScope');
const { validateTeamId, getDefaultTeamIdFromPrincipal } = require('../shared/teamValidation');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/sprints
// @desc    Get all sprints
router.get('/', async (req, res) => {
  try {
    const { year, quarter } = req.query;
    const organizationId = await getOrganizationId(req);
    
    const where = {};
    if (organizationId) where.organizationId = organizationId;
    if (year) where.year = parseInt(year);
    if (quarter) where.quarter = parseInt(quarter);

    const scopedWhere = applyTeamReadScope(where, req);

    const sprints = await prisma.sprint.findMany({
      where: scopedWhere,
      include: {
        sprintRocks: {
          include: {
            rock: {
              include: {
                objective: true
              }
            }
          }
        },
        stories: {
          select: {
            id: true,
            progress: true,
            isBlocked: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { quarter: 'desc' },
        { sprintNumber: 'desc' }
      ]
    });

    // Add progress calculations
    const sprintsWithProgress = sprints.map(sprint => {
      let totalProgress = 0;
      if (sprint.stories.length > 0) {
        totalProgress = Math.round(
          sprint.stories.reduce((sum, s) => sum + (s.progress || 0), 0) / sprint.stories.length
        );
      }
      
      return {
        ...sprint,
        rocks: sprint.sprintRocks.map(sr => sr.rock),
        progress: totalProgress,
        totalStories: sprint.stories.length,
        completedStories: sprint.stories.filter(s => s.progress === 100).length,
        blockedStories: sprint.stories.filter(s => s.isBlocked).length
      };
    });

    res.json(sprintsWithProgress);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json([]);
  }
});

// @route   GET /api/sprints/:id
// @desc    Get single sprint with all details
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const where = applyTeamReadScope({ id: req.params.id, organizationId }, req);

    const sprint = await prisma.sprint.findFirst({
      where,
      include: {
        sprintRocks: {
          include: {
            rock: {
              include: {
                owner: true,
                objective: true
              }
            }
          }
        },
        stories: {
          include: {
            owner: true,
            rock: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.json({
      ...sprint,
      rocks: sprint.sprintRocks.map(sr => sr.rock)
    });
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ error: 'Failed to fetch sprint' });
  }
});

// @route   POST /api/sprints
// @desc    Create a new sprint with auto-generated name
router.post('/', auditMiddleware('Sprint'), async (req, res) => {
  try {
    const { year, quarter, sprintNumber, goal, startDate, endDate, rockIds, teamId } = req.body;
    const organizationId = await getOrganizationId(req);
    const validTeamId = await validateTeamId(organizationId, teamId) || getDefaultTeamIdFromPrincipal(req);

    // Auto-generate name: 2026-Q2-S5
    const name = `${year}-Q${quarter}-S${sprintNumber}`;

    // Check if name already exists in this organization
    const existing = await prisma.sprint.findFirst({
      where: { 
        name,
        organizationId 
      }
    });

    if (existing) {
      return res.status(400).json({ error: `ספרינט ${name} כבר קיים` });
    }

    const sprint = await prisma.sprint.create({
      data: {
        name,
        year: parseInt(year),
        quarter: parseInt(quarter),
        sprintNumber: parseInt(sprintNumber),
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        teamId: validTeamId || null,
        organizationId,
        createdBy: req.user.id,
        sprintRocks: {
          create: (rockIds || []).map(rockId => ({
            rockId
          }))
        }
      },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        }
      }
    });

    res.status(201).json({
      ...sprint,
      rocks: sprint.sprintRocks.map(sr => sr.rock)
    });
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ error: 'Failed to create sprint: ' + error.message });
  }
});

// @route   PUT /api/sprints/:id
// @desc    Update a sprint
router.put('/:id', captureOldEntity(prisma.sprint), auditMiddleware('Sprint'), async (req, res) => {
  try {
    const { year, quarter, sprintNumber, goal, startDate, endDate, rockIds, teamId } = req.body;
    const organizationId = await getOrganizationId(req);
    const validTeamId = teamId === '' ? null : (await validateTeamId(organizationId, teamId) || null);

    // Auto-generate name if year/quarter/sprintNumber provided
    let name;
    if (year && quarter && sprintNumber) {
      name = `${year}-Q${quarter}-S${sprintNumber}`;
    }

    // Update sprint
    const sprint = await prisma.sprint.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        year: year ? parseInt(year) : undefined,
        quarter: quarter ? parseInt(quarter) : undefined,
        sprintNumber: sprintNumber ? parseInt(sprintNumber) : undefined,
        goal,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        teamId: teamId !== undefined ? validTeamId : undefined,
        updatedBy: req.user.id
      }
    });

    // Update rock associations if provided
    if (rockIds !== undefined) {
      // Remove existing associations
      await prisma.sprintRock.deleteMany({
        where: { sprintId: sprint.id }
      });

      // Add new associations
      if (rockIds.length > 0) {
        await prisma.sprintRock.createMany({
          data: rockIds.map(rockId => ({
            sprintId: sprint.id,
            rockId
          }))
        });
      }
    }

    // Fetch updated sprint
    const updatedSprint = await prisma.sprint.findUnique({
      where: { id: sprint.id },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        }
      }
    });

    res.json({
      ...updatedSprint,
      rocks: updatedSprint.sprintRocks.map(sr => sr.rock)
    });
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ error: 'Failed to update sprint' });
  }
});

// @route   DELETE /api/sprints/:id
// @desc    Delete a sprint (stories become "backlog")
router.delete('/:id', captureOldEntity(prisma.sprint), auditMiddleware('Sprint'), async (req, res) => {
  try {
    // Count affected stories (will become backlog)
    const storiesCount = await prisma.story.count({
      where: { sprintId: req.params.id }
    });

    await prisma.sprint.delete({
      where: { id: req.params.id }
    });

    const message = storiesCount > 0 
      ? `ספרינט נמחק. ${storiesCount} אבני דרך עברו ל"אבני דרך בהמתנה"`
      : 'ספרינט נמחק בהצלחה';

    res.json({ message, affectedStories: storiesCount });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({ error: 'שגיאה במחיקת הספרינט' });
  }
});

module.exports = router;
