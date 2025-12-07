const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/stories
// @desc    Get all stories with filters
router.get('/', async (req, res) => {
  try {
    const { sprintId, rockId, ownerId, status, priority } = req.query;
    
    const where = {};
    if (sprintId) where.sprintId = sprintId;
    if (rockId) where.rockId = rockId;
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const stories = await prisma.story.findMany({
      where,
      include: {
        owner: true,
        sprint: true,
        rock: {
          include: {
            objective: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// @route   GET /api/stories/:id
// @desc    Get single story
router.get('/:id', async (req, res) => {
  try {
    const story = await prisma.story.findUnique({
      where: { id: req.params.id },
      include: {
        owner: true,
        sprint: true,
        rock: true
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
    const { title, description, status, priority, estimate, sprintId, rockId, ownerId } = req.body;

    const story = await prisma.story.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        estimate: estimate ? parseInt(estimate) : null,
        sprintId: sprintId || null,    // Convert empty string to null
        rockId: rockId || null,        // Convert empty string to null
        ownerId: ownerId || null       // Convert empty string to null
      },
      include: {
        owner: true,
        sprint: true,
        rock: true
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
    const { title, description, status, priority, estimate, sprintId, rockId, ownerId } = req.body;

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        status,
        priority,
        estimate: estimate !== undefined ? (estimate ? parseInt(estimate) : null) : undefined,
        sprintId: sprintId || null,    // Convert empty string to null
        rockId: rockId || null,        // Convert empty string to null
        ownerId: ownerId || null       // Convert empty string to null
      },
      include: {
        owner: true,
        sprint: true,
        rock: true
      }
    });

    res.json(story);
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// @route   PATCH /api/stories/:id/status
// @desc    Quick status update
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const story = await prisma.story.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        owner: true,
        sprint: true,
        rock: true
      }
    });

    res.json(story);
  } catch (error) {
    console.error('Error updating story status:', error);
    res.status(500).json({ error: 'Failed to update story status' });
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
