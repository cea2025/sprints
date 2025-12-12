const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { auditMiddleware, captureOldEntity } = require('../modules/audit/audit.middleware');
const { applyTeamReadScope } = require('../shared/teamScope');
const { validateTeamId, getDefaultTeamIdFromPrincipal } = require('../shared/teamValidation');
const { BadRequestError, ConflictError, NotFoundError } = require('../shared/errors/AppError');

const router = express.Router();

function getQuarterFromDate(date) {
  return Math.ceil((date.getMonth() + 1) / 3);
}

function parseSpNumber(name) {
  if (typeof name !== 'string') return null;
  if (!name.startsWith('sp-')) return null;
  const n = parseInt(name.slice(3), 10);
  return Number.isFinite(n) ? n : null;
}

function isValidSpCode(name) {
  return typeof name === 'string' && /^sp-\d+$/i.test(name.trim());
}

async function getNextSprintCode(tx, organizationId) {
  const rows = await tx.sprint.findMany({
    where: { organizationId, name: { startsWith: 'sp-' } },
    select: { name: true }
  });

  let max = 0;
  for (const row of rows) {
    const n = parseSpNumber(row.name);
    if (n && n > max) max = n;
  }
  const next = max + 1;
  return `sp-${String(next).padStart(2, '0')}`;
}

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
      orderBy: [{ startDate: 'desc' }, { name: 'desc' }]
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

    const tasksLimitRaw = req.query.tasksLimit;
    const tasksCursor = req.query.tasksCursor ? String(req.query.tasksCursor) : null;
    const tasksLimit = Math.min(200, Math.max(0, parseInt(tasksLimitRaw, 10) || 30));

    const linkedTasksLimitRaw = req.query.linkedTasksLimit;
    const linkedTasksCursor = req.query.linkedTasksCursor ? String(req.query.linkedTasksCursor) : null;
    const linkedTasksLimit = linkedTasksLimitRaw !== undefined
      ? Math.min(200, Math.max(0, parseInt(linkedTasksLimitRaw, 10) || 30))
      : null;

    const storiesLimitRaw = req.query.storiesLimit;
    const storiesCursor = req.query.storiesCursor ? String(req.query.storiesCursor) : null;
    const storiesLimit = storiesLimitRaw !== undefined
      ? Math.min(200, Math.max(0, parseInt(storiesLimitRaw, 10) || 30))
      : null;

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
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...(storiesLimit !== null
            ? {
                take: storiesLimit,
                ...(storiesCursor
                  ? {
                      cursor: { id: storiesCursor },
                      skip: 1
                    }
                  : {})
              }
            : {})
        }
      }
    });

    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Standalone tasks that belong directly to the sprint (not via story)
    const tasksWhere = applyTeamReadScope(
      { organizationId, sprintId: sprint.id, storyId: null },
      req
    );

    const standaloneTasks = await prisma.task.findMany({
      where: tasksWhere,
      include: {
        owner: { select: { id: true, name: true } },
        membership: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: tasksLimit,
      ...(tasksCursor
        ? {
            cursor: { id: tasksCursor },
            skip: 1
          }
        : {})
    });

    const standaloneTasksNextCursor =
      tasksLimit > 0 && standaloneTasks.length === tasksLimit
        ? standaloneTasks[standaloneTasks.length - 1].id
        : null;

    // Tasks linked to stories that belong to this sprint (big-data friendly, paginated)
    const linkedTasks = linkedTasksLimit !== null
      ? await prisma.task.findMany({
          where: applyTeamReadScope(
            {
              organizationId,
              storyId: { not: null },
              story: { sprintId: sprint.id }
            },
            req
          ),
          include: {
            owner: { select: { id: true, name: true } },
            membership: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
            story: { select: { id: true, title: true } }
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: linkedTasksLimit,
          ...(linkedTasksCursor
            ? {
                cursor: { id: linkedTasksCursor },
                skip: 1
              }
            : {})
        })
      : [];

    const linkedTasksNextCursor =
      linkedTasksLimit !== null && linkedTasksLimit > 0 && linkedTasks.length === linkedTasksLimit
        ? linkedTasks[linkedTasks.length - 1].id
        : null;

    const storiesNextCursor =
      storiesLimit !== null && storiesLimit > 0 && sprint.stories.length === storiesLimit
        ? sprint.stories[sprint.stories.length - 1].id
        : null;

    res.json({
      ...sprint,
      rocks: sprint.sprintRocks.map(sr => sr.rock),
      linkedTasks,
      linkedTasksNextCursor,
      standaloneTasks,
      standaloneTasksNextCursor,
      storiesNextCursor
    });
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ error: 'Failed to fetch sprint' });
  }
});

// @route   POST /api/sprints
// @desc    Create a new sprint (auto-code sp-XX unless name provided)
router.post('/', auditMiddleware('Sprint'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const { name: requestedName, goal, startDate, endDate, rockIds, teamId } = req.body;
    const validTeamId = await validateTeamId(organizationId, teamId) || getDefaultTeamIdFromPrincipal(req);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'תאריך התחלה לא תקין' });
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'תאריך סיום לא תקין' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'תאריך סיום חייב להיות אחרי תאריך התחלה' });
    }

    const trimmedRequestedName = requestedName?.trim();
    if (trimmedRequestedName && !isValidSpCode(trimmedRequestedName)) {
      return res.status(400).json({ error: 'שם ספרינט לא תקין (פורמט: sp-01)' });
    }

    const sprint = await prisma.$transaction(async (tx) => {
      let name = trimmedRequestedName;

      if (name) {
        const exists = await tx.sprint.findFirst({ where: { organizationId, name }, select: { id: true } });
        if (exists) throw new ConflictError(`ספרינט ${name} כבר קיים`);
      } else {
        name = await getNextSprintCode(tx, organizationId);
      }

      const year = start.getFullYear();
      const quarter = getQuarterFromDate(start);

      const lastInQuarter = await tx.sprint.findFirst({
        where: { organizationId, year, quarter },
        select: { sprintNumber: true },
        orderBy: { sprintNumber: 'desc' }
      });
      const sprintNumber = (lastInQuarter?.sprintNumber || 0) + 1;

      return tx.sprint.create({
        data: {
          name,
          year,
          quarter,
          sprintNumber,
          goal,
          startDate: start,
          endDate: end,
          teamId: validTeamId || null,
          organizationId,
          createdBy: req.user.id,
          sprintRocks: {
            create: (rockIds || []).map((rockId) => ({ rockId }))
          }
        },
        include: {
          sprintRocks: {
            include: { rock: true }
          }
        }
      });
    });

    res.status(201).json({
      ...sprint,
      rocks: sprint.sprintRocks.map(sr => sr.rock)
    });
  } catch (error) {
    console.error('Error creating sprint:', error);
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Failed to create sprint: ' + error.message });
  }
});

// @route   PUT /api/sprints/:id
// @desc    Update a sprint
router.put('/:id', captureOldEntity(prisma.sprint), auditMiddleware('Sprint'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const { name: requestedName, goal, startDate, endDate, rockIds, teamId } = req.body;
    const validTeamId = teamId === '' ? null : (await validateTeamId(organizationId, teamId) || null);

    const sprint = await prisma.$transaction(async (tx) => {
      const existingSprint = await tx.sprint.findFirst({
        where: applyTeamReadScope({ id: req.params.id, organizationId }, req),
        select: { id: true, startDate: true }
      });
      if (!existingSprint) throw new NotFoundError('Sprint not found');

      let name = requestedName?.trim();
      if (name !== undefined) {
        if (!name) throw new BadRequestError('שם הוא שדה חובה');
        if (!isValidSpCode(name)) throw new BadRequestError('שם ספרינט לא תקין (פורמט: sp-01)');
        const exists = await tx.sprint.findFirst({
          where: { organizationId, name, NOT: { id: req.params.id } },
          select: { id: true }
        });
        if (exists) throw new ConflictError(`ספרינט ${name} כבר קיים`);
      }

      let start = undefined;
      let end = undefined;
      if (startDate !== undefined) {
        start = new Date(startDate);
        if (Number.isNaN(start.getTime())) throw new BadRequestError('תאריך התחלה לא תקין');
      }
      if (endDate !== undefined) {
        end = new Date(endDate);
        if (Number.isNaN(end.getTime())) throw new BadRequestError('תאריך סיום לא תקין');
      }
      if (start && end && end <= start) {
        throw new BadRequestError('תאריך סיום חייב להיות אחרי תאריך התחלה');
      }

      const effectiveStart = start || existingSprint.startDate;

      return tx.sprint.update({
        where: { id: req.params.id },
        data: {
          name: name !== undefined ? name : undefined,
          goal,
          startDate: start,
          endDate: end,
          year: startDate !== undefined ? effectiveStart.getFullYear() : undefined,
          quarter: startDate !== undefined ? getQuarterFromDate(effectiveStart) : undefined,
          teamId: teamId !== undefined ? validTeamId : undefined,
          updatedBy: req.user.id
        }
      });
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
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
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
