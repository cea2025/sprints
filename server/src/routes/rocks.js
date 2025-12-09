const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { auditMiddleware, captureOldEntity } = require('../modules/audit/audit.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/rocks
// @desc    Get all rocks with progress (optimized with search)
router.get('/', async (req, res) => {
  try {
    const { year, quarter, objectiveId, orphanFilter, search, page = 1, limit = 50 } = req.query;
    const organizationId = await getOrganizationId(req);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (organizationId) where.organizationId = organizationId;
    if (year) where.year = parseInt(year);
    if (quarter) where.quarter = parseInt(quarter);
    if (objectiveId) where.objectiveId = objectiveId;
    
    // Orphan filters
    if (orphanFilter === 'no-objective') {
      where.objectiveId = null;
    } else if (orphanFilter === 'no-stories') {
      where.stories = { none: {} };
    }
    
    // Server-side search
    if (search && search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const rocks = await prisma.rock.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        year: true,
        quarter: true,
        progress: true,
        isCarriedOver: true,
        carriedFromQuarter: true,
        owner: {
          select: { id: true, name: true }
        },
        objective: {
          select: { id: true, code: true, name: true }
        },
        _count: {
          select: { stories: true }
        },
        stories: {
          select: {
            progress: true,
            isBlocked: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { quarter: 'desc' },
        { code: 'asc' }
      ],
      skip,
      take: parseInt(limit)
    });

    // Calculate progress from stories if not set manually
    const rocksWithProgress = rocks.map(rock => {
      let calculatedProgress = 0;
      const storiesArray = rock.stories || [];
      if (storiesArray.length > 0) {
        calculatedProgress = Math.round(
          storiesArray.reduce((sum, s) => sum + (s.progress || 0), 0) / storiesArray.length
        );
      }
      
      return {
        id: rock.id,
        code: rock.code,
        name: rock.name,
        description: rock.description,
        year: rock.year,
        quarter: rock.quarter,
        progress: rock.progress,
        isCarriedOver: rock.isCarriedOver,
        carriedFromQuarter: rock.carriedFromQuarter,
        owner: rock.owner,
        objective: rock.objective,
        calculatedProgress,
        effectiveProgress: rock.progress > 0 ? rock.progress : calculatedProgress,
        totalStories: rock._count.stories,
        completedStories: storiesArray.filter(s => s.progress === 100).length,
        blockedStories: storiesArray.filter(s => s.isBlocked).length
      };
    });

    res.json(rocksWithProgress);
  } catch (error) {
    console.error('Error fetching rocks:', error);
    res.status(500).json([]);
  }
});

// @route   GET /api/rocks/simple
// @desc    Get rocks with minimal data (for dropdowns)
router.get('/simple', async (req, res) => {
  try {
    const { year, quarter } = req.query;
    const organizationId = await getOrganizationId(req);
    
    const where = {};
    if (organizationId) where.organizationId = organizationId;
    if (year) where.year = parseInt(year);
    if (quarter) where.quarter = parseInt(quarter);

    const rocks = await prisma.rock.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true
      },
      orderBy: { code: 'asc' },
      take: 200
    });

    res.json(rocks);
  } catch (error) {
    console.error('Error fetching rocks:', error);
    res.status(500).json([]);
  }
});

// @route   GET /api/rocks/:id
// @desc    Get single rock
router.get('/:id', async (req, res) => {
  try {
    const rock = await prisma.rock.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true } },
        objective: { select: { id: true, code: true, name: true } },
        stories: {
          select: {
            id: true,
            title: true,
            progress: true,
            isBlocked: true,
            owner: { select: { id: true, name: true } },
            sprint: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!rock) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    res.json(rock);
  } catch (error) {
    console.error('Error fetching rock:', error);
    res.status(500).json({ error: 'Failed to fetch rock' });
  }
});

// @route   POST /api/rocks
// @desc    Create a new rock
router.post('/', auditMiddleware('Rock'), async (req, res) => {
  try {
    const { code, name, description, year, quarter, progress, ownerId, objectiveId } = req.body;
    const organizationId = await getOrganizationId(req);

    const rock = await prisma.rock.create({
      data: {
        code,
        name,
        description,
        year: parseInt(year),
        quarter: parseInt(quarter),
        progress: progress ? parseInt(progress) : 0,
        ownerId: ownerId || null,
        objectiveId: objectiveId || null,
        organizationId,
        createdBy: req.user.id
      },
      select: {
        id: true,
        code: true,
        name: true,
        year: true,
        quarter: true,
        progress: true,
        owner: { select: { id: true, name: true } },
        objective: { select: { id: true, code: true, name: true } }
      }
    });

    res.status(201).json(rock);
  } catch (error) {
    console.error('Error creating rock:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'קוד הסלע כבר קיים' });
    }
    res.status(500).json({ error: 'Failed to create rock: ' + error.message });
  }
});

// @route   PUT /api/rocks/:id
// @desc    Update a rock
router.put('/:id', captureOldEntity(prisma.rock), auditMiddleware('Rock'), async (req, res) => {
  try {
    const { code, name, description, year, quarter, progress, ownerId, objectiveId, isCarriedOver, carriedFromQuarter } = req.body;

    const rock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        year: year ? parseInt(year) : undefined,
        quarter: quarter ? parseInt(quarter) : undefined,
        progress: progress !== undefined ? parseInt(progress) : undefined,
        ownerId: ownerId || null,
        objectiveId: objectiveId || null,
        isCarriedOver: isCarriedOver !== undefined ? isCarriedOver : undefined,
        carriedFromQuarter: carriedFromQuarter ? parseInt(carriedFromQuarter) : null,
        updatedBy: req.user.id
      },
      select: {
        id: true,
        code: true,
        name: true,
        year: true,
        quarter: true,
        progress: true,
        owner: { select: { id: true, name: true } },
        objective: { select: { id: true, code: true, name: true } }
      }
    });

    res.json(rock);
  } catch (error) {
    console.error('Error updating rock:', error);
    res.status(500).json({ error: 'Failed to update rock' });
  }
});

// @route   POST /api/rocks/:id/carry-over
// @desc    Carry over a rock to next quarter
router.post('/:id/carry-over', async (req, res) => {
  try {
    const rock = await prisma.rock.findUnique({
      where: { id: req.params.id },
      select: { quarter: true, year: true }
    });

    if (!rock) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    const currentQuarter = rock.quarter;
    let nextQuarter = currentQuarter + 1;
    let nextYear = rock.year;
    
    if (nextQuarter > 4) {
      nextQuarter = 1;
      nextYear++;
    }

    const updatedRock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        quarter: nextQuarter,
        year: nextYear,
        isCarriedOver: true,
        carriedFromQuarter: currentQuarter,
        updatedBy: req.user.id
      },
      select: {
        id: true,
        code: true,
        name: true,
        year: true,
        quarter: true,
        isCarriedOver: true,
        carriedFromQuarter: true
      }
    });

    res.json(updatedRock);
  } catch (error) {
    console.error('Error carrying over rock:', error);
    res.status(500).json({ error: 'Failed to carry over rock' });
  }
});

// @route   PUT /api/rocks/:id/progress
// @desc    Update rock progress (optimized - minimal data)
router.put('/:id/progress', async (req, res) => {
  try {
    const { progress } = req.body;

    const rock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        progress: Math.min(100, Math.max(0, parseInt(progress) || 0)),
        updatedBy: req.user.id
      },
      select: {
        id: true,
        progress: true
      }
    });

    res.json(rock);
  } catch (error) {
    console.error('Error updating rock progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// @route   DELETE /api/rocks/:id
// @desc    Delete a rock (stories become orphaned)
router.delete('/:id', captureOldEntity(prisma.rock), auditMiddleware('Rock'), async (req, res) => {
  try {
    // Count affected stories
    const storiesCount = await prisma.story.count({
      where: { rockId: req.params.id }
    });

    // Stories will be automatically unlinked due to onDelete: SetNull
    await prisma.rock.delete({
      where: { id: req.params.id }
    });

    const message = storiesCount > 0 
      ? `סלע נמחק. ${storiesCount} אבני דרך עברו ל"אבני דרך ללא סלע"`
      : 'סלע נמחק בהצלחה';

    res.json({ message, affectedStories: storiesCount });
  } catch (error) {
    console.error('Error deleting rock:', error);
    res.status(500).json({ error: 'שגיאה במחיקת הסלע' });
  }
});

module.exports = router;
