/**
 * Audit Log Routes
 * 
 * API endpoints for accessing and managing audit logs.
 */

const express = require('express');
const router = express.Router();
const { auditService, AUDIT_ACTIONS, AUDIT_CATEGORIES } = require('./audit.service');
const { isAuthenticated } = require('../../middleware/auth');
const { getOrganizationId } = require('../../middleware/organization');
const prisma = require('../../lib/prisma');

// All routes require authentication
router.use(isAuthenticated);

// ============================================================
// Audit Logs
// ============================================================

/**
 * @route   GET /api/audit
 * @desc    Get audit logs with filters
 * @access  Admin, Manager (limited)
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check permissions
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || membership.role === 'VIEWER') {
      return res.status(403).json({ error: 'אין הרשאה לצפות בלוגים' });
    }

    // Build filters
    const filters = {};
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.action) filters.action = req.query.action;
    if (req.query.actions) filters.actions = req.query.actions.split(',');
    if (req.query.category) filters.category = req.query.category;
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.entityId) filters.entityId = req.query.entityId;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.query.search) filters.search = req.query.search;

    // For MEMBER role, only show their own logs
    if (membership.role === 'MEMBER') {
      filters.userId = req.user.id;
    }

    // Pagination
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 50, 100),
      orderBy: req.query.orderBy || 'createdAt',
      order: req.query.order || 'desc'
    };

    const result = await auditService.getLogs(organizationId, filters, pagination);
    res.json(result);

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הלוגים' });
  }
});

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit statistics for dashboard
 * @access  Admin only
 */
router.get('/stats', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check admin permission
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || !['ADMIN', 'MANAGER'].includes(membership.role)) {
      return res.status(403).json({ error: 'נדרשת הרשאת מנהל' });
    }

    const days = parseInt(req.query.days) || 30;
    const stats = await auditService.getStats(organizationId, days);
    res.json(stats);

  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הסטטיסטיקות' });
  }
});

/**
 * @route   GET /api/audit/entity/:entityType/:entityId
 * @desc    Get audit history for a specific entity
 * @access  Admin, Manager
 */
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    const { entityType, entityId } = req.params;
    const logs = await auditService.getEntityHistory(organizationId, entityType, entityId);
    res.json(logs);

  } catch (error) {
    console.error('Error fetching entity history:', error);
    res.status(500).json({ error: 'שגיאה בטעינת היסטוריית הישות' });
  }
});

/**
 * @route   GET /api/audit/:id
 * @desc    Get single audit log detail
 * @access  Admin, Manager
 */
router.get('/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    const log = await auditService.getLogById(organizationId, req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'לוג לא נמצא' });
    }

    res.json(log);

  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הלוג' });
  }
});

/**
 * @route   GET /api/audit/export/csv
 * @desc    Export audit logs as CSV
 * @access  Admin only
 */
router.get('/export/csv', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check admin permission
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'נדרשת הרשאת מנהל' });
    }

    // Get all logs (with reasonable limit)
    const filters = {};
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const result = await auditService.getLogs(organizationId, filters, { limit: 10000 });

    // Log the export action
    await auditService.logExport(organizationId, 'csv', filters, req.user, req);

    // Convert to CSV
    const csv = convertToCSV(result.logs);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv); // BOM for Excel Hebrew support

  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'שגיאה בייצוא הלוגים' });
  }
});

// ============================================================
// Notifications
// ============================================================

/**
 * @route   GET /api/audit/notifications
 * @desc    Get user's audit notifications
 * @access  Authenticated
 */
router.get('/notifications/me', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    const notifications = await prisma.auditNotification.findMany({
      where: {
        organizationId,
        userId: req.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notifications);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'שגיאה בטעינת ההתראות' });
  }
});

/**
 * @route   PUT /api/audit/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Authenticated
 */
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.auditNotification.update({
      where: { id: req.params.id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json(notification);

  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'שגיאה בעדכון ההתראה' });
  }
});

/**
 * @route   PUT /api/audit/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Authenticated
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    
    await prisma.auditNotification.updateMany({
      where: {
        organizationId,
        userId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: 'כל ההתראות סומנו כנקראו' });

  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'שגיאה בעדכון ההתראות' });
  }
});

// ============================================================
// Meta (for UI dropdowns)
// ============================================================

/**
 * @route   GET /api/audit/meta/actions
 * @desc    Get available action types
 * @access  Authenticated
 */
router.get('/meta/actions', (req, res) => {
  res.json(Object.values(AUDIT_ACTIONS));
});

/**
 * @route   GET /api/audit/meta/categories
 * @desc    Get available categories
 * @access  Authenticated
 */
router.get('/meta/categories', (req, res) => {
  res.json(Object.values(AUDIT_CATEGORIES));
});

// ============================================================
// Alert Configurations
// ============================================================

/**
 * @route   GET /api/audit/alerts
 * @desc    Get all alert configurations
 * @access  Admin only
 */
router.get('/alerts', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check admin permission
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'נדרשת הרשאת מנהל' });
    }

    const configs = await prisma.auditAlertConfig.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(configs);

  } catch (error) {
    console.error('Error fetching alert configs:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הגדרות ההתראות' });
  }
});

/**
 * @route   POST /api/audit/alerts
 * @desc    Create new alert configuration
 * @access  Admin only
 */
router.post('/alerts', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check admin permission
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'נדרשת הרשאת מנהל' });
    }

    const config = await prisma.auditAlertConfig.create({
      data: {
        organizationId,
        name: req.body.name,
        description: req.body.description,
        triggerActions: req.body.triggerActions || [],
        triggerEntities: req.body.triggerEntities || ['*'],
        notifyRoles: req.body.notifyRoles || ['ADMIN'],
        notifyUserIds: req.body.notifyUserIds || [],
        channelEmail: req.body.channelEmail ?? false,
        channelInApp: req.body.channelInApp ?? true,
        channelWebhook: req.body.channelWebhook ?? false,
        webhookUrl: req.body.webhookUrl,
        webhookSecret: req.body.webhookSecret,
        cooldownMinutes: req.body.cooldownMinutes || 5,
        isActive: true,
        createdBy: req.user.id
      }
    });

    res.status(201).json(config);

  } catch (error) {
    console.error('Error creating alert config:', error);
    res.status(500).json({ error: 'שגיאה ביצירת הגדרת התראה' });
  }
});

/**
 * @route   PUT /api/audit/alerts/:id
 * @desc    Update alert configuration
 * @access  Admin only
 */
router.put('/alerts/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check admin permission
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'נדרשת הרשאת מנהל' });
    }

    const config = await prisma.auditAlertConfig.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        triggerActions: req.body.triggerActions,
        triggerEntities: req.body.triggerEntities,
        notifyRoles: req.body.notifyRoles,
        notifyUserIds: req.body.notifyUserIds,
        channelEmail: req.body.channelEmail,
        channelInApp: req.body.channelInApp,
        channelWebhook: req.body.channelWebhook,
        webhookUrl: req.body.webhookUrl,
        webhookSecret: req.body.webhookSecret,
        cooldownMinutes: req.body.cooldownMinutes,
        isActive: req.body.isActive
      }
    });

    res.json(config);

  } catch (error) {
    console.error('Error updating alert config:', error);
    res.status(500).json({ error: 'שגיאה בעדכון הגדרת התראה' });
  }
});

/**
 * @route   DELETE /api/audit/alerts/:id
 * @desc    Delete alert configuration
 * @access  Admin only
 */
router.delete('/alerts/:id', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) {
      return res.status(403).json({ error: 'לא נבחר ארגון' });
    }

    // Check admin permission
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.user.id, organizationId }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'נדרשת הרשאת מנהל' });
    }

    await prisma.auditAlertConfig.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'התראה נמחקה בהצלחה' });

  } catch (error) {
    console.error('Error deleting alert config:', error);
    res.status(500).json({ error: 'שגיאה במחיקת הגדרת התראה' });
  }
});

// ============================================================
// Helpers
// ============================================================

function convertToCSV(logs) {
  const headers = [
    'תאריך',
    'שעה',
    'משתמש',
    'אימייל',
    'פעולה',
    'קטגוריה',
    'סוג ישות',
    'שם ישות',
    'שינויים',
    'IP'
  ];

  const rows = logs.map(log => [
    new Date(log.createdAt).toLocaleDateString('he-IL'),
    new Date(log.createdAt).toLocaleTimeString('he-IL'),
    log.userName || '',
    log.userEmail || '',
    log.action,
    log.category,
    log.entityType,
    log.entityName || '',
    log.changesSummary || '',
    log.ipAddress || ''
  ]);

  return [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

module.exports = router;


