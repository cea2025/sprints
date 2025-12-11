/**
 * Tasks Routes
 * API endpoints לניהול משימות
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');

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

    const { status, ownerId, storyId, standalone, sortBy, sortOrder, dateFrom, dateTo } = req.query;

    const where = { organizationId };

    if (status) {
      where.status = status;
    }

    if (ownerId) {
      where.ownerId = ownerId;
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

    // Build orderBy based on sortBy parameter
    let orderBy;
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    if (sortBy === 'createdAt') {
      orderBy = [{ createdAt: order }];
    } else if (sortBy === 'updatedAt') {
      orderBy = [{ updatedAt: order }];
    } else if (sortBy === 'dueDate') {
      orderBy = [{ dueDate: order }, { createdAt: 'desc' }];
    } else {
      // Default: grouped by story, then sortOrder, then newest
      orderBy = [{ storyId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        owner: {
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
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy
    });

    res.json(tasks);
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
    let membership = await prisma.membership.findFirst({
      where: {
        userId: req.user.id,
        organizationId
      }
    });
    
    // Fallback to legacy TeamMember if no Membership found
    let teamMember = null;
    if (!membership) {
      teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: req.user.id,
          organizationId
        }
      });
    }

    const memberId = membership?.id || teamMember?.id;
    console.log('🔍 [tasks/my] userId:', req.user.id, 'orgId:', organizationId, 'membership:', membership?.id, 'teamMember:', teamMember?.id);

    if (!memberId) {
      console.log('⚠️ [tasks/my] No membership or teamMember found for user');
      return res.json([]);
    }

    // Query by BOTH ownerId (legacy) AND membershipId (new)
    const tasks = await prisma.task.findMany({
      where: {
        organizationId,
        OR: [
          { ownerId: memberId },
          { membershipId: memberId }
        ],
        status: { not: 'CANCELLED' }
      },
      include: {
        owner: {
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

    console.log('✅ [tasks/my] Found', tasks.length, 'tasks for member:', memberId);
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

    const tasks = await prisma.task.findMany({
      where: {
        organizationId,
        storyId
      },
      include: {
        owner: {
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

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        organizationId
      },
      include: {
        owner: {
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
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'שגיאה בטעינת משימה' });
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

    const { code, title, description, storyId, ownerId, priority, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'כותרת המשימה היא שדה חובה' });
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'יש לבחור אחראי למשימה' });
    }

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

    const { code, title, description, storyId, ownerId, priority, dueDate, status } = req.body;

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

