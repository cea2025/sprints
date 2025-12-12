/**
 * Sprint Schemas
 * סכמות אימות לספרינטים
 */

const { z } = require('zod');
const { year, quarter } = require('./common.schema');

// Create Sprint schema
const createSprintSchema = z.object({
  name: z.string().min(1, 'שם הוא שדה חובה').max(50).optional(), // Auto-generated if not provided (sp-XX)
  goal: z.string().max(500).optional().nullable(),
  // Backward compatibility (legacy fields). Server computes these from startDate and existing data.
  year: year.optional(),
  quarter: quarter.optional(),
  sprintNumber: z.coerce.number().int().min(1).max(10).optional(),
  teamId: z.string().optional().nullable(),
  rockIds: z.array(z.string()).optional(),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val))
}).refine(data => data.endDate > data.startDate, {
  message: 'תאריך סיום חייב להיות אחרי תאריך התחלה',
  path: ['endDate']
});

// Update Sprint schema
const updateSprintSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  goal: z.string().max(500).optional().nullable(),
  teamId: z.string().optional().nullable(),
  rockIds: z.array(z.string()).optional(),
  year: year.optional(),
  quarter: quarter.optional(),
  sprintNumber: z.coerce.number().int().min(1).max(10).optional(),
  startDate: z.string().transform(val => new Date(val)).optional(),
  endDate: z.string().transform(val => new Date(val)).optional()
});

// Query schema
const sprintQuerySchema = z.object({
  year: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  quarter: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  state: z.enum(['PLANNED', 'ACTIVE', 'CLOSED']).optional()
});

module.exports = {
  createSprintSchema,
  updateSprintSchema,
  sprintQuerySchema
};

