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

// @route   GET /api/objectives
// @desc    Get all objectives with rocks and progress
// @query   sortBy (createdAt|updatedAt|code), sortOrder (asc|desc), dateFrom, dateTo
router.get('/', async (req, res) => {
  try {
    const { orphanFilter, sortBy, sortOrder, dateFrom, dateTo } = req.query;
    const organizationId = await getOrganizationId(req);
    
    const where = {};
    if (organizationId) where.organizationId = organizationId;
    
    // Orphan filter: objectives without rocks
    if (orphanFilter === 'no-rocks') {
      where.rocks = { none: {} };
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
      orderBy = { createdAt: order };
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: order };
    } else if (sortBy === 'code') {
      orderBy = { code: order };
    } else {
      // Default: newest first
      orderBy = { createdAt: 'desc' };
    }

    const scopedWhere = applyTeamReadScope(where, req);

    const objectives = await prisma.objective.findMany({
      where: scopedWhere,
      include: {
        owner: true,
        rocks: {
          select: {
            id: true,
            progress: true
          }
        }
      },
      orderBy
    });

    // Calculate progress for each objective
    const objectivesWithProgress = objectives.map(obj => {
      let totalProgress = 0;
      const rocksArray = obj.rocks || [];
      if (rocksArray.length > 0) {
        totalProgress = Math.round(
          rocksArray.reduce((sum, rock) => sum + (rock.progress || 0), 0) / rocksArray.length
        );
      }
      
      return {
        ...obj,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        rocksCount: rocksArray.length,
        progress: totalProgress
      };
    });

    res.json(objectivesWithProgress);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    // Return empty array on error so frontend doesn't crash
    res.status(500).json([]);
  }
});

// @route   GET /api/objectives/:id
// @desc    Get single objective
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const where = applyTeamReadScope({ id: req.params.id, organizationId }, req);

    const objective = await prisma.objective.findFirst({
      where,
      include: {
        owner: true,
        rocks: {
          include: {
            owner: true,
            stories: true
          }
        }
      }
    });

    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }

    res.json(objective);
  } catch (error) {
    console.error('Error fetching objective:', error);
    res.status(500).json({ error: 'Failed to fetch objective' });
  }
});

// @route   POST /api/objectives
// @desc    Create a new objective
router.post('/', auditMiddleware('Objective'), async (req, res) => {
  try {
    const { code, name, description, ownerId, teamId } = req.body;
    const organizationId = await getOrganizationId(req);
    const validTeamId = await validateTeamId(organizationId, teamId) || getDefaultTeamIdFromPrincipal(req);

    const objective = await prisma.objective.create({
      data: {
        code,
        name,
        description,
        ownerId: ownerId || null,
        teamId: validTeamId || null,
        organizationId,
        createdBy: req.user.id
      },
      include: {
        owner: true
      }
    });

    res.status(201).json(objective);
  } catch (error) {
    console.error('Error creating objective:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'קוד פרויקט כבר קיים' });
    }
    res.status(500).json({ error: 'Failed to create objective: ' + error.message });
  }
});

// @route   PUT /api/objectives/:id
// @desc    Update an objective
router.put('/:id', captureOldEntity(prisma.objective), auditMiddleware('Objective'), async (req, res) => {
  try {
    const { code, name, description, ownerId, teamId } = req.body;
    const organizationId = await getOrganizationId(req);
    const validTeamId = teamId === '' ? null : (await validateTeamId(organizationId, teamId) || null);

    const objective = await prisma.objective.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        ownerId: ownerId || null,
        teamId: teamId !== undefined ? validTeamId : undefined,
        updatedBy: req.user.id
      },
      include: {
        owner: true
      }
    });

    res.json(objective);
  } catch (error) {
    console.error('Error updating objective:', error);
    res.status(500).json({ error: 'Failed to update objective' });
  }
});

// @route   DELETE /api/objectives/:id
// @desc    Delete an objective (rocks become orphaned)
router.delete('/:id', captureOldEntity(prisma.objective), auditMiddleware('Objective'), async (req, res) => {
  try {
    // Count affected rocks
    const rocksCount = await prisma.rock.count({
      where: { objectiveId: req.params.id }
    });

    // Rocks will be automatically unlinked due to onDelete: SetNull
    await prisma.objective.delete({
      where: { id: req.params.id }
    });

    const message = rocksCount > 0 
      ? `פרויקט נמחק. ${rocksCount} סלעים עברו ל"סלעים ללא פרויקט"`
      : 'פרויקט נמחק בהצלחה';

    res.json({ message, affectedRocks: rocksCount });
  } catch (error) {
    console.error('Error deleting objective:', error);
    res.status(500).json({ error: 'שגיאה במחיקת הפרויקט' });
  }
});

module.exports = router;
