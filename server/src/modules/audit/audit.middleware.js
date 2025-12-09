/**
 * Audit Middleware
 * 
 * Automatically captures CRUD operations and logs them to the audit system.
 * Can be applied to routes or used programmatically.
 */

const { auditService, AUDIT_ACTIONS } = require('./audit.service');
const { getOrganizationId } = require('../../middleware/organization');

/**
 * Create middleware that automatically logs operations
 * 
 * Usage:
 * router.post('/rocks', auditMiddleware('Rock'), createRock);
 * router.put('/rocks/:id', auditMiddleware('Rock'), updateRock);
 * router.delete('/rocks/:id', auditMiddleware('Rock'), deleteRock);
 */
function auditMiddleware(entityType, options = {}) {
  const {
    getEntityName = (req, res) => res.locals.entityName || null,
    getOldEntity = (req, res) => res.locals.oldEntity || null,
    getNewEntity = (req, res) => res.locals.newEntity || res.locals.entity || null,
    skipCondition = () => false
  } = options;

  return async (req, res, next) => {
    // Store start time for duration calculation
    const startTime = Date.now();
    
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = async function(data) {
      // Call original json first
      const result = originalJson(data);

      // Skip if condition met
      if (skipCondition(req, res, data)) {
        return result;
      }

      try {
        const organizationId = await getOrganizationId(req);
        if (!organizationId) return result;

        const duration = Date.now() - startTime;
        const action = getActionFromMethod(req.method);
        
        // Get entity details
        let entityId = req.params.id || data?.id;
        let entityName = getEntityName(req, res) || data?.name || data?.title || data?.code;
        let oldEntity = getOldEntity(req, res);
        let newEntity = getNewEntity(req, res) || data;

        // Only log successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await auditService.log(organizationId, {
            action,
            entityType,
            entityId,
            entityName,
            oldValues: oldEntity,
            newValues: action !== AUDIT_ACTIONS.DELETE ? newEntity : null,
            user: req.user,
            request: req,
            duration
          });
        }
      } catch (error) {
        console.error('Audit middleware error:', error);
        // Don't fail the request if audit fails
      }

      return result;
    };

    next();
  };
}

/**
 * Get action from HTTP method
 */
function getActionFromMethod(method) {
  switch (method.toUpperCase()) {
    case 'POST': return AUDIT_ACTIONS.CREATE;
    case 'PUT':
    case 'PATCH': return AUDIT_ACTIONS.UPDATE;
    case 'DELETE': return AUDIT_ACTIONS.DELETE;
    default: return AUDIT_ACTIONS.READ;
  }
}

/**
 * Middleware to capture old entity before update/delete
 * Should be used BEFORE the actual operation
 * 
 * Usage:
 * router.put('/rocks/:id', captureOldEntity(prisma.rock), updateRock);
 */
function captureOldEntity(model, idParam = 'id') {
  return async (req, res, next) => {
    try {
      const id = req.params[idParam];
      if (id) {
        const entity = await model.findUnique({ where: { id } });
        res.locals.oldEntity = entity;
      }
    } catch (error) {
      console.error('Error capturing old entity:', error);
    }
    next();
  };
}

/**
 * Express middleware to add request ID for tracing
 */
function addRequestId(req, res, next) {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = require('uuid').v4();
  }
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
}

/**
 * Helper to log page views (for READ operations)
 */
async function logPageView(req, organizationId, pageName) {
  if (!organizationId) return;
  
  await auditService.log(organizationId, {
    action: AUDIT_ACTIONS.READ,
    entityType: 'Page',
    entityName: pageName,
    user: req.user,
    request: req
  });
}

/**
 * Wrapper function for route handlers to auto-audit
 * 
 * Usage:
 * router.post('/rocks', withAudit('Rock', createRock));
 */
function withAudit(entityType, handler, options = {}) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // Capture old entity for updates/deletes
      if (['PUT', 'PATCH', 'DELETE'].includes(req.method) && req.params.id) {
        // This would need the model passed in options
        // res.locals.oldEntity = await options.model?.findUnique({ where: { id: req.params.id } });
      }

      // Call original handler
      await handler(req, res, next);
      
    } finally {
      // Log after handler completes (in finally to ensure it runs)
      const duration = Date.now() - startTime;
      
      try {
        const organizationId = await getOrganizationId(req);
        if (organizationId && res.statusCode >= 200 && res.statusCode < 300) {
          const action = getActionFromMethod(req.method);
          const entity = res.locals.entity || res.locals.result;
          
          await auditService.log(organizationId, {
            action,
            entityType,
            entityId: req.params.id || entity?.id,
            entityName: entity?.name || entity?.title || entity?.code,
            oldValues: res.locals.oldEntity,
            newValues: entity,
            user: req.user,
            request: req,
            duration
          });
        }
      } catch (error) {
        console.error('Audit error:', error);
      }
    }
  };
}

module.exports = {
  auditMiddleware,
  captureOldEntity,
  addRequestId,
  logPageView,
  withAudit,
  getActionFromMethod
};

