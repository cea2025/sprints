/**
 * Audit Database Provider
 * 
 * Abstraction layer for audit log storage.
 * Currently uses main PostgreSQL with RLS.
 * Designed for easy migration to:
 * - Separate schema per organization
 * - Separate database per organization
 * - External service (Elasticsearch, etc.)
 * 
 * To migrate: implement a new provider class and swap in audit.service.js
 */

const prisma = require('../../lib/prisma');

/**
 * Storage Provider Interface (for documentation)
 * 
 * Required methods:
 * - createLog(organizationId, logData)
 * - getLogs(organizationId, filters, pagination)
 * - getLogById(organizationId, logId)
 * - getLogsByEntity(organizationId, entityType, entityId)
 * - deleteLogs(organizationId, olderThan)
 * - countLogs(organizationId, filters)
 */

class PrismaAuditProvider {
  constructor() {
    this.name = 'PrismaAuditProvider';
    this.version = '1.0.0';
    this.supportsRLS = true;
  }

  /**
   * Create a new audit log entry
   */
  async createLog(organizationId, logData) {
    return prisma.auditLog.create({
      data: {
        organizationId,
        ...logData,
      }
    });
  }

  /**
   * Create multiple audit log entries (batch)
   */
  async createLogs(organizationId, logsData) {
    return prisma.auditLog.createMany({
      data: logsData.map(log => ({
        organizationId,
        ...log,
      }))
    });
  }

  /**
   * Get audit logs with filters and pagination
   */
  async getLogs(organizationId, filters = {}, pagination = {}) {
    const {
      userId,
      action,
      actions,
      category,
      entityType,
      entityId,
      startDate,
      endDate,
      search
    } = filters;

    const {
      page = 1,
      limit = 50,
      orderBy = 'createdAt',
      order = 'desc'
    } = pagination;

    const where = {
      organizationId,
      ...(userId && { userId }),
      ...(action && { action }),
      ...(actions && { action: { in: actions } }),
      ...(category && { category }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        }
      } : {}),
      ...(search && {
        OR: [
          { userName: { contains: search, mode: 'insensitive' } },
          { userEmail: { contains: search, mode: 'insensitive' } },
          { entityName: { contains: search, mode: 'insensitive' } },
          { changesSummary: { contains: search, mode: 'insensitive' } },
        ]
      })
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { [orderBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single audit log by ID
   */
  async getLogById(organizationId, logId) {
    return prisma.auditLog.findFirst({
      where: {
        id: logId,
        organizationId
      }
    });
  }

  /**
   * Get logs for a specific entity
   */
  async getLogsByEntity(organizationId, entityType, entityId, limit = 100) {
    return prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Delete logs older than a date (for retention)
   */
  async deleteLogs(organizationId, olderThan) {
    return prisma.auditLog.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: olderThan }
      }
    });
  }

  /**
   * Count logs matching filters
   */
  async countLogs(organizationId, filters = {}) {
    const where = {
      organizationId,
      ...(filters.action && { action: filters.action }),
      ...(filters.category && { category: filters.category }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.startDate || filters.endDate ? {
        createdAt: {
          ...(filters.startDate && { gte: new Date(filters.startDate) }),
          ...(filters.endDate && { lte: new Date(filters.endDate) }),
        }
      } : {}),
    };

    return prisma.auditLog.count({ where });
  }

  /**
   * Get statistics for dashboard
   */
  async getStats(organizationId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalLogs,
      actionCounts,
      categoryCounts,
      entityCounts,
      userCounts
    ] = await Promise.all([
      // Total logs in period
      prisma.auditLog.count({
        where: { organizationId, createdAt: { gte: startDate } }
      }),
      
      // Count by action
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: { action: true }
      }),
      
      // Count by category
      prisma.auditLog.groupBy({
        by: ['category'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: { category: true }
      }),
      
      // Count by entity type
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: { entityType: true }
      }),
      
      // Count by user
      prisma.auditLog.groupBy({
        by: ['userId', 'userName'],
        where: { organizationId, createdAt: { gte: startDate }, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      })
    ]);

    return {
      period: { days, startDate },
      totalLogs,
      byAction: actionCounts.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {}),
      byCategory: categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {}),
      byEntityType: entityCounts.reduce((acc, item) => {
        acc[item.entityType] = item._count.entityType;
        return acc;
      }, {}),
      topUsers: userCounts.map(item => ({
        userId: item.userId,
        userName: item.userName,
        count: item._count.userId
      }))
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await prisma.auditLog.count({ take: 1 });
      return { status: 'healthy', provider: this.name };
    } catch (error) {
      return { status: 'unhealthy', provider: this.name, error: error.message };
    }
  }
}

// ============================================================
// FUTURE: Alternative providers for migration
// ============================================================

/**
 * Example: Separate PostgreSQL Schema Provider
 * 
 * class SchemaPerOrgAuditProvider {
 *   async createLog(organizationId, logData) {
 *     const schema = `audit_${organizationId}`;
 *     // Use raw query or dynamic Prisma client
 *   }
 * }
 */

/**
 * Example: Elasticsearch Provider
 * 
 * class ElasticsearchAuditProvider {
 *   constructor(esClient) {
 *     this.client = esClient;
 *   }
 *   
 *   async createLog(organizationId, logData) {
 *     const index = `audit-${organizationId}`;
 *     return this.client.index({ index, body: logData });
 *   }
 * }
 */

// Export singleton instance
// To switch providers: change this export
const auditDbProvider = new PrismaAuditProvider();

module.exports = {
  auditDbProvider,
  PrismaAuditProvider
};

