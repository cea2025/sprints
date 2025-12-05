const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/rocks
// @desc    Get all rocks
router.get('/', async (req, res) => {
  try {
    const { year, quarter, status } = req.query;
    
    const where = {};
    if (year) where.year = parseInt(year);
    if (quarter) where.quarter = parseInt(quarter);
    if (status) where.status = status;

    const rocks = await prisma.rock.findMany({
      where,
      include: {
        owner: true,
        stories: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { quarter: 'desc' },
        { code: 'asc' }
      ]
    });

    // Add progress calculation
    const rocksWithProgress = rocks.map(rock => {
      const totalStories = rock.stories.length;
      const doneStories = rock.stories.filter(s => s.status === 'DONE').length;
      const progress = totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0;
      
      return {
        ...rock,
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
// @desc    Get single rock with stories
router.get('/:id', async (req, res) => {
  try {
    const rock = await prisma.rock.findUnique({
      where: { id: req.params.id },
      include: {
        owner: true,
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
    const { code, name, description, year, quarter, status, ownerId } = req.body;

    const rock = await prisma.rock.create({
      data: {
        code,
        name,
        description,
        year: parseInt(year),
        quarter: parseInt(quarter),
        status: status || 'PLANNED',
        ownerId
      },
      include: {
        owner: true
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
    const { code, name, description, year, quarter, status, ownerId } = req.body;

    const rock = await prisma.rock.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        year: year ? parseInt(year) : undefined,
        quarter: quarter ? parseInt(quarter) : undefined,
        status,
        ownerId
      },
      include: {
        owner: true
      }
    });

    res.json(rock);
  } catch (error) {
    console.error('Error updating rock:', error);
    res.status(500).json({ error: 'Failed to update rock' });
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
