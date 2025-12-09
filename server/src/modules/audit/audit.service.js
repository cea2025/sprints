/**
 * Audit Service
 * 
 * Main service for audit logging, alerts, and retention management.
 * Uses the audit-db.provider for storage abstraction.
 */

const { auditDbProvider } = require('./audit-db.provider');
const prisma = require('../../lib/prisma');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// Constants
// ============================================================

const AUDIT_ACTIONS = {
  // CRUD
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
  
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Admin
  ROLE_CHANGED: 'ROLE_CHANGED',
  USER_INVITED: 'USER_INVITED',
  USER_REMOVED: 'USER_REMOVED',
  PERMISSIONS_CHANGED: 'PERMISSIONS_CHANGED',
  
  // Data
  EXPORT_CSV: 'EXPORT_CSV',
  EXPORT_PDF: 'EXPORT_PDF',
  IMPORT: 'IMPORT',
  BULK_UPDATE: 'BULK_UPDATE',
  
  // System
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  WEBHOOK_TRIGGERED: 'WEBHOOK_TRIGGERED',
  ALERT_SENT: 'ALERT_SENT'
};

const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'AUTHENTICATION',
  DATA_CRUD: 'DATA_CRUD',
  ADMINISTRATION: 'ADMINISTRATION',
  EXPORT_IMPORT: 'EXPORT_IMPORT',
  SYSTEM: 'SYSTEM',
  PAGE_VIEW: 'PAGE_VIEW'
};

// Map actions to categories
const ACTION_CATEGORY_MAP = {
  CREATE: 'DATA_CRUD',
  READ: 'PAGE_VIEW',
  UPDATE: 'DATA_CRUD',
  DELETE: 'DATA_CRUD',
  RESTORE: 'DATA_CRUD',
  LOGIN: 'AUTHENTICATION',
  LOGOUT: 'AUTHENTICATION',
  LOGIN_FAILED: 'AUTHENTICATION',
  SESSION_EXPIRED: 'AUTHENTICATION',
  ROLE_CHANGED: 'ADMINISTRATION',
  USER_INVITED: 'ADMINISTRATION',
  USER_REMOVED: 'ADMINISTRATION',
  PERMISSIONS_CHANGED: 'ADMINISTRATION',
  EXPORT_CSV: 'EXPORT_IMPORT',
  EXPORT_PDF: 'EXPORT_IMPORT',
  IMPORT: 'EXPORT_IMPORT',
  BULK_UPDATE: 'DATA_CRUD',
  SETTINGS_CHANGED: 'SYSTEM',
  WEBHOOK_TRIGGERED: 'SYSTEM',
  ALERT_SENT: 'SYSTEM'
};

// ============================================================
// Audit Service Class
// ============================================================

class AuditService {
  constructor(provider = auditDbProvider) {
    this.provider = provider;
    this.requestIdHeader = 'x-request-id';
  }

  /**
   * Log an audit event
   */
  async log(organizationId, {
    action,
    entityType,
    entityId = null,
    entityName = null,
    oldValues = null,
    newValues = null,
    user = null,
    request = null,
    metadata = null,
    duration = null
  }) {
    if (!organizationId) {
      console.warn('Audit log skipped: no organizationId');
      return null;
    }

    const category = ACTION_CATEGORY_MAP[action] || 'SYSTEM';
    const changedFields = this.getChangedFields(oldValues, newValues);
    const changesSummary = this.generateChangesSummary(oldValues, newValues, changedFields);

    const logData = {
      action,
      category,
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      changedFields,
      changesSummary,
      userId: user?.id || null,
      userEmail: user?.email || null,
      userName: user?.name || null,
      userRole: user?.role || null,
      ipAddress: request ? this.getIpAddress(request) : null,
      userAgent: request?.headers?.['user-agent'] || null,
      sessionId: request?.sessionID || null,
      requestId: request?.headers?.[this.requestIdHeader] || uuidv4(),
      requestPath: request?.originalUrl || null,
      requestMethod: request?.method || null,
      duration,
      metadata
    };

    try {
      const log = await this.provider.createLog(organizationId, logData);
      
      // Trigger alerts asynchronously (don't await)
      this.processAlerts(organizationId, log).catch(console.error);
      
      return log;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Convenience methods for common actions
   */
  async logCreate(organizationId, entityType, entity, user, request) {
    return this.log(organizationId, {
      action: AUDIT_ACTIONS.CREATE,
      entityType,
      entityId: entity.id,
      entityName: entity.name || entity.title || entity.code || entity.id,
      newValues: entity,
      user,
      request
    });
  }

  async logUpdate(organizationId, entityType, entityId, oldEntity, newEntity, user, request) {
    return this.log(organizationId, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType,
      entityId,
      entityName: newEntity.name || newEntity.title || newEntity.code || entityId,
      oldValues: oldEntity,
      newValues: newEntity,
      user,
      request
    });
  }

  async logDelete(organizationId, entityType, entity, user, request) {
    return this.log(organizationId, {
      action: AUDIT_ACTIONS.DELETE,
      entityType,
      entityId: entity.id,
      entityName: entity.name || entity.title || entity.code || entity.id,
      oldValues: entity,
      user,
      request
    });
  }

  async logLogin(organizationId, user, request, success = true) {
    return this.log(organizationId, {
      action: success ? AUDIT_ACTIONS.LOGIN : AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'User',
      entityId: user?.id,
      entityName: user?.email,
      user,
      request,
      metadata: { success }
    });
  }

  async logLogout(organizationId, user, request) {
    return this.log(organizationId, {
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: 'User',
      entityId: user?.id,
      entityName: user?.email,
      user,
      request
    });
  }

  async logExport(organizationId, exportType, filters, user, request) {
    const action = exportType === 'csv' ? AUDIT_ACTIONS.EXPORT_CSV : AUDIT_ACTIONS.EXPORT_PDF;
    return this.log(organizationId, {
      action,
      entityType: 'Export',
      metadata: { exportType, filters },
      user,
      request
    });
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(organizationId, filters = {}, pagination = {}) {
    return this.provider.getLogs(organizationId, filters, pagination);
  }

  /**
   * Get single log by ID
   */
  async getLogById(organizationId, logId) {
    return this.provider.getLogById(organizationId, logId);
  }

  /**
   * Get logs for a specific entity (e.g., history of a Rock)
   */
  async getEntityHistory(organizationId, entityType, entityId) {
    return this.provider.getLogsByEntity(organizationId, entityType, entityId);
  }

  /**
   * Get statistics for dashboard
   */
  async getStats(organizationId, days = 30) {
    return this.provider.getStats(organizationId, days);
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Get changed fields between old and new values
   */
  getChangedFields(oldValues, newValues) {
    if (!oldValues || !newValues) return [];
    
    const fields = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    const changed = [];
    
    for (const field of fields) {
      // Skip internal fields
      if (['createdAt', 'updatedAt', 'id'].includes(field)) continue;
      
      const oldVal = JSON.stringify(oldValues[field]);
      const newVal = JSON.stringify(newValues[field]);
      
      if (oldVal !== newVal) {
        changed.push(field);
      }
    }
    
    return changed;
  }

  /**
   * Generate human-readable summary of changes
   */
  generateChangesSummary(oldValues, newValues, changedFields) {
    if (!changedFields.length) return null;
    
    const summaries = changedFields.slice(0, 5).map(field => {
      const oldVal = this.formatValue(oldValues?.[field]);
      const newVal = this.formatValue(newValues?.[field]);
      return `${field}: ${oldVal} → ${newVal}`;
    });
    
    if (changedFields.length > 5) {
      summaries.push(`+${changedFields.length - 5} שדות נוספים`);
    }
    
    return summaries.join(' | ');
  }

  /**
   * Format value for display
   */
  formatValue(value) {
    if (value === null || value === undefined) return '(ריק)';
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') {
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50);
    return String(value);
  }

  /**
   * Get IP address from request
   */
  getIpAddress(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           null;
  }

  // ============================================================
  // Alert Processing
  // ============================================================

  /**
   * Process alerts for an audit log entry
   */
  async processAlerts(organizationId, log) {
    try {
      // Get active alert configs for this org
      const configs = await prisma.auditAlertConfig.findMany({
        where: {
          organizationId,
          isActive: true,
          triggerActions: { has: log.action }
        }
      });

      for (const config of configs) {
        // Check if entity type matches
        if (config.triggerEntities.length > 0 && 
            !config.triggerEntities.includes('*') &&
            !config.triggerEntities.includes(log.entityType)) {
          continue;
        }

        // Create in-app notifications
        if (config.channelInApp) {
          await this.createNotifications(organizationId, config, log);
        }

        // TODO: Send email notifications
        // TODO: Send webhook notifications
      }
    } catch (error) {
      console.error('Error processing audit alerts:', error);
    }
  }

  /**
   * Create in-app notifications for alert
   */
  async createNotifications(organizationId, config, log) {
    const userIds = new Set(config.notifyUserIds);
    
    // Add users by role
    if (config.notifyRoles.length > 0) {
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: config.notifyRoles },
          isActive: true
        },
        select: { userId: true }
      });
      members.forEach(m => userIds.add(m.userId));
    }

    // Don't notify the user who performed the action
    userIds.delete(log.userId);

    if (userIds.size === 0) return;

    const title = this.getAlertTitle(log);
    const message = this.getAlertMessage(log);

    await prisma.auditNotification.createMany({
      data: [...userIds].map(userId => ({
        organizationId,
        userId,
        auditLogId: log.id,
        title,
        message,
        type: 'ALERT'
      }))
    });
  }

  /**
   * Get alert title
   */
  getAlertTitle(log) {
    const actionLabels = {
      CREATE: 'נוצר',
      UPDATE: 'עודכן',
      DELETE: 'נמחק',
      LOGIN_FAILED: 'כניסה נכשלה',
      ROLE_CHANGED: 'הרשאות שונו'
    };
    return `${actionLabels[log.action] || log.action}: ${log.entityType}`;
  }

  /**
   * Get alert message
   */
  getAlertMessage(log) {
    return `${log.userName || log.userEmail || 'משתמש'} ${log.action.toLowerCase()} ${log.entityName || log.entityType}`;
  }

  // ============================================================
  // Retention Management
  // ============================================================

  /**
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(organizationId) {
    const config = await prisma.auditRetentionConfig.findUnique({
      where: { organizationId }
    });

    const retentionDays = config?.retentionDays || 1095; // Default 3 years
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.provider.deleteLogs(organizationId, cutoffDate);
    return result;
  }

  /**
   * Run cleanup for all organizations
   */
  async runGlobalCleanup() {
    const configs = await prisma.auditRetentionConfig.findMany();
    const results = [];

    for (const config of configs) {
      try {
        const result = await this.cleanupOldLogs(config.organizationId);
        results.push({ organizationId: config.organizationId, ...result });
      } catch (error) {
        results.push({ organizationId: config.organizationId, error: error.message });
      }
    }

    return results;
  }
}

// Export singleton instance
const auditService = new AuditService();

module.exports = {
  auditService,
  AuditService,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES
};


