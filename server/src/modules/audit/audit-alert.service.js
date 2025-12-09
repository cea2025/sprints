/**
 * Audit Alert Service
 * 
 * Handles alert configuration and notification dispatch for audit events.
 */

const prisma = require('../../lib/prisma');

// In-memory cache for alert configs (refreshed periodically)
let alertConfigCache = new Map(); // organizationId -> configs[]
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

// Track recent alerts to prevent spam (cooldown)
const recentAlerts = new Map(); // `${configId}-${entityId}` -> timestamp

/**
 * Get alert configurations for an organization (with caching)
 */
async function getAlertConfigs(organizationId) {
  const now = Date.now();
  
  // Check cache
  if (now - lastCacheUpdate < CACHE_TTL && alertConfigCache.has(organizationId)) {
    return alertConfigCache.get(organizationId);
  }
  
  try {
    const configs = await prisma.auditAlertConfig.findMany({
      where: {
        organizationId,
        isActive: true
      }
    });
    
    alertConfigCache.set(organizationId, configs);
    lastCacheUpdate = now;
    
    return configs;
  } catch (error) {
    console.error('Error loading alert configs:', error);
    return [];
  }
}

/**
 * Check if an audit event should trigger alerts and send them
 */
async function processAuditEvent(auditLog) {
  try {
    const configs = await getAlertConfigs(auditLog.organizationId);
    
    for (const config of configs) {
      if (shouldTriggerAlert(config, auditLog)) {
        await sendAlert(config, auditLog);
      }
    }
  } catch (error) {
    console.error('Error processing audit event for alerts:', error);
  }
}

/**
 * Check if config matches the audit event
 */
function shouldTriggerAlert(config, auditLog) {
  // Check cooldown
  const cooldownKey = `${config.id}-${auditLog.entityId || 'none'}`;
  const lastAlertTime = recentAlerts.get(cooldownKey);
  if (lastAlertTime && Date.now() - lastAlertTime < config.cooldownMinutes * 60 * 1000) {
    return false;
  }
  
  // Check action match
  const actionMatches = config.triggerActions.includes('*') || 
                        config.triggerActions.includes(auditLog.action);
  
  // Check entity match
  const entityMatches = config.triggerEntities.includes('*') || 
                        config.triggerEntities.includes(auditLog.entityType);
  
  return actionMatches && entityMatches;
}

/**
 * Send alert through configured channels
 */
async function sendAlert(config, auditLog) {
  const cooldownKey = `${config.id}-${auditLog.entityId || 'none'}`;
  recentAlerts.set(cooldownKey, Date.now());
  
  // Clean old cooldown entries (every 100 alerts)
  if (recentAlerts.size > 1000) {
    const cutoff = Date.now() - 3600000; // 1 hour
    for (const [key, time] of recentAlerts) {
      if (time < cutoff) recentAlerts.delete(key);
    }
  }
  
  // Send in-app notification
  if (config.channelInApp) {
    await sendInAppNotification(config, auditLog);
  }
  
  // Send email (if implemented)
  if (config.channelEmail) {
    await sendEmailNotification(config, auditLog);
  }
  
  // Send webhook
  if (config.channelWebhook && config.webhookUrl) {
    await sendWebhookNotification(config, auditLog);
  }
  
  console.log(`🔔 Alert sent: ${config.name} for ${auditLog.action} on ${auditLog.entityType}`);
}

/**
 * Create in-app notification records
 */
async function sendInAppNotification(config, auditLog) {
  try {
    // Get users to notify
    const userIds = new Set(config.notifyUserIds || []);
    
    // Add users by role
    if (config.notifyRoles && config.notifyRoles.length > 0) {
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: auditLog.organizationId,
          role: { in: config.notifyRoles },
          isActive: true
        },
        select: { userId: true }
      });
      members.forEach(m => userIds.add(m.userId));
    }
    
    // Create notification for each user
    for (const userId of userIds) {
      // Don't notify the user who triggered the event
      if (userId === auditLog.userId) continue;
      
      await prisma.auditNotification.create({
        data: {
          organizationId: auditLog.organizationId,
          userId,
          alertConfigId: config.id,
          auditLogId: auditLog.id,
          title: config.name,
          message: formatAlertMessage(auditLog),
          severity: getSeverity(auditLog.action)
        }
      });
    }
  } catch (error) {
    console.error('Error sending in-app notification:', error);
  }
}

/**
 * Send email notification (placeholder - implement with actual email service)
 */
async function sendEmailNotification(config, auditLog) {
  // TODO: Implement email sending with nodemailer or similar
  console.log(`📧 Email notification would be sent for: ${config.name}`);
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(config, auditLog) {
  try {
    const payload = {
      event: 'audit_alert',
      alert: {
        name: config.name,
        description: config.description
      },
      audit: {
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        entityName: auditLog.entityName,
        userName: auditLog.userName,
        userEmail: auditLog.userEmail,
        timestamp: auditLog.createdAt,
        changedFields: auditLog.changedFields
      }
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add signature if secret is configured
    if (config.webhookSecret) {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }
    
    await fetch(config.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
  } catch (error) {
    console.error('Error sending webhook notification:', error);
  }
}

/**
 * Format human-readable alert message
 */
function formatAlertMessage(auditLog) {
  const actionLabels = {
    CREATE: 'יצר',
    UPDATE: 'עדכן',
    DELETE: 'מחק',
    LOGIN: 'התחבר',
    LOGOUT: 'התנתק',
    EXPORT: 'ייצא'
  };
  
  const entityLabels = {
    Rock: 'סלע',
    Story: 'אבן דרך',
    Sprint: 'ספרינט',
    Objective: 'מטרה',
    TeamMember: 'חבר צוות',
    User: 'משתמש',
    Organization: 'ארגון'
  };
  
  const action = actionLabels[auditLog.action] || auditLog.action;
  const entity = entityLabels[auditLog.entityType] || auditLog.entityType;
  const entityName = auditLog.entityName ? `"${auditLog.entityName}"` : '';
  
  return `${auditLog.userName || 'משתמש'} ${action} ${entity} ${entityName}`.trim();
}

/**
 * Get severity based on action
 */
function getSeverity(action) {
  switch (action) {
    case 'DELETE':
      return 'high';
    case 'UPDATE':
      return 'medium';
    case 'CREATE':
      return 'low';
    default:
      return 'info';
  }
}

/**
 * Clear the alert config cache (call after config changes)
 */
function clearCache(organizationId) {
  if (organizationId) {
    alertConfigCache.delete(organizationId);
  } else {
    alertConfigCache.clear();
  }
  lastCacheUpdate = 0;
}

// ============================================================
// CRUD Operations for Alert Configs
// ============================================================

/**
 * Create a new alert configuration
 */
async function createAlertConfig(organizationId, data, userId) {
  const config = await prisma.auditAlertConfig.create({
    data: {
      organizationId,
      name: data.name,
      description: data.description,
      triggerActions: data.triggerActions || [],
      triggerEntities: data.triggerEntities || ['*'],
      notifyRoles: data.notifyRoles || ['ADMIN'],
      notifyUserIds: data.notifyUserIds || [],
      channelEmail: data.channelEmail ?? false,
      channelInApp: data.channelInApp ?? true,
      channelWebhook: data.channelWebhook ?? false,
      webhookUrl: data.webhookUrl,
      webhookSecret: data.webhookSecret,
      cooldownMinutes: data.cooldownMinutes || 5,
      isActive: true,
      createdBy: userId
    }
  });
  
  clearCache(organizationId);
  return config;
}

/**
 * Update an alert configuration
 */
async function updateAlertConfig(organizationId, configId, data) {
  const config = await prisma.auditAlertConfig.update({
    where: { id: configId },
    data: {
      name: data.name,
      description: data.description,
      triggerActions: data.triggerActions,
      triggerEntities: data.triggerEntities,
      notifyRoles: data.notifyRoles,
      notifyUserIds: data.notifyUserIds,
      channelEmail: data.channelEmail,
      channelInApp: data.channelInApp,
      channelWebhook: data.channelWebhook,
      webhookUrl: data.webhookUrl,
      webhookSecret: data.webhookSecret,
      cooldownMinutes: data.cooldownMinutes,
      isActive: data.isActive
    }
  });
  
  clearCache(organizationId);
  return config;
}

/**
 * Delete an alert configuration
 */
async function deleteAlertConfig(organizationId, configId) {
  await prisma.auditAlertConfig.delete({
    where: { id: configId }
  });
  
  clearCache(organizationId);
}

/**
 * Get all alert configurations for an organization
 */
async function listAlertConfigs(organizationId) {
  return prisma.auditAlertConfig.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get single alert configuration
 */
async function getAlertConfig(configId) {
  return prisma.auditAlertConfig.findUnique({
    where: { id: configId }
  });
}

module.exports = {
  processAuditEvent,
  createAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  listAlertConfigs,
  getAlertConfig,
  clearCache
};

