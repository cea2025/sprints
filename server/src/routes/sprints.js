const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/sprints
// @desc    Get all sprints with rocks and stats
router.get('/', async (req, res) => {
  try {
    const { state, yearOfRecord, quarter } = req.query;
    
    const where = {};
    if (state) where.state = state;

    const sprints = await prisma.sprint.findMany({
      where,
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        },
        stories: {
          select: {
            id: true,
            status: true,
            estimate: true
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
        done: sprint.stories.filter(s => s.status === 'DONE').length,
        totalPoints: sprint.stories.reduce((sum, s) => sum + (s.estimate || 0), 0),
        donePoints: sprint.stories
          .filter(s => s.status === 'DONE')
          .reduce((sum, s) => sum + (s.estimate || 0), 0)
      };
      
      // Extract rocks from sprintRocks
      const rocks = sprint.sprintRocks.map(sr => sr.rock);
      
      return {
        ...sprint,
        rocks,
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
    
    // First try to find by state ACTIVE
    let sprint = await prisma.sprint.findFirst({
      where: { state: 'ACTIVE' },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        },
        stories: {
          include: {
            owner: true,
            rock: true
          }
        }
      }
    });

    // If no active sprint, try by date
    if (!sprint) {
      sprint = await prisma.sprint.findFirst({
        where: {
          startDate: { lte: today },
          endDate: { gte: today }
        },
        include: {
          sprintRocks: {
            include: {
              rock: true
            }
          },
          stories: {
            include: {
              owner: true,
              rock: true
            }
          }
        }
      });
    }

    if (!sprint) {
      // Return next upcoming sprint if no current
      const nextSprint = await prisma.sprint.findFirst({
        where: {
          startDate: { gt: today }
        },
        orderBy: { startDate: 'asc' },
        include: {
          sprintRocks: {
            include: {
              rock: true
            }
          },
          stories: {
            include: {
              owner: true,
              rock: true
            }
          }
        }
      });
      
      if (nextSprint) {
        nextSprint.rocks = nextSprint.sprintRocks.map(sr => sr.rock);
      }
      return res.json(nextSprint || null);
    }

    sprint.rocks = sprint.sprintRocks.map(sr => sr.rock);
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
        sprintRocks: {
          include: {
            rock: true
          }
        },
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

    // Extract rocks from sprintRocks
    sprint.rocks = sprint.sprintRocks.map(sr => sr.rock);
    
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
    const { name, goal, startDate, endDate, capacityPoints, state, rockIds } = req.body;

    const sprint = await prisma.sprint.create({
      data: {
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        capacityPoints: capacityPoints ? parseInt(capacityPoints) : 0,
        state: state || 'PLANNED',
        // Create sprint-rock connections if rockIds provided
        sprintRocks: rockIds && rockIds.length > 0 ? {
          create: rockIds.map(rockId => ({ rockId }))
        } : undefined
      },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        }
      }
    });

    sprint.rocks = sprint.sprintRocks.map(sr => sr.rock);
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
    const { name, goal, startDate, endDate, capacityPoints, state, rockIds } = req.body;

    // Update sprint basic data
    const sprint = await prisma.sprint.update({
      where: { id: req.params.id },
      data: {
        name,
        goal,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        capacityPoints: capacityPoints !== undefined ? parseInt(capacityPoints) : undefined,
        state
      }
    });

    // If rockIds provided, update the relationships
    if (rockIds !== undefined) {
      // Delete existing relationships
      await prisma.sprintRock.deleteMany({
        where: { sprintId: req.params.id }
      });

      // Create new relationships
      if (rockIds && rockIds.length > 0) {
        await prisma.sprintRock.createMany({
          data: rockIds.map(rockId => ({
            sprintId: req.params.id,
            rockId
          }))
        });
      }
    }

    // Fetch updated sprint with rocks
    const updatedSprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        }
      }
    });

    updatedSprint.rocks = updatedSprint.sprintRocks.map(sr => sr.rock);
    res.json(updatedSprint);
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ error: 'Failed to update sprint' });
  }
});

// @route   POST /api/sprints/:id/rocks
// @desc    Add rocks to a sprint
router.post('/:id/rocks', async (req, res) => {
  try {
    const { rockIds } = req.body;

    if (!rockIds || !Array.isArray(rockIds)) {
      return res.status(400).json({ error: 'rockIds array is required' });
    }

    // Create connections (ignore duplicates)
    for (const rockId of rockIds) {
      await prisma.sprintRock.upsert({
        where: {
          sprintId_rockId: {
            sprintId: req.params.id,
            rockId
          }
        },
        create: {
          sprintId: req.params.id,
          rockId
        },
        update: {}
      });
    }

    // Fetch updated sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        }
      }
    });

    sprint.rocks = sprint.sprintRocks.map(sr => sr.rock);
    res.json(sprint);
  } catch (error) {
    console.error('Error adding rocks to sprint:', error);
    res.status(500).json({ error: 'Failed to add rocks to sprint' });
  }
});

// @route   DELETE /api/sprints/:id/rocks/:rockId
// @desc    Remove a rock from a sprint
router.delete('/:id/rocks/:rockId', async (req, res) => {
  try {
    await prisma.sprintRock.delete({
      where: {
        sprintId_rockId: {
          sprintId: req.params.id,
          rockId: req.params.rockId
        }
      }
    });

    res.json({ message: 'Rock removed from sprint' });
  } catch (error) {
    console.error('Error removing rock from sprint:', error);
    res.status(500).json({ error: 'Failed to remove rock from sprint' });
  }
});

// @route   POST /api/sprints/:id/close
// @desc    Close a sprint
router.post('/:id/close', async (req, res) => {
  try {
    const sprint = await prisma.sprint.update({
      where: { id: req.params.id },
      data: { state: 'CLOSED' },
      include: {
        sprintRocks: {
          include: {
            rock: true
          }
        },
        stories: true
      }
    });

    sprint.rocks = sprint.sprintRocks.map(sr => sr.rock);
    res.json(sprint);
  } catch (error) {
    console.error('Error closing sprint:', error);
    res.status(500).json({ error: 'Failed to close sprint' });
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
