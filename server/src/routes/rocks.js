const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/rocks
// @desc    Get all rocks with progress
router.get('/', async (req, res) => {
  try {
    const { year, quarter, objectiveId } = req.query;
    
    const where = {};
    if (year) where.year = parseInt(year);
    if (quarter) where.quarter = parseInt(quarter);
    if (objectiveId) where.objectiveId = objectiveId;

    const rocks = await prisma.rock.findMany({
      where,
      include: {
        owner: true,
        objective: true,
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
        { code: 'asc' }
      ]
    });

    // Calculate progress from stories if not set manually
    const rocksWithProgress = rocks.map(rock => {
      let calculatedProgress = 0;
      if (rock.stories.length > 0) {
        calculatedProgress = Math.round(
          rock.stories.reduce((sum, s) => sum + (s.progress || 0), 0) / rock.stories.length
        );
      }
      
      return {
        ...rock,
        calculatedProgress,
        // Use manual progress if set, otherwise calculated
        effectiveProgress: rock.progress > 0 ? rock.progress : calculatedProgress,
        totalStories: rock.stories.length,
        completedStories: rock.stories.filter(s => s.progress === 100).length,
        blockedStories: rock.stories.filter(s => s.isBlocked).length
      };
    });

    res.json(rocksWithProgress);
  } catch (error) {
    console.error('Error fetching rocks:', error);
    res.status(500).json({ error: 'Failed to fetch rocks' });
  }
});

// @route   GET /api/rocks/:id
// @desc    Get single rock
router.get('/:id', async (req, res) => {
  try {
    const rock = await prisma.rock.findUnique({
      where: { id: req.params.id },
      include: {
        owner: true,
        objective: true,
        stories: {
          include: {
            owner: true,
            sprint: true
          },
          orderBy: { createdAt: 'desc' }
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
router.post('/', async (req, res) => {
  try {
    const { code, name, description, year, quarter, progress, ownerId, objectiveId } = req.body;

    const rock = await prisma.rock.create({
      data: {
        code,
        name,
        description,
        year: parseInt(year),
        quarter: parseInt(quarter),
        progress: progress ? parseInt(progress) : 0,
        ownerId: ownerId || null,
        objectiveId: objectiveId || null
      },
      include: {
        owner: true,
        objective: true
      }
    });

    res.status(201).json(rock);
  } catch (error) {
    console.error('Error creating rock:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Rock code already exists' });
    }
    res.status(500).json({ error: 'Failed to create rock' });
  }
});

// @route   PUT /api/rocks/:id
// @desc    Update a rock
router.put('/:id', async (req, res) => {
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
        carriedFromQuarter: carriedFromQuarter ? parseInt(carriedFromQuarter) : null
      },
      include: {
        owner: true,
        objective: true
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
      where: { id: req.params.id }
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
        carriedFromQuarter: currentQuarter
      },
      include: {
        owner: true,
        objective: true
      }
    });

    res.json(updatedRock);
  } catch (error) {
    console.error('Error carrying over rock:', error);
    res.status(500).json({ error: 'Failed to carry over rock' });
  }
});

// @route   PUT /api/rocks/:id/progress
// @desc    Update rock progress
router.put('/:id/progress', async (req, res) => {
  try {
    const { progress } = req.body;

    const rock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        progress: Math.min(100, Math.max(0, parseInt(progress) || 0))
      },
      include: {
        owner: true,
        objective: true
      }
    });

    res.json(rock);
  } catch (error) {
    console.error('Error updating rock progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// @route   DELETE /api/rocks/:id
// @desc    Delete a rock
router.delete('/:id', async (req, res) => {
  try {
    await prisma.rock.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Rock deleted successfully' });
  } catch (error) {
    console.error('Error deleting rock:', error);
    res.status(500).json({ error: 'Failed to delete rock' });
  }
});

module.exports = router;
