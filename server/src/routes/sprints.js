const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/sprints
// @desc    Get all sprints
router.get('/', async (req, res) => {
  try {
    const sprints = await prisma.sprint.findMany({
      include: {
        mainRock: true,
        stories: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    // Add stats to each sprint
    const sprintsWithStats = sprints.map(sprint => {
      const stats = {
        total: sprint.stories.length,
        todo: sprint.stories.filter(s => s.status === 'TODO').length,
        inProgress: sprint.stories.filter(s => s.status === 'IN_PROGRESS').length,
        blocked: sprint.stories.filter(s => s.status === 'BLOCKED').length,
        done: sprint.stories.filter(s => s.status === 'DONE').length
      };
      
      return {
        ...sprint,
        stats
      };
    });

    res.json(sprintsWithStats);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

// @route   GET /api/sprints/current
// @desc    Get current active sprint
router.get('/current', async (req, res) => {
  try {
    const today = new Date();
    
    const sprint = await prisma.sprint.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        mainRock: true,
        stories: {
          include: {
            owner: true,
            rock: true
          }
        }
      }
    });

    if (!sprint) {
      // Return next upcoming sprint if no current
      const nextSprint = await prisma.sprint.findFirst({
        where: {
          startDate: { gt: today }
        },
        orderBy: { startDate: 'asc' },
        include: {
          mainRock: true,
          stories: {
            include: {
              owner: true,
              rock: true
            }
          }
        }
      });
      
      return res.json(nextSprint || null);
    }

    res.json(sprint);
  } catch (error) {
    console.error('Error fetching current sprint:', error);
    res.status(500).json({ error: 'Failed to fetch current sprint' });
  }
});

// @route   GET /api/sprints/:id
// @desc    Get single sprint with stories
router.get('/:id', async (req, res) => {
  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: {
        mainRock: true,
        stories: {
          include: {
            owner: true,
            rock: true
          },
          orderBy: [
            { status: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    res.json(sprint);
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ error: 'Failed to fetch sprint' });
  }
});

// @route   POST /api/sprints
// @desc    Create a new sprint
router.post('/', async (req, res) => {
  try {
    const { name, goal, startDate, endDate, mainRockId } = req.body;

    const sprint = await prisma.sprint.create({
      data: {
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        mainRockId
      },
      include: {
        mainRock: true
      }
    });

    res.status(201).json(sprint);
  } catch (error) {
    console.error('Error creating sprint:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Sprint name already exists' });
    }
    res.status(500).json({ error: 'Failed to create sprint' });
  }
});

// @route   PUT /api/sprints/:id
// @desc    Update a sprint
router.put('/:id', async (req, res) => {
  try {
    const { name, goal, startDate, endDate, mainRockId } = req.body;

    const sprint = await prisma.sprint.update({
      where: { id: req.params.id },
      data: {
        name,
        goal,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        mainRockId
      },
      include: {
        mainRock: true
      }
    });

    res.json(sprint);
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ error: 'Failed to update sprint' });
  }
});

// @route   DELETE /api/sprints/:id
// @desc    Delete a sprint
router.delete('/:id', async (req, res) => {
  try {
    await prisma.sprint.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Sprint deleted successfully' });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({ error: 'Failed to delete sprint' });
  }
});

module.exports = router;
