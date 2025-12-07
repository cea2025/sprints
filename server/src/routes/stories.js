const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/stories
// @desc    Get all stories
router.get('/', async (req, res) => {
  try {
    const { sprintId, rockId, ownerId, isBlocked } = req.query;
    
    const where = {};
    if (sprintId) where.sprintId = sprintId;
    if (rockId) where.rockId = rockId;
    if (ownerId) where.ownerId = ownerId;
    if (isBlocked !== undefined) where.isBlocked = isBlocked === 'true';

    const stories = await prisma.story.findMany({
      where,
      include: {
        sprint: true,
        rock: {
          include: {
            objective: true
          }
        },
        owner: true
      },
      orderBy: { createdAt: 'desc' }
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
    const story = await prisma.story.findUnique({
      where: { id: req.params.id },
      include: {
        sprint: true,
        rock: {
          include: {
            objective: true
          }
        },
        owner: true
      }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// @route   POST /api/stories
// @desc    Create a new story
router.post('/', async (req, res) => {
  try {
    const { title, description, progress, isBlocked, sprintId, rockId, ownerId } = req.body;

    // Validate required fields
    if (!sprintId) {
      return res.status(400).json({ error: 'ספרינט הוא שדה חובה' });
    }
    if (!ownerId) {
      return res.status(400).json({ error: 'אחראי הוא שדה חובה' });
    }

    const story = await prisma.story.create({
      data: {
        title,
        description,
        progress: progress ? parseInt(progress) : 0,
        isBlocked: isBlocked || false,
        sprintId,
        rockId: rockId || null,
        ownerId
      },
      include: {
        sprint: true,
        rock: {
          include: {
            objective: true
          }
        },
        owner: true
      }
    });

    res.status(201).json(story);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// @route   PUT /api/stories/:id
// @desc    Update a story
router.put('/:id', async (req, res) => {
  try {
    const { title, description, progress, isBlocked, sprintId, rockId, ownerId } = req.body;

    // Validate required fields
    if (sprintId === '') {
      return res.status(400).json({ error: 'ספרינט הוא שדה חובה' });
    }
    if (ownerId === '') {
      return res.status(400).json({ error: 'אחראי הוא שדה חובה' });
    }

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        progress: progress !== undefined ? Math.min(100, Math.max(0, parseInt(progress) || 0)) : undefined,
        isBlocked: isBlocked !== undefined ? isBlocked : undefined,
        sprintId: sprintId || undefined,
        rockId: rockId || null,
        ownerId: ownerId || undefined
      },
      include: {
        sprint: true,
        rock: {
          include: {
            objective: true
          }
        },
        owner: true
      }
    });

    res.json(story);
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// @route   PUT /api/stories/:id/progress
// @desc    Quick update for story progress
router.put('/:id/progress', async (req, res) => {
  try {
    const { progress, isBlocked } = req.body;

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        progress: progress !== undefined ? Math.min(100, Math.max(0, parseInt(progress) || 0)) : undefined,
        isBlocked: isBlocked !== undefined ? isBlocked : undefined
      },
      include: {
        sprint: true,
        rock: {
          include: {
            objective: true
          }
        },
        owner: true
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
      where: { id: req.params.id }
    });

    if (!current) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        isBlocked: !current.isBlocked
      },
      include: {
        sprint: true,
        rock: true,
        owner: true
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
router.delete('/:id', async (req, res) => {
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
