/**
 * Orphans API
 * 
 * Provides endpoints to query entities that are not linked to parent entities.
 * - Objectives without Rocks
 * - Rocks without Objectives
 * - Rocks without Stories
 * - Stories without Rocks
 * - Stories without Sprint ("אבני דרך בהמתנה")
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

/**
 * @route   GET /api/orphans/summary
 * @desc    Get count of all orphan types (for dashboard widget)
 */
router.get('/summary', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const orgFilter = organizationId ? { organizationId } : {};

    const [
      objectivesWithoutRocks,
      rocksWithoutObjective,
      rocksWithoutStories,
      storiesWithoutRock,
      storiesWithoutSprint
    ] = await Promise.all([
      // מטרות-על ללא סלעים
      prisma.objective.count({
        where: {
          ...orgFilter,
          rocks: { none: {} }
        }
      }),
      // סלעים ללא מטרה
      prisma.rock.count({
        where: {
          ...orgFilter,
          objectiveId: null
        }
      }),
      // סלעים ללא אבני דרך
      prisma.rock.count({
        where: {
          ...orgFilter,
          stories: { none: {} }
        }
      }),
      // אבני דרך ללא סלע
      prisma.story.count({
        where: {
          ...orgFilter,
          rockId: null
        }
      }),
      // אבני דרך בהמתנה (ללא ספרינט)
      prisma.story.count({
        where: {
          ...orgFilter,
          sprintId: null
        }
      })
    ]);

    res.json({
      objectivesWithoutRocks,
      rocksWithoutObjective,
      rocksWithoutStories,
      storiesWithoutRock,
      storiesWithoutSprint,
      total: objectivesWithoutRocks + rocksWithoutObjective + rocksWithoutStories + storiesWithoutRock + storiesWithoutSprint
    });
  } catch (error) {
    console.error('Error fetching orphan summary:', error);
    res.status(500).json({ error: 'Failed to fetch orphan summary' });
  }
});

/**
 * @route   GET /api/orphans/objectives
 * @desc    Get objectives without any rocks
 */
router.get('/objectives', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const orgFilter = organizationId ? { organizationId } : {};

    const objectives = await prisma.objective.findMany({
      where: {
        ...orgFilter,
        rocks: { none: {} }
      },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(objectives);
  } catch (error) {
    console.error('Error fetching orphan objectives:', error);
    res.status(500).json({ error: 'Failed to fetch orphan objectives' });
  }
});

/**
 * @route   GET /api/orphans/rocks/no-objective
 * @desc    Get rocks without an objective
 */
router.get('/rocks/no-objective', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const orgFilter = organizationId ? { organizationId } : {};

    const rocks = await prisma.rock.findMany({
      where: {
        ...orgFilter,
        objectiveId: null
      },
      include: {
        owner: {
          select: { id: true, name: true }
        },
        _count: {
          select: { stories: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rocks);
  } catch (error) {
    console.error('Error fetching rocks without objective:', error);
    res.status(500).json({ error: 'Failed to fetch rocks' });
  }
});

/**
 * @route   GET /api/orphans/rocks/no-stories
 * @desc    Get rocks without any stories
 */
router.get('/rocks/no-stories', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const orgFilter = organizationId ? { organizationId } : {};

    const rocks = await prisma.rock.findMany({
      where: {
        ...orgFilter,
        stories: { none: {} }
      },
      include: {
        objective: {
          select: { id: true, code: true, name: true }
        },
        owner: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rocks);
  } catch (error) {
    console.error('Error fetching rocks without stories:', error);
    res.status(500).json({ error: 'Failed to fetch rocks' });
  }
});

/**
 * @route   GET /api/orphans/stories/no-rock
 * @desc    Get stories without a rock
 */
router.get('/stories/no-rock', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const orgFilter = organizationId ? { organizationId } : {};

    const stories = await prisma.story.findMany({
      where: {
        ...orgFilter,
        rockId: null
      },
      include: {
        sprint: {
          select: { id: true, name: true }
        },
        owner: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories without rock:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

/**
 * @route   GET /api/orphans/stories/backlog
 * @desc    Get stories without a sprint ("אבני דרך בהמתנה")
 */
router.get('/stories/backlog', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    const orgFilter = organizationId ? { organizationId } : {};

    const stories = await prisma.story.findMany({
      where: {
        ...orgFilter,
        sprintId: null
      },
      include: {
        rock: {
          select: { id: true, code: true, name: true }
        },
        owner: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(stories);
  } catch (error) {
    console.error('Error fetching backlog stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

module.exports = router;

