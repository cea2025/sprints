/**
 * Organization Service
 * לוגיקה עסקית לניהול ארגונים
 */

const prisma = require('../../lib/prisma');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../shared/errors/AppError');

class OrganizationService {
  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId) {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        isActive: true,
        organization: {
          isActive: true
        }
      },
      include: {
        organization: true
      },
      orderBy: {
        organization: { name: 'asc' }
      }
    });

    return memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role
    }));
  }

  /**
   * Create a new organization
   */
  async create(data, userId) {
    // Check if slug is unique
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug }
    });

    if (existing) {
      throw new ConflictError('שם URL כבר תפוס');
    }

    // Create organization with the creator as admin
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo || null, // Convert empty string to null
        settings: data.settings,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: {
          include: { user: true }
        }
      }
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getById(organizationId, userId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      },
      include: {
        organization: {
          include: {
            members: {
              include: { user: true },
              where: { isActive: true }
            },
            _count: {
              select: {
                objectives: true,
                rocks: true,
                sprints: true,
                stories: true,
                teamMembers: true
              }
            }
          }
        }
      }
    });

    if (!membership) {
      throw new NotFoundError('ארגון לא נמצא או אין לך גישה אליו');
    }

    return {
      ...membership.organization,
      yourRole: membership.role
    };
  }

  /**
   * Get organization by slug (for URL routing)
   */
  async getBySlug(slug, userId, isSuperAdmin = false) {
    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        isActive: true
      }
    });

    if (!organization || !organization.isActive) {
      return null;
    }

    // Check if user has access
    if (isSuperAdmin) {
      return { ...organization, role: 'ADMIN' };
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: organization.id }
      }
    });

    if (!membership || !membership.isActive) {
      return null;
    }

    return { ...organization, role: membership.role };
  }

  /**
   * Update organization
   */
  async update(organizationId, data, userId) {
    // Check if user is admin
    const membership = await this.checkAdminAccess(organizationId, userId);

    // If changing slug, check uniqueness
    if (data.slug) {
      const existing = await prisma.organization.findFirst({
        where: {
          slug: data.slug,
          id: { not: organizationId }
        }
      });

      if (existing) {
        throw new ConflictError('שם URL כבר תפוס');
      }
    }

    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo || null, // Convert empty string to null
        settings: data.settings,
        isActive: data.isActive
      }
    });
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId, email, role, adminUserId) {
    await this.checkAdminAccess(organizationId, adminUserId);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Add to allowed emails for when they register
      await prisma.allowedEmail.upsert({
        where: {
          organizationId_email: { organizationId, email }
        },
        update: { role },
        create: {
          email,
          role,
          organizationId,
          addedBy: adminUserId
        }
      });

      return { status: 'invited', email, role };
    }

    // Check if already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId }
      }
    });

    if (existing) {
      throw new ConflictError('המשתמש כבר חבר בארגון');
    }

    // Add membership
    const membership = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId,
        role
      },
      include: { user: true }
    });

    return { status: 'added', member: membership };
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId, memberId, role, adminUserId) {
    await this.checkAdminAccess(organizationId, adminUserId);

    // Can't change own role
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId }
    });

    if (member?.userId === adminUserId) {
      throw new ForbiddenError('לא ניתן לשנות את התפקיד של עצמך');
    }

    return prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true }
    });
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId, memberId, adminUserId) {
    await this.checkAdminAccess(organizationId, adminUserId);

    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId }
    });

    if (member?.userId === adminUserId) {
      throw new ForbiddenError('לא ניתן להסיר את עצמך מהארגון');
    }

    await prisma.organizationMember.delete({
      where: { id: memberId }
    });

    return { success: true };
  }

  /**
   * Check if user is admin in organization
   */
  async checkAdminAccess(organizationId, userId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      throw new ForbiddenError('נדרשת הרשאת מנהל');
    }

    return membership;
  }

  /**
   * Set active organization for session
   */
  async setActiveOrganization(userId, organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      },
      include: { organization: true }
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenError('אין לך גישה לארגון זה');
    }

    if (!membership.organization.isActive) {
      throw new ForbiddenError('הארגון אינו פעיל');
    }

    return {
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role
    };
  }

  /**
   * Set current sprint for organization
   */
  async setCurrentSprint(organizationId, sprintId, userId) {
    // Verify sprint exists and belongs to this organization
    if (sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: {
          id: sprintId,
          organizationId
        }
      });

      if (!sprint) {
        throw new NotFoundError('הספרינט לא נמצא');
      }
    }

    // Update organization settings with current sprint
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const currentSettings = organization?.settings || {};
    const newSettings = {
      ...currentSettings,
      currentSprintId: sprintId || null
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: newSettings
      }
    });

    return { success: true, currentSprintId: sprintId };
  }

  /**
   * Get current sprint ID for organization
   */
  async getCurrentSprintId(organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    return organization?.settings?.currentSprintId || null;
  }
}

module.exports = new OrganizationService();

