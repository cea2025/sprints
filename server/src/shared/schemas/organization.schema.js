/**
 * Organization Schemas
 * סכמות אימות לארגונים
 */

const { z } = require('zod');

// Create Organization schema
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'שם הוא שדה חובה').max(100),
  slug: z.string().min(1).max(50)
    .regex(/^[a-z0-9-]+$/, 'slug חייב להכיל רק אותיות קטנות, מספרים ומקפים'),
  logo: z.string().url().optional().nullable(),
  settings: z.object({}).passthrough().optional().nullable()
});

// Update Organization schema
const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50)
    .regex(/^[a-z0-9-]+$/, 'slug חייב להכיל רק אותיות קטנות, מספרים ומקפים')
    .optional(),
  logo: z.string().url().optional().nullable(),
  settings: z.object({}).passthrough().optional().nullable(),
  isActive: z.boolean().optional()
});

// Add member schema
const addMemberSchema = z.object({
  email: z.string().email('כתובת מייל לא תקינה'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']).optional().default('VIEWER')
});

// Update member role schema
const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'])
});

// Select organization schema
const selectOrganizationSchema = z.object({
  organizationId: z.string().uuid()
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  selectOrganizationSchema
};

