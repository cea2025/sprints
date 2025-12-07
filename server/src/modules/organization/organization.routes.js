/**
 * Organization Routes
 * API endpoints לניהול ארגונים
 */

const express = require('express');
const router = express.Router();
const organizationService = require('./organization.service');
const { isAuthenticated } = require('../../middleware/auth');
const { validateBody } = require('../../shared/middleware/validation.middleware');
const { asyncHandler } = require('../../shared/middleware/error.middleware');
const {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  selectOrganizationSchema
} = require('../../shared/schemas/organization.schema');

// All routes require authentication
router.use(isAuthenticated);

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations for current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const organizations = await organizationService.getUserOrganizations(req.user.id);
  res.json(organizations);
}));

/**
 * @route   POST /api/organizations
 * @desc    Create new organization
 */
router.post('/', validateBody(createOrganizationSchema), asyncHandler(async (req, res) => {
  const organization = await organizationService.create(req.body, req.user.id);
  res.status(201).json(organization);
}));

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const organization = await organizationService.getById(req.params.id, req.user.id);
  res.json(organization);
}));

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 */
router.put('/:id', validateBody(updateOrganizationSchema), asyncHandler(async (req, res) => {
  const organization = await organizationService.update(req.params.id, req.body, req.user.id);
  res.json(organization);
}));

/**
 * @route   POST /api/organizations/:id/members
 * @desc    Add member to organization
 */
router.post('/:id/members', validateBody(addMemberSchema), asyncHandler(async (req, res) => {
  const result = await organizationService.addMember(
    req.params.id,
    req.body.email,
    req.body.role,
    req.user.id
  );
  res.status(201).json(result);
}));

/**
 * @route   PUT /api/organizations/:id/members/:memberId
 * @desc    Update member role
 */
router.put('/:id/members/:memberId', validateBody(updateMemberRoleSchema), asyncHandler(async (req, res) => {
  const member = await organizationService.updateMemberRole(
    req.params.id,
    req.params.memberId,
    req.body.role,
    req.user.id
  );
  res.json(member);
}));

/**
 * @route   DELETE /api/organizations/:id/members/:memberId
 * @desc    Remove member from organization
 */
router.delete('/:id/members/:memberId', asyncHandler(async (req, res) => {
  await organizationService.removeMember(req.params.id, req.params.memberId, req.user.id);
  res.json({ message: 'החבר הוסר מהארגון' });
}));

/**
 * @route   POST /api/organizations/select
 * @desc    Set active organization for session
 */
router.post('/select', validateBody(selectOrganizationSchema), asyncHandler(async (req, res) => {
  const result = await organizationService.setActiveOrganization(req.user.id, req.body.organizationId);
  
  // Save to session
  req.session.organizationId = result.organizationId;
  req.session.organizationName = result.organizationName;
  req.session.organizationRole = result.role;
  
  res.json(result);
}));

/**
 * @route   GET /api/organizations/current
 * @desc    Get current active organization from session
 */
router.get('/current', asyncHandler(async (req, res) => {
  if (!req.session.organizationId) {
    return res.json({ organization: null });
  }
  
  const organization = await organizationService.getById(req.session.organizationId, req.user.id);
  res.json({ organization });
}));

module.exports = router;

