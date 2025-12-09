/**
 * Objective Schemas
 * סכמות אימות לפרויקטים
 */

const { z } = require('zod');
const { optionalUuid } = require('./common.schema');

// Create Objective schema
const createObjectiveSchema = z.object({
  code: z.string().min(1, 'קוד הוא שדה חובה').max(50),
  name: z.string().min(1, 'שם הוא שדה חובה').max(200),
  description: z.string().max(2000).optional().nullable(),
  ownerId: optionalUuid
});

// Update Objective schema
const updateObjectiveSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  ownerId: optionalUuid
});

module.exports = {
  createObjectiveSchema,
  updateObjectiveSchema
};

