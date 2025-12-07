const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/rocks
// @desc    Get all rocks with progress calculation
router.get('/', async (req, res) => {
  try {
    const { yearOfRecord, currentQuarter, status, objectiveId } = req.query;
    
    const where = {};
    if (yearOfRecord) where.yearOfRecord = parseInt(yearOfRecord);
    if (currentQuarter) where.currentQuarter = parseInt(currentQuarter);
    if (status) where.status = status;
    if (objectiveId) where.objectiveId = objectiveId;

    const rocks = await prisma.rock.findMany({
      where,
      include: {
        owner: true,
        objective: true,
        stories: {
          select: {
            id: true,
            status: true,
            estimate: true
          }
        },
        sprintRocks: {
          include: {
            sprint: true
          }
        }
      },
      orderBy: [
        { yearOfRecord: 'desc' },
        { currentQuarter: 'desc' },
        { code: 'asc' }
      ]
    });

    // Add progress calculation based on points
    const rocksWithProgress = rocks.map(rock => {
      const donePoints = rock.stories
        .filter(s => s.status === 'DONE')
        .reduce((sum, s) => sum + (s.estimate || 0), 0);
      
      const totalStories = rock.stories.length;
      const doneStories = rock.stories.filter(s => s.status === 'DONE').length;
      const progress = rock.committedPoints > 0 
        ? Math.round((donePoints / rock.committedPoints) * 100) 
        : 0;
      
      return {
        ...rock,
        donePoints,
        progress,
        totalStories,
        doneStories
      };
    });

    res.json(rocksWithProgress);
  } catch (error) {
    console.error('Error fetching rocks:', error);
    res.status(500).json({ error: 'Failed to fetch rocks' });
  }
});

// @route   GET /api/rocks/:id
// @desc    Get single rock with all details
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
        },
        sprintRocks: {
          include: {
            sprint: true
          }
        },
        quarterLogs: {
          orderBy: [
            { year: 'desc' },
            { quarter: 'desc' }
          ]
        }
      }
    });

    if (!rock) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    // Calculate done points
    const donePoints = rock.stories
      .filter(s => s.status === 'DONE')
      .reduce((sum, s) => sum + (s.estimate || 0), 0);

    res.json({ ...rock, donePoints });
  } catch (error) {
    console.error('Error fetching rock:', error);
    res.status(500).json({ error: 'Failed to fetch rock' });
  }
});

// @route   POST /api/rocks
// @desc    Create a new rock
router.post('/', async (req, res) => {
  try {
    const { 
      code, name, description, status,
      yearOfRecord, originalQuarter, currentQuarter,
      committedPoints, health, ownerId, objectiveId 
    } = req.body;

    const rock = await prisma.rock.create({
      data: {
        code,
        name,
        description,
        status: status || 'PLANNED',
        yearOfRecord: parseInt(yearOfRecord),
        originalQuarter: parseInt(originalQuarter),
        currentQuarter: currentQuarter ? parseInt(currentQuarter) : parseInt(originalQuarter),
        committedPoints: committedPoints ? parseInt(committedPoints) : 0,
        health: health || 'GREEN',
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
    const { 
      code, name, description, status,
      yearOfRecord, originalQuarter, currentQuarter,
      committedPoints, health, ownerId, objectiveId 
    } = req.body;

    const rock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        status,
        yearOfRecord: yearOfRecord ? parseInt(yearOfRecord) : undefined,
        originalQuarter: originalQuarter ? parseInt(originalQuarter) : undefined,
        currentQuarter: currentQuarter ? parseInt(currentQuarter) : undefined,
        committedPoints: committedPoints !== undefined ? parseInt(committedPoints) : undefined,
        health,
        ownerId: ownerId || null,
        objectiveId: objectiveId || null
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
// @desc    Carry over a rock to the next quarter
router.post('/:id/carry-over', async (req, res) => {
  try {
    const rock = await prisma.rock.findUnique({
      where: { id: req.params.id },
      include: {
        stories: {
          where: { status: 'DONE' },
          select: { estimate: true }
        }
      }
    });

    if (!rock) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    const donePoints = rock.stories.reduce((sum, s) => sum + (s.estimate || 0), 0);
    
    // Log the current quarter
    await prisma.rockQuarterLog.create({
      data: {
        rockId: rock.id,
        year: rock.yearOfRecord,
        quarter: rock.currentQuarter,
        committedPoints: rock.committedPoints,
        donePoints,
        wasCarryOver: rock.currentQuarter !== rock.originalQuarter
      }
    });

    // Calculate next quarter
    let nextQuarter = rock.currentQuarter + 1;
    let nextYear = rock.yearOfRecord;
    if (nextQuarter > 4) {
      nextQuarter = 1;
      nextYear++;
    }

    // Update rock to next quarter
    const updatedRock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        currentQuarter: nextQuarter,
        committedPoints: rock.committedPoints - donePoints, // Remaining points
        health: 'YELLOW' // Mark as at risk since it carried over
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
