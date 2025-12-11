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
const { applyTeamReadScope } = require('../shared/teamScope');

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
    const scopedOrgFilter = applyTeamReadScope(orgFilter, req);

    const [
      objectivesWithoutRocks,
      rocksWithoutObjective,
      rocksWithoutStories,
      storiesWithoutRock,
      storiesWithoutSprint
    ] = await Promise.all([
      // פרויקטים ללא סלעים
      prisma.objective.count({
        where: {
          ...scopedOrgFilter,
          rocks: { none: {} }
        }
      }),
      // סלעים ללא פרויקט
      prisma.rock.count({
        where: {
          ...scopedOrgFilter,
          objectiveId: null
        }
      }),
      // סלעים ללא אבני דרך
      prisma.rock.count({
        where: {
          ...scopedOrgFilter,
          stories: { none: {} }
        }
      }),
      // אבני דרך ללא סלע
      prisma.story.count({
        where: {
          ...scopedOrgFilter,
          rockId: null
        }
      }),
      // אבני דרך בהמתנה (ללא ספרינט)
      prisma.story.count({
        where: {
          ...scopedOrgFilter,
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
    const scopedOrgFilter = applyTeamReadScope(orgFilter, req);

    const objectives = await prisma.objective.findMany({
      where: {
        ...scopedOrgFilter,
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
    const scopedOrgFilter = applyTeamReadScope(orgFilter, req);

    const rocks = await prisma.rock.findMany({
      where: {
        ...scopedOrgFilter,
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
    const scopedOrgFilter = applyTeamReadScope(orgFilter, req);

    const rocks = await prisma.rock.findMany({
      where: {
        ...scopedOrgFilter,
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
    const scopedOrgFilter = applyTeamReadScope(orgFilter, req);

    const stories = await prisma.story.findMany({
      where: {
        ...scopedOrgFilter,
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
    const scopedOrgFilter = applyTeamReadScope(orgFilter, req);

    const stories = await prisma.story.findMany({
      where: {
        ...scopedOrgFilter,
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

