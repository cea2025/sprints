/**
 * Rock Schemas
 * סכמות אימות לסלעים
 */

const { z } = require('zod');
const { optionalUuid, year, quarter, progress } = require('./common.schema');

// Create Rock schema
const createRockSchema = z.object({
  code: z.string().min(1, 'קוד הוא שדה חובה').max(50),
  name: z.string().min(1, 'שם הוא שדה חובה').max(200),
  description: z.string().max(1000).optional().nullable(),
  year: year,
  quarter: quarter,
  progress: progress.optional().default(0),
  ownerId: optionalUuid,
  objectiveId: optionalUuid
});

// Update Rock schema (all fields optional)
const updateRockSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  year: year.optional(),
  quarter: quarter.optional(),
  progress: progress.optional(),
  ownerId: optionalUuid,
  objectiveId: optionalUuid,
  isCarriedOver: z.boolean().optional(),
  carriedFromQuarter: quarter.optional().nullable()
});

// Update progress schema
const updateProgressSchema = z.object({
  progress: progress
});

// Query schema for filtering rocks
const rockQuerySchema = z.object({
  year: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  quarter: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  objectiveId: z.string().uuid().optional()
});

module.exports = {
  createRockSchema,
  updateRockSchema,
  updateProgressSchema,
  rockQuerySchema
};

