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

// @route   GET /api/stories
// @desc    Get all stories with search, filter and pagination
// @query   sortBy (createdAt|updatedAt|title), sortOrder (asc|desc), dateFrom, dateTo
router.get('/', async (req, res) => {
  try {
    const { 
      sprintId, 
      rockId, 
      ownerId, 
      isBlocked,
      orphanFilter, // 'no-rock', 'backlog', 'no-sprint'
      search,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
      labelIds,
      labelMode
    } = req.query;
    
    const organizationId = await getOrganizationId(req);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (organizationId) where.organizationId = organizationId;
    if (sprintId) where.sprintId = sprintId;
    if (rockId) where.rockId = rockId;
    
    // Handle owner filter - ownerId might be membershipId or teamMemberId
    if (ownerId) {
      const membership = await prisma.membership.findUnique({
        where: { id: ownerId }
      });
      if (membership) {
        const teamMember = await prisma.teamMember.findFirst({
          where: { userId: membership.userId, organizationId }
        });
        const ownerConditions = [{ membershipId: ownerId }];
        if (teamMember) ownerConditions.push({ ownerId: teamMember.id });
        where.AND = where.AND || [];
        where.AND.push({ OR: ownerConditions });
      } else {
        where.AND = where.AND || [];
        where.AND.push({ OR: [{ ownerId }, { membershipId: ownerId }] });
      }
    }
    
    if (isBlocked !== undefined) where.isBlocked = isBlocked === 'true';
    
    // Orphan filters
    if (orphanFilter === 'no-rock') {
      where.rockId = null;
    } else if (orphanFilter === 'backlog' || orphanFilter === 'no-sprint') {
      where.sprintId = null;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    
    // Server-side search
    if (search && search.length >= 2) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Label filtering
    const parsedLabelIds = typeof labelIds === 'string' && labelIds.trim()
      ? labelIds.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const mode = (labelMode || 'or').toLowerCase();
    if (parsedLabelIds.length > 0) {
      if (mode === 'and') {
        where.AND = where.AND || [];
        for (const id of parsedLabelIds) {
          where.AND.push({ labels: { some: { labelId: id } } });
        }
      } else {
        where.labels = { some: { labelId: { in: parsedLabelIds } } };
      }
    }

    const scopedWhere = applyTeamReadScope(where, req);

    // Get total count for pagination
    const total = await prisma.story.count({ where: scopedWhere });

    // Build orderBy based on sortBy parameter
    let orderBy;
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    if (sortBy === 'createdAt') {
      orderBy = { createdAt: order };
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: order };
    } else if (sortBy === 'title') {
      orderBy = { title: order };
    } else {
      // Default: newest first
      orderBy = { createdAt: 'desc' };
    }

    const stories = await prisma.story.findMany({
      where: scopedWhere,
      select: {
        id: true,
        title: true,
        description: true,
        progress: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        labels: { select: { label: { select: { id: true, name: true, color: true } } } },
        sprint: {
          select: {
            id: true,
            name: true
          }
        },
        rock: {
          select: {
            id: true,
            code: true,
            name: true,
            objective: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy,
      skip,
      take: parseInt(limit)
    });

    res.json({
      data: stories.map((s) => ({ ...s, labels: (s.labels || []).map((sl) => sl.label) })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ data: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
  }
});

// @route   GET /api/stories/simple
// @desc    Get stories with minimal data (for dropdowns, quick lists)
router.get('/simple', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const where = {};
    if (organizationId) where.organizationId = organizationId;

    const scopedWhere = applyTeamReadScope(where, req);

    const stories = await prisma.story.findMany({
      where: scopedWhere,
      select: {
        id: true,
        title: true,
        progress: true,
        isBlocked: true,
        teamId: true,
        team: { select: { id: true, name: true } }
      },
      orderBy: { title: 'asc' },
      take: 200
    });

    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json([]);
  }
});

// @route   GET /api/stories/:id
// @desc    Get single story
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const where = applyTeamReadScope({ id: req.params.id, organizationId }, req);

    const story = await prisma.story.findFirst({
      where,
      include: {
        sprint: {
          select: { id: true, name: true }
        },
        rock: {
          select: {
            id: true,
            code: true,
            name: true,
            objective: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        labels: {
          select: { label: { select: { id: true, name: true, color: true } } }
        },
        owner: {
          select: { id: true, name: true }
        }
      }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      ...story,
      labels: (story.labels || []).map((sl) => sl.label)
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

/**
 * @route   POST /api/stories/:id/labels
 * @desc    Replace labels set for a story (all authenticated)
 */
router.post('/:id/labels', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const labelIds = Array.isArray(req.body?.labelIds) ? req.body.labelIds : [];

    const story = await prisma.story.findFirst({
      where: applyTeamReadScope({ id: req.params.id, organizationId }, req),
      select: { id: true }
    });
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const validLabels = await prisma.label.findMany({
      where: { organizationId, isActive: true, id: { in: labelIds } },
      select: { id: true }
    });
    const validIds = new Set(validLabels.map((l) => l.id));
    const finalIds = labelIds.filter((id) => validIds.has(id));

    await prisma.storyLabel.deleteMany({ where: { storyId: story.id } });
    if (finalIds.length > 0) {
      await prisma.storyLabel.createMany({
        data: finalIds.map((labelId) => ({ storyId: story.id, labelId })),
        skipDuplicates: true
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating story labels:', error);
    res.status(500).json({ error: 'שגיאה בעדכון תוויות' });
  }
});

// @route   POST /api/stories
// @desc    Create a new story
router.post('/', auditMiddleware('Story'), async (req, res) => {
  try {
    const { code, title, description, progress, isBlocked, sprintId, rockId, ownerId, teamId } = req.body;
    const organizationId = await getOrganizationId(req);
    // Default team: if story is linked to a rock, inherit its teamId; else use provided or principal default.
    let inheritedTeamId = null;
    if (rockId) {
      const rock = await prisma.rock.findFirst({
        where: { id: rockId, organizationId },
        select: { teamId: true }
      });
      inheritedTeamId = rock?.teamId || null;
    }
    const validTeamId = inheritedTeamId || (await validateTeamId(organizationId, teamId)) || getDefaultTeamIdFromPrincipal(req);

    // sprintId is now optional - stories without sprint go to "backlog" (אבני דרך בהמתנה)

    const story = await prisma.story.create({
      data: {
        code: code || null,
        title,
        description,
        progress: progress ? parseInt(progress) : 0,
        isBlocked: isBlocked || false,
        sprintId: sprintId || null,  // Optional - null = backlog
        rockId: rockId || null,
        ownerId: ownerId || null,
        teamId: validTeamId || null,
        organizationId,
        createdBy: req.user.id
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        progress: true,
        isBlocked: true,
        createdAt: true,
        sprint: {
          select: { id: true, name: true }
        },
        rock: {
          select: {
            id: true,
            code: true,
            name: true,
            objective: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json(story);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story: ' + error.message });
  }
});

// @route   PUT /api/stories/:id
// @desc    Update a story
router.put('/:id', captureOldEntity(prisma.story), auditMiddleware('Story'), async (req, res) => {
  try {
    const { code, title, description, progress, isBlocked, sprintId, rockId, ownerId, teamId } = req.body;
    const organizationId = await getOrganizationId(req);

    // sprintId can be null (moves to backlog) or a valid ID
    // Empty string means "unset" -> null (backlog)
    const newSprintId = sprintId === '' ? null : (sprintId !== undefined ? sprintId : undefined);
    const newRockId = rockId === '' ? null : (rockId !== undefined ? rockId : undefined);

    // Team handling:
    // - If explicit teamId provided, validate and set
    // - Else if rockId changes and target rock has a teamId, inherit it
    let nextTeamId = undefined;
    if (teamId !== undefined) {
      nextTeamId = teamId === '' ? null : (await validateTeamId(organizationId, teamId) || null);
    } else if (newRockId !== undefined && newRockId) {
      const rock = await prisma.rock.findFirst({
        where: { id: newRockId, organizationId },
        select: { teamId: true }
      });
      if (rock?.teamId) nextTeamId = rock.teamId;
    }

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        code: code !== undefined ? (code || null) : undefined,
        title,
        description,
        progress: progress !== undefined ? Math.min(100, Math.max(0, parseInt(progress) || 0)) : undefined,
        isBlocked: isBlocked !== undefined ? isBlocked : undefined,
        sprintId: newSprintId,
        rockId: newRockId,
        ownerId: ownerId === '' ? null : (ownerId !== undefined ? ownerId : undefined),
        teamId: nextTeamId,
        updatedBy: req.user.id
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        progress: true,
        isBlocked: true,
        createdAt: true,
        sprint: {
          select: { id: true, name: true }
        },
        rock: {
          select: {
            id: true,
            code: true,
            name: true,
            objective: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(story);
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// @route   PUT /api/stories/:id/progress
// @desc    Quick update for story progress (optimized)
router.put('/:id/progress', captureOldEntity(prisma.story), auditMiddleware('Story'), async (req, res) => {
  try {
    const { progress, isBlocked } = req.body;

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        progress: progress !== undefined ? Math.min(100, Math.max(0, parseInt(progress) || 0)) : undefined,
        isBlocked: isBlocked !== undefined ? isBlocked : undefined,
        updatedBy: req.user.id
      },
      select: {
        id: true,
        progress: true,
        isBlocked: true
      }
    });

    res.json(story);
  } catch (error) {
    console.error('Error updating story progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// @route   PUT /api/stories/:id/block
// @desc    Toggle story blocked state
router.put('/:id/block', async (req, res) => {
  try {
    const current = await prisma.story.findUnique({
      where: { id: req.params.id },
      select: { isBlocked: true }
    });

    if (!current) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        isBlocked: !current.isBlocked,
        updatedBy: req.user.id
      },
      select: {
        id: true,
        isBlocked: true,
        progress: true
      }
    });

    res.json(story);
  } catch (error) {
    console.error('Error toggling block state:', error);
    res.status(500).json({ error: 'Failed to toggle block state' });
  }
});

// @route   DELETE /api/stories/:id
// @desc    Delete a story
router.delete('/:id', captureOldEntity(prisma.story), auditMiddleware('Story'), async (req, res) => {
  try {
    await prisma.story.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

module.exports = router;
