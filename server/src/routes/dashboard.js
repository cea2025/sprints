const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/dashboard
// @desc    Get dashboard data
router.get('/', async (req, res) => {
  try {
    const today = new Date();
    
    // Get current quarter info
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
    const currentYear = today.getFullYear();

    // Get current or next sprint
    let currentSprint = await prisma.sprint.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        mainRock: true,
        stories: {
          include: {
            owner: true
          }
        }
      }
    });

    // If no current sprint, get next upcoming
    if (!currentSprint) {
      currentSprint = await prisma.sprint.findFirst({
        where: {
          startDate: { gt: today }
        },
        orderBy: { startDate: 'asc' },
        include: {
          mainRock: true,
          stories: {
            include: {
              owner: true
            }
          }
        }
      });
    }

    // Calculate sprint stats
    let sprintStats = null;
    if (currentSprint) {
      sprintStats = {
        total: currentSprint.stories.length,
        todo: currentSprint.stories.filter(s => s.status === 'TODO').length,
        inProgress: currentSprint.stories.filter(s => s.status === 'IN_PROGRESS').length,
        blocked: currentSprint.stories.filter(s => s.status === 'BLOCKED').length,
        done: currentSprint.stories.filter(s => s.status === 'DONE').length
      };
    }

    // Get current quarter rocks with progress
    const rocks = await prisma.rock.findMany({
      where: {
        year: currentYear,
        quarter: currentQuarter
      },
      include: {
        owner: true,
        stories: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    const rocksWithProgress = rocks.map(rock => {
      const totalStories = rock.stories.length;
      const doneStories = rock.stories.filter(s => s.status === 'DONE').length;
      const progress = totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0;
      
      return {
        id: rock.id,
        code: rock.code,
        name: rock.name,
        status: rock.status,
        owner: rock.owner,
        progress,
        totalStories,
        doneStories
      };
    });

    // Get overall stats
    const totalRocks = await prisma.rock.count({
      where: { year: currentYear, quarter: currentQuarter }
    });
    
    const completedRocks = await prisma.rock.count({
      where: { year: currentYear, quarter: currentQuarter, status: 'DONE' }
    });

    const totalStories = await prisma.story.count();
    const activeTeamMembers = await prisma.teamMember.count({
      where: { isActive: true }
    });

    res.json({
      currentQuarter: {
        year: currentYear,
        quarter: currentQuarter
      },
      currentSprint: currentSprint ? {
        id: currentSprint.id,
        name: currentSprint.name,
        goal: currentSprint.goal,
        startDate: currentSprint.startDate,
        endDate: currentSprint.endDate,
        mainRock: currentSprint.mainRock,
        stats: sprintStats
      } : null,
      rocks: rocksWithProgress,
      overallStats: {
        totalRocks,
        completedRocks,
        totalStories,
        activeTeamMembers
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
