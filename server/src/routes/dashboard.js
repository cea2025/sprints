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

    // Get current or next sprint (by state or date)
    let currentSprint = await prisma.sprint.findFirst({
      where: { state: 'ACTIVE' },
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

    // If no active sprint, try by date
    if (!currentSprint) {
      currentSprint = await prisma.sprint.findFirst({
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
    }

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

    // Calculate sprint stats
    let sprintStats = null;
    if (currentSprint) {
      sprintStats = {
        total: currentSprint.stories.length,
        todo: currentSprint.stories.filter(s => s.status === 'TODO').length,
        inProgress: currentSprint.stories.filter(s => s.status === 'IN_PROGRESS').length,
        blocked: currentSprint.stories.filter(s => s.status === 'BLOCKED').length,
        done: currentSprint.stories.filter(s => s.status === 'DONE').length,
        totalPoints: currentSprint.stories.reduce((sum, s) => sum + (s.estimate || 0), 0),
        donePoints: currentSprint.stories
          .filter(s => s.status === 'DONE')
          .reduce((sum, s) => sum + (s.estimate || 0), 0)
      };
    }

    // Get current quarter rocks with progress (using new fields)
    const rocks = await prisma.rock.findMany({
      where: {
        yearOfRecord: currentYear,
        currentQuarter: currentQuarter
      },
      include: {
        owner: true,
        objective: true,
        stories: {
          select: {
            id: true,
            status: true,
            estimate: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    const rocksWithProgress = rocks.map(rock => {
      const donePoints = rock.stories
        .filter(s => s.status === 'DONE')
        .reduce((sum, s) => sum + (s.estimate || 0), 0);
      const totalStories = rock.stories.length;
      const doneStories = rock.stories.filter(s => s.status === 'DONE').length;
      const progress = rock.committedPoints > 0 
        ? Math.round((donePoints / rock.committedPoints) * 100) 
        : 0;
      
      return {
        id: rock.id,
        code: rock.code,
        name: rock.name,
        status: rock.status,
        health: rock.health,
        owner: rock.owner,
        objective: rock.objective,
        committedPoints: rock.committedPoints,
        donePoints,
        progress,
        totalStories,
        doneStories,
        isCarryOver: rock.originalQuarter !== rock.currentQuarter
      };
    });

    // Get objectives for current year
    const objectives = await prisma.objective.findMany({
      where: {
        timeframe: {
          contains: currentYear.toString()
        }
      },
      include: {
        owner: true,
        rocks: {
          select: {
            id: true,
            status: true,
            committedPoints: true,
            stories: {
              where: { status: 'DONE' },
              select: { estimate: true }
            }
          }
        }
      }
    });

    const objectivesWithProgress = objectives.map(obj => {
      const totalCommitted = obj.rocks.reduce((sum, r) => sum + r.committedPoints, 0);
      const totalDone = obj.rocks.reduce((sum, r) => {
        return sum + r.stories.reduce((s, story) => s + (story.estimate || 0), 0);
      }, 0);
      
      return {
        id: obj.id,
        code: obj.code,
        name: obj.name,
        timeframe: obj.timeframe,
        targetValue: obj.targetValue,
        metric: obj.metric,
        owner: obj.owner,
        rocksCount: obj.rocks.length,
        progress: totalCommitted > 0 ? Math.round((totalDone / totalCommitted) * 100) : 0
      };
    });

    // Get overall stats
    const totalRocks = await prisma.rock.count({
      where: { yearOfRecord: currentYear, currentQuarter: currentQuarter }
    });
    
    const completedRocks = await prisma.rock.count({
      where: { yearOfRecord: currentYear, currentQuarter: currentQuarter, status: 'DONE' }
    });

    const totalStories = await prisma.story.count();
    const totalObjectives = await prisma.objective.count({
      where: {
        timeframe: {
          contains: currentYear.toString()
        }
      }
    });
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
        state: currentSprint.state,
        capacityPoints: currentSprint.capacityPoints,
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
