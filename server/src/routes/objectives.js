const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/objectives
// @desc    Get all objectives with rocks count and progress
router.get('/', async (req, res) => {
  try {
    const objectives = await prisma.objective.findMany({
      include: {
        owner: true,
        rocks: {
          include: {
            stories: {
              where: { status: 'DONE' },
              select: { estimate: true }
            }
          }
        }
      },
      orderBy: [
        { timeframe: 'desc' },
        { code: 'asc' }
      ]
    });

    // Calculate progress for each objective
    const objectivesWithProgress = objectives.map(obj => {
      const totalCommitted = obj.rocks.reduce((sum, rock) => sum + rock.committedPoints, 0);
      const totalDone = obj.rocks.reduce((sum, rock) => {
        return sum + rock.stories.reduce((s, story) => s + (story.estimate || 0), 0);
      }, 0);
      
      return {
        ...obj,
        rocksCount: obj.rocks.length,
        totalCommittedPoints: totalCommitted,
        totalDonePoints: totalDone,
        progress: totalCommitted > 0 ? Math.round((totalDone / totalCommitted) * 100) : 0
      };
    });

    res.json(objectivesWithProgress);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    res.status(500).json({ error: 'Failed to fetch objectives' });
  }
});

// @route   GET /api/objectives/:id
// @desc    Get single objective with all details
router.get('/:id', async (req, res) => {
  try {
    const objective = await prisma.objective.findUnique({
      where: { id: req.params.id },
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
router.post('/', async (req, res) => {
  try {
    const { code, name, description, timeframe, targetValue, metric, ownerId } = req.body;

    const objective = await prisma.objective.create({
      data: {
        code,
        name,
        description,
        timeframe,
        targetValue: targetValue ? parseInt(targetValue) : null,
        metric,
        ownerId: ownerId || null
      },
      include: {
        owner: true
      }
    });

    res.status(201).json(objective);
  } catch (error) {
    console.error('Error creating objective:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Objective code already exists' });
    }
    res.status(500).json({ error: 'Failed to create objective' });
  }
});

// @route   PUT /api/objectives/:id
// @desc    Update an objective
router.put('/:id', async (req, res) => {
  try {
    const { code, name, description, timeframe, targetValue, metric, ownerId } = req.body;

    const objective = await prisma.objective.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        timeframe,
        targetValue: targetValue !== undefined ? (targetValue ? parseInt(targetValue) : null) : undefined,
        metric,
        ownerId: ownerId || null
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
// @desc    Delete an objective
router.delete('/:id', async (req, res) => {
  try {
    // First, unlink all rocks from this objective
    await prisma.rock.updateMany({
      where: { objectiveId: req.params.id },
      data: { objectiveId: null }
    });

    await prisma.objective.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Objective deleted successfully' });
  } catch (error) {
    console.error('Error deleting objective:', error);
    res.status(500).json({ error: 'Failed to delete objective' });
  }
});

module.exports = router;

