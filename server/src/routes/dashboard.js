const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { applyTeamReadScope } = require('../shared/teamScope');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/dashboard
// @desc    Get dashboard data with objectives, rocks, and sprint info
router.get('/', async (req, res) => {
  try {
    const today = new Date();
    const organizationId = await getOrganizationId(req);
    const { userId } = req.query; // Optional: filter by user's team member ID
    
    // Get current quarter info
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
    const currentYear = today.getFullYear();

    // Organization filter for all queries
    const orgFilter = organizationId ? { organizationId } : {};

    // Check if organization has a manually set current sprint
    let currentSprintId = null;
    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });
      currentSprintId = organization?.settings?.currentSprintId;
    }

    // Get current sprint - first check if manually set, then by date, then most recent
    let currentSprint = null;
    
    if (currentSprintId) {
      // Use manually set sprint
      currentSprint = await prisma.sprint.findUnique({
        where: { id: currentSprintId },
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
    
    if (!currentSprint) {
      // Fall back to sprint by date
      currentSprint = await prisma.sprint.findFirst({
        where: {
          ...orgFilter,
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
          ...orgFilter,
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
        where: orgFilter,
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
    const rocksWhere = applyTeamReadScope({
      ...orgFilter,
      year: currentYear,
      quarter: currentQuarter
    }, req);

    const rocks = await prisma.rock.findMany({
      where: rocksWhere,
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
    const objectivesWhere = applyTeamReadScope(orgFilter, req);

    const objectives = await prisma.objective.findMany({
      where: objectivesWhere,
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
      where: applyTeamReadScope({ ...orgFilter, year: currentYear, quarter: currentQuarter }, req)
    });
    
    const completedRocks = await prisma.rock.count({
      where: applyTeamReadScope({ ...orgFilter, year: currentYear, quarter: currentQuarter, progress: 100 }, req)
    });

    const totalStories = await prisma.story.count({ where: applyTeamReadScope(orgFilter, req) });
    const totalObjectives = await prisma.objective.count({ where: applyTeamReadScope(orgFilter, req) });
    const activeTeamMembers = await prisma.teamMember.count({
      where: { ...orgFilter, isActive: true }
    });

    // Get user-specific rocks and milestones if userId is provided
    let userRocks = [];
    let userMilestones = [];
    
    if (userId) {
      // The userId from frontend is a membershipId. We need to also find the matching
      // teamMember for the same user to query legacy ownerId fields.
      let teamMemberId = null;
      const membership = await prisma.membership.findUnique({
        where: { id: userId }
      });
      if (membership) {
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            userId: membership.userId,
            organizationId: organizationId
          }
        });
        teamMemberId = teamMember?.id;
      }
      
      console.log('🔍 [dashboard] userId (membershipId):', userId, 'teamMemberId:', teamMemberId);
      
      // Build OR conditions for owner lookup
      const ownerConditions = [{ membershipId: userId }];
      if (teamMemberId) {
        ownerConditions.push({ ownerId: teamMemberId });
      }
      
      // Get rocks owned by user (query BOTH legacy ownerId AND new membershipId)
      const userRocksWhere = applyTeamReadScope({
        ...orgFilter,
        year: currentYear,
        quarter: currentQuarter,
        OR: ownerConditions
      }, req);

      const userRocksData = await prisma.rock.findMany({
        where: userRocksWhere,
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

      userRocks = userRocksData.map(rock => {
        const totalStories = rock.stories.length;
        const doneStories = rock.stories.filter(s => s.progress === 100).length;
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

      // Get milestones (stories) owned by user (all, not just current sprint)
      // Query by BOTH ownerId (legacy TeamMember) AND membershipId (new Membership)
      console.log('🔍 [dashboard] Fetching userMilestones for userId:', userId, 'teamMemberId:', teamMemberId);
      const userStoriesWhere = applyTeamReadScope({
        ...orgFilter,
        OR: ownerConditions,
        progress: { lt: 100 } // Show incomplete milestones
      }, req);

      const userStoriesData = await prisma.story.findMany({
        where: userStoriesWhere,
        include: {
          rock: {
            select: { id: true, code: true, name: true }
          },
          sprint: {
            select: { id: true, name: true }
          },
          owner: true
        },
        orderBy: [
          { isBlocked: 'desc' },
          { progress: 'asc' }
        ]
      });

      userMilestones = userStoriesData.map(story => ({
        id: story.id,
        title: story.title,
        description: story.description,
        progress: story.progress,
        isBlocked: story.isBlocked,
        rock: story.rock,
        sprint: story.sprint,
        owner: story.owner
      }));
      console.log('✅ [dashboard] Found', userMilestones.length, 'userMilestones');
    }

    // Get ALL milestones for "all" view (sorted by progress - incomplete first)
    console.log('🔍 [dashboard] Fetching allMilestones with orgFilter:', JSON.stringify(orgFilter));
    const allMilestonesWhere = applyTeamReadScope({
      ...orgFilter
      // Removed progress filter - show ALL milestones
    }, req);

    const allMilestonesData = await prisma.story.findMany({
      where: allMilestonesWhere,
      include: {
        rock: {
          select: { id: true, code: true, name: true }
        },
        sprint: {
          select: { id: true, name: true }
        },
        owner: true
      },
      orderBy: [
        { progress: 'asc' },     // Incomplete first (lower progress)
        { isBlocked: 'desc' },   // Blocked items next
        { updatedAt: 'desc' }    // Most recently updated
      ],
      take: 30 // Show up to 30 milestones
    });
    console.log('✅ [dashboard] Found', allMilestonesData.length, 'allMilestones');

    const allMilestones = allMilestonesData.map(story => ({
      id: story.id,
      title: story.title,
      description: story.description,
      progress: story.progress,
      isBlocked: story.isBlocked,
      rock: story.rock,
      sprint: story.sprint,
      owner: story.owner
    }));

    // Get ALL tasks for "all" view (not cancelled)
    console.log('🔍 [dashboard] Fetching allTasks with orgFilter:', orgFilter);
    const allTasksWhere = applyTeamReadScope({
      ...orgFilter,
      status: { not: 'CANCELLED' }
    }, req);

    const allTasksData = await prisma.task.findMany({
      where: allTasksWhere,
      include: {
        owner: true,
        story: {
          select: { id: true, title: true }
        }
      },
      orderBy: [
        { status: 'asc' },      // TODO first, then IN_PROGRESS, then DONE
        { createdAt: 'desc' }
      ],
      take: 30
    });
    console.log('✅ [dashboard] Found', allTasksData.length, 'allTasks');

    const allTasks = allTasksData.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      story: task.story,
      owner: task.owner
    }));

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
      userRocks,
      userMilestones,
      allMilestones,  // All milestones for "all" view
      allTasks,       // All tasks for "all" view
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
