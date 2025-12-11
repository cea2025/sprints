const express = require('express');
const prisma = require('../lib/prisma');
const { isAuthenticated } = require('../middleware/auth');
const { getOrganizationId } = require('../middleware/organization');
const { requireRole } = require('../middleware/permissions');
const { auditMiddleware, captureOldEntity } = require('../modules/audit/audit.middleware');

const router = express.Router();

router.use(isAuthenticated);

/**
 * @route   GET /api/labels
 * @desc    List organization labels
 * @query   includeInactive=true|false
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const includeInactive = req.query.includeInactive === 'true';

    const labels = await prisma.label.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: [{ name: 'asc' }]
    });

    res.json(labels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ error: 'שגיאה בטעינת תוויות' });
  }
});

/**
 * @route   POST /api/labels
 * @desc    Create label (Admin/Manager)
 */
router.post('/', requireRole('MANAGER'), auditMiddleware('Label'), async (req, res) => {
  try {
    const organizationId = await getOrganizationId(req);
    if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

    const { name, color, isActive } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'נדרש שם תווית' });
    }

    const label = await prisma.label.create({
      data: {
        organizationId,
        name: name.trim(),
        color: color || null,
        isActive: isActive !== undefined ? !!isActive : true,
        createdBy: req.user.id
      }
    });

    res.locals.entity = label;
    res.status(201).json(label);
  } catch (error) {
    console.error('Error creating label:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'תווית עם שם זה כבר קיימת' });
    }
    res.status(500).json({ error: 'שגיאה ביצירת תווית' });
  }
});

/**
 * @route   PUT /api/labels/:id
 * @desc    Update label (Admin/Manager)
 */
router.put(
  '/:id',
  requireRole('MANAGER'),
  captureOldEntity(prisma.label),
  auditMiddleware('Label'),
  async (req, res) => {
    try {
      const organizationId = await getOrganizationId(req);
      if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

      const { name, color, isActive } = req.body || {};

      const existing = await prisma.label.findFirst({
        where: { id: req.params.id, organizationId },
        select: { id: true }
      });
      if (!existing) return res.status(404).json({ error: 'תווית לא נמצאה' });

      const label = await prisma.label.update({
        where: { id: req.params.id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          color: color !== undefined ? (color || null) : undefined,
          isActive: isActive !== undefined ? !!isActive : undefined
        }
      });

      res.locals.entity = label;
      res.json(label);
    } catch (error) {
      console.error('Error updating label:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'תווית עם שם זה כבר קיימת' });
      }
      res.status(500).json({ error: 'שגיאה בעדכון תווית' });
    }
  }
);

/**
 * @route   DELETE /api/labels/:id
 * @desc    Soft delete label (Admin/Manager)
 */
router.delete(
  '/:id',
  requireRole('MANAGER'),
  captureOldEntity(prisma.label),
  auditMiddleware('Label'),
  async (req, res) => {
    try {
      const organizationId = await getOrganizationId(req);
      if (!organizationId) return res.status(403).json({ error: 'לא נבחר ארגון' });

      const existing = await prisma.label.findFirst({
        where: { id: req.params.id, organizationId },
        select: { id: true }
      });
      if (!existing) return res.status(404).json({ error: 'תווית לא נמצאה' });

      await prisma.label.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });

      res.json({ ok: true });
    } catch (error) {
      console.error('Error deleting label:', error);
      res.status(500).json({ error: 'שגיאה במחיקת תווית' });
    }
  }
);

module.exports = router;


