const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/dashboard
// @desc    Get dashboard data with objectives, rocks, and sprint info
router.get('/', async (req, res) => {
  try {
    const today = new Date();
    
    // Get current quarter info
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
    const currentYear = today.getFullYear();

    // Get current sprint (by date or most recent)
    let currentSprint = await prisma.sprint.findFirst({
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
          sprintRocks: {
            include: {
              rock: true
            }
          },
          stories: {
            include: {
              owner: true
            }
          }
        }
      });
    }

    // If still no sprint, get most recent
    if (!currentSprint) {
      currentSprint = await prisma.sprint.findFirst({
        orderBy: { startDate: 'desc' },
        include: {
          sprintRocks: {
            include: {
              rock: true
            }
          },
          stories: {
            include: {
              owner: true
            }
          }
        }
      });
    }

    // Calculate sprint stats based on new progress/blocked model
    let sprintStats = null;
    if (currentSprint) {
      const stories = currentSprint.stories;
      sprintStats = {
        total: stories.length,
        todo: stories.filter(s => s.progress === 0 && !s.isBlocked).length,
        inProgress: stories.filter(s => s.progress > 0 && s.progress < 100 && !s.isBlocked).length,
        blocked: stories.filter(s => s.isBlocked).length,
        done: stories.filter(s => s.progress === 100).length
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
        objective: true,
        stories: {
          select: {
            id: true,
            progress: true,
            isBlocked: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    const rocksWithProgress = rocks.map(rock => {
      const totalStories = rock.stories.length;
      const doneStories = rock.stories.filter(s => s.progress === 100).length;
      // Calculate progress from stories if rock has no manual progress
      const calculatedProgress = totalStories > 0
        ? Math.round(rock.stories.reduce((sum, s) => sum + s.progress, 0) / totalStories)
        : 0;
      const effectiveProgress = rock.progress > 0 ? rock.progress : calculatedProgress;
      
      return {
        id: rock.id,
        code: rock.code,
        name: rock.name,
        progress: effectiveProgress,
        owner: rock.owner,
        objective: rock.objective,
        totalStories,
        doneStories,
        blockedStories: rock.stories.filter(s => s.isBlocked).length,
        isCarriedOver: rock.isCarriedOver,
        carriedFromQuarter: rock.carriedFromQuarter
      };
    });

    // Get objectives
    const objectives = await prisma.objective.findMany({
      include: {
        owner: true,
        rocks: {
          where: {
            year: currentYear,
            quarter: currentQuarter
          },
          select: {
            id: true,
            progress: true
          }
        }
      }
    });

    const objectivesWithProgress = objectives.map(obj => {
      const rocksCount = obj.rocks.length;
      const progress = rocksCount > 0
        ? Math.round(obj.rocks.reduce((sum, r) => sum + (r.progress || 0), 0) / rocksCount)
        : 0;
      
      return {
        id: obj.id,
        code: obj.code,
        name: obj.name,
        owner: obj.owner,
        rocksCount,
        progress
      };
    });

    // Get overall stats
    const totalRocks = await prisma.rock.count({
      where: { year: currentYear, quarter: currentQuarter }
    });
    
    const completedRocks = await prisma.rock.count({
      where: { year: currentYear, quarter: currentQuarter, progress: 100 }
    });

    const totalStories = await prisma.story.count();
    const totalObjectives = await prisma.objective.count();
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
        rocks: currentSprint.sprintRocks.map(sr => sr.rock),
        stats: sprintStats
      } : null,
      objectives: objectivesWithProgress,
      rocks: rocksWithProgress,
      overallStats: {
        totalRocks,
        completedRocks,
        totalStories,
        totalObjectives,
        activeTeamMembers
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
