/**
 * Tasks Routes
 * API endpoints לניהול משימות
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { applyTeamReadScope } = require('../shared/teamScope');
const { validateTeamId, getDefaultTeamIdFromPrincipal } = require('../shared/teamValidation');

// All routes require authentication
router.use(isAuthenticated);

// ==================== GET ROUTES ====================

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for organization (with filters)
 * @query   status, ownerId, storyId, standalone, sortBy (createdAt|updatedAt|dueDate), sortOrder (asc|desc), dateFrom, dateTo
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const { status, ownerId, storyId, standalone, sortBy, sortOrder, dateFrom, dateTo, labelIds, labelMode } = req.query;

    const where = { organizationId };

    if (status) {
      where.status = status;
    }

    if (ownerId) {
      // ownerId might be membershipId or teamMemberId - check both
      // First try to find corresponding teamMember if ownerId is a membershipId
      const membership = await prisma.membership.findUnique({
        where: { id: ownerId }
      });
      if (membership) {
        const teamMember = await prisma.teamMember.findFirst({
          where: { userId: membership.userId, organizationId }
        });
        where.OR = [{ membershipId: ownerId }];
        if (teamMember) where.OR.push({ ownerId: teamMember.id });
      } else {
        // Might be a teamMemberId directly
        where.OR = [{ ownerId }, { membershipId: ownerId }];
      }
    }

    if (storyId) {
      where.storyId = storyId;
    }

    if (standalone === 'true') {
      where.storyId = null;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
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

    // Build orderBy based on sortBy parameter
    let orderBy;
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    if (sortBy === 'createdAt') {
      orderBy = [{ createdAt: order }];
    } else if (sortBy === 'updatedAt') {
      orderBy = [{ updatedAt: order }];
    } else if (sortBy === 'dueDate') {
      orderBy = [{ dueDate: order }, { createdAt: 'desc' }];
    } else if (sortBy === 'title') {
      orderBy = [{ title: order }];
    } else {
      // Default: grouped by story, then sortOrder, then newest
      orderBy = [{ storyId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
    }

    const scopedWhere = applyTeamReadScope(where, req);

    const tasks = await prisma.task.findMany({
      where: scopedWhere,
      include: {
        owner: {
          select: { id: true, name: true }
        },
        team: {
          select: { id: true, name: true }
        },
        labels: {
          select: { label: { select: { id: true, name: true, color: true } } }
        },
        story: {
          select: { 
            id: true, 
            title: true,
            rock: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy
    });

    res.json(tasks.map((t) => ({ ...t, labels: (t.labels || []).map((tl) => tl.label) })));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'שגיאה בטעינת משימות' });
  }
});

/**
 * @route   GET /api/tasks/my
 * @desc    Get current user's tasks
 */
router.get('/my', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    // Get user's membership (NEW) or teamMember (legacy)
    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.user.id,
        organizationId
      }
    });
    
    // Also look up legacy TeamMember (needed for old ownerId-based tasks)
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: req.user.id,
        organizationId
      }
    });

    const membershipId = membership?.id || null;
    const teamMemberId = teamMember?.id || null;
    console.log('🔍 [tasks/my] userId:', req.user.id, 'orgId:', organizationId, 'membership:', membershipId, 'teamMember:', teamMemberId);

    if (!membershipId && !teamMemberId) {
      console.log('⚠️ [tasks/my] No membership or teamMember found for user');
      return res.json([]);
    }

    // Query by BOTH ownerId (legacy TeamMember) AND membershipId (new Membership)
    const ors = [];
    if (teamMemberId) ors.push({ ownerId: teamMemberId });
    if (membershipId) ors.push({ membershipId: membershipId });

    const baseWhere = {
      organizationId,
      OR: ors,
      status: { not: 'CANCELLED' }
    };
    const scopedWhere = applyTeamReadScope(baseWhere, req);

    const tasks = await prisma.task.findMany({
      where: scopedWhere,
      include: {
        owner: {
          select: { id: true, name: true }
        },
        team: {
          select: { id: true, name: true }
        },
        story: {
          select: { 
            id: true, 
            title: true,
            rock: {
              select: { id: true, code: true, name: true }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // TODO first, then IN_PROGRESS, then DONE
        { priority: 'desc' },
        { dueDate: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    console.log('✅ [tasks/my] Found', tasks.length, 'tasks for membership/teamMember:', { membershipId, teamMemberId });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({ error: 'שגיאה בטעינת המשימות שלי' });
  }
});

/**
 * @route   GET /api/tasks/story/:storyId
 * @desc    Get tasks for a specific story (milestone)
 */
router.get('/story/:storyId', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const { storyId } = req.params;

    const baseWhere = { organizationId, storyId };
    const scopedWhere = applyTeamReadScope(baseWhere, req);

    const tasks = await prisma.task.findMany({
      where: scopedWhere,
      include: {
        owner: {
          select: { id: true, name: true }
        },
        team: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching story tasks:', error);
    res.status(500).json({ error: 'שגיאה בטעינת משימות אבן הדרך' });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const where = applyTeamReadScope(
      { id: req.params.id, organizationId },
      req
    );

    const task = await prisma.task.findFirst({
      where,
      include: {
        owner: {
          select: { id: true, name: true }
        },
        labels: {
          select: { label: { select: { id: true, name: true, color: true } } }
        },
        story: {
          select: { 
            id: true, 
            title: true,
            rock: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    res.json({
      ...task,
      labels: (task.labels || []).map((tl) => tl.label)
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'שגיאה בטעינת משימה' });
  }
});

/**
 * @route   POST /api/tasks/:id/labels
 * @desc    Replace labels set for a task (all authenticated)
 */
router.post('/:id/labels', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const labelIds = Array.isArray(req.body?.labelIds) ? req.body.labelIds : [];

    const task = await prisma.task.findFirst({
      where: applyTeamReadScope({ id: req.params.id, organizationId }, req),
      select: { id: true }
    });
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

    const validLabels = await prisma.label.findMany({
      where: { organizationId, isActive: true, id: { in: labelIds } },
      select: { id: true }
    });
    const validIds = new Set(validLabels.map((l) => l.id));
    const finalIds = labelIds.filter((id) => validIds.has(id));

    await prisma.taskLabel.deleteMany({ where: { taskId: task.id } });
    if (finalIds.length > 0) {
      await prisma.taskLabel.createMany({
        data: finalIds.map((labelId) => ({ taskId: task.id, labelId })),
        skipDuplicates: true
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating task labels:', error);
    res.status(500).json({ error: 'שגיאה בעדכון תוויות' });
  }
});

// ==================== POST ROUTES ====================

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const { code, title, description, storyId, ownerId, priority, dueDate, teamId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'כותרת המשימה היא שדה חובה' });
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'יש לבחור אחראי למשימה' });
    }

    // Determine teamId:
    // - If task is linked to a story, inherit its teamId
    // - Else use provided teamId or principal default
    let inheritedTeamId = null;
    if (storyId) {
      const story = await prisma.story.findFirst({
        where: { id: storyId, organizationId },
        select: { teamId: true }
      });
      inheritedTeamId = story?.teamId || null;
    }
    const validTeamId = inheritedTeamId || (await validateTeamId(organizationId, teamId)) || getDefaultTeamIdFromPrincipal(req);

    // Get creator's teamMemberId
    const creator = await prisma.teamMember.findFirst({
      where: {
        userId: req.user.id,
        organizationId
      }
    });

    // Get max sortOrder for this story (or standalone tasks)
    const maxOrder = await prisma.task.aggregate({
      where: {
        organizationId,
        storyId: storyId || null
      },
      _max: {
        sortOrder: true
      }
    });

    const task = await prisma.task.create({
      data: {
        code: code?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
        storyId: storyId || null,
        ownerId,
        createdById: creator?.id || null,
        teamId: validTeamId || null,
        organizationId,
        priority: priority || 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      },
      include: {
        owner: {
          select: { id: true, name: true }
        },
        story: {
          select: { id: true, title: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'שגיאה ביצירת משימה' });
  }
});

// ==================== PUT/PATCH ROUTES ====================

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 */
router.put('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const { code, title, description, storyId, ownerId, priority, dueDate, status, teamId } = req.body;

    // Check task exists and belongs to organization
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        organizationId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    const updateData = {};

    if (code !== undefined) updateData.code = code?.trim() || null;
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (storyId !== undefined) updateData.storyId = storyId || null;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (teamId !== undefined) {
      const validTeamId = teamId === '' ? null : (await validateTeamId(organizationId, teamId) || null);
      updateData.teamId = validTeamId;
    } else if (storyId !== undefined && storyId) {
      // If moving to a story, inherit that story's team unless explicitly overridden
      const story = await prisma.story.findFirst({
        where: { id: storyId, organizationId },
        select: { teamId: true }
      });
      if (story?.teamId) updateData.teamId = story.teamId;
    }
    if (status !== undefined) {
      updateData.status = status;
      // Set completedAt when marking as DONE
      if (status === 'DONE' && existingTask.status !== 'DONE') {
        updateData.completedAt = new Date();
      } else if (status !== 'DONE' && existingTask.status === 'DONE') {
        updateData.completedAt = null;
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true }
        },
        story: {
          select: { id: true, title: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'שגיאה בעדכון משימה' });
  }
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Quick status update (toggle)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const { status } = req.body;

    if (!status || !['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'סטטוס לא תקין' });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        organizationId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    const updateData = { status };

    // Set completedAt when marking as DONE
    if (status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (status !== 'DONE' && existingTask.status === 'DONE') {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'שגיאה בעדכון סטטוס' });
  }
});

/**
 * @route   PUT /api/tasks/reorder
 * @desc    Reorder tasks within a story
 */
router.put('/reorder', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const { taskIds } = req.body;

    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'רשימת משימות לא תקינה' });
    }

    // Update sortOrder for each task
    const updates = taskIds.map((id, index) =>
      prisma.task.updateMany({
        where: {
          id,
          organizationId
        },
        data: {
          sortOrder: index
        }
      })
    );

    await prisma.$transaction(updates);

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    res.status(500).json({ error: 'שגיאה בשינוי סדר משימות' });
  }
});

// ==================== DELETE ROUTES ====================

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 */
router.delete('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'לא נבחר ארגון' });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        organizationId
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    await prisma.task.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'משימה נמחקה בהצלחה' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'שגיאה במחיקת משימה' });
  }
});

module.exports = router;

