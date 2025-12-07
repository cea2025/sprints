const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// @route   GET /api/team
// @desc    Get all team members
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    
    const where = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const teamMembers = await prisma.teamMember.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            picture: true
          }
        },
        _count: {
          select: {
            ownedRocks: true,
            ownedStories: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// @route   GET /api/team/:id
// @desc    Get single team member with stats
router.get('/:id', async (req, res) => {
  try {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
            picture: true
          }
        },
        ownedRocks: {
          include: {
            stories: {
              select: { status: true }
            }
          }
        },
        ownedStories: {
          include: {
            sprint: true,
            rock: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(teamMember);
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
});

// @route   POST /api/team
// @desc    Create a new team member
router.post('/', async (req, res) => {
  try {
    const { name, role, capacity, userId } = req.body;

    const teamMember = await prisma.teamMember.create({
      data: {
        name,
        role,
        capacity: capacity ? parseInt(capacity) : null,
        userId
      }
    });

    res.status(201).json(teamMember);
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// @route   PUT /api/team/:id
// @desc    Update a team member
router.put('/:id', async (req, res) => {
  try {
    const { name, role, capacity, isActive } = req.body;

    const teamMember = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: {
        name,
        role,
        capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : undefined,
        isActive
      }
    });

    res.json(teamMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// @route   DELETE /api/team/:id
// @desc    Delete a team member (removes ownership from rocks/stories first)
router.delete('/:id', async (req, res) => {
  try {
    // Remove ownership from rocks and stories first
    await prisma.rock.updateMany({
      where: { ownerId: req.params.id },
      data: { ownerId: null }
    });
    
    await prisma.story.updateMany({
      where: { ownerId: req.params.id },
      data: { ownerId: null }
    });
    
    await prisma.objective.updateMany({
      where: { ownerId: req.params.id },
      data: { ownerId: null }
    });

    // Now delete the team member
    await prisma.teamMember.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Team member deleted' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// @route   POST /api/team/link-user
// @desc    Link current user to a team member
router.post('/link-user', async (req, res) => {
  try {
    const { teamMemberId } = req.body;
    const userId = req.user.id;

    const teamMember = await prisma.teamMember.update({
      where: { id: teamMemberId },
      data: { userId }
    });

    res.json(teamMember);
  } catch (error) {
    console.error('Error linking user:', error);
    res.status(500).json({ error: 'Failed to link user to team member' });
  }
});

module.exports = router;
