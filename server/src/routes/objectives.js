const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/objectives
// @desc    Get all objectives with rocks and progress
router.get('/', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    
    const where = {};
    if (organizationId) where.organizationId = organizationId;

    const objectives = await prisma.objective.findMany({
      where,
      include: {
        owner: true,
        rocks: {
          select: {
            id: true,
            progress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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
    const { code, name, description, ownerId } = req.body;
    const organizationId = await getOrganizationId(req);

    const objective = await prisma.objective.create({
      data: {
        code,
        name,
        description,
        ownerId: ownerId || null,
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
      return res.status(400).json({ error: 'קוד מטרת-על כבר קיים' });
    }
    res.status(500).json({ error: 'Failed to create objective: ' + error.message });
  }
});

// @route   PUT /api/objectives/:id
// @desc    Update an objective
router.put('/:id', async (req, res) => {
  try {
    const { code, name, description, ownerId } = req.body;

    const objective = await prisma.objective.update({
      where: { id: req.params.id },
      data: {
        code,
        name,
        description,
        ownerId: ownerId || null,
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
// @desc    Delete an objective
router.delete('/:id', async (req, res) => {
  try {
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
