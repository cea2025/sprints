/**
 * Story Schemas
 * סכמות אימות לאבני דרך
 */

const { z } = require('zod');
const { uuid, optionalUuid, progress } = require('./common.schema');

// Create Story schema
const createStorySchema = z.object({
  title: z.string().min(1, 'כותרת היא שדה חובה').max(200),
  description: z.string().max(2000).optional().nullable(),
  progress: progress.optional().default(0),
  isBlocked: z.boolean().optional().default(false),
  sprintId: uuid,
  rockId: optionalUuid,
  ownerId: optionalUuid
});

// Update Story schema
const updateStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  progress: progress.optional(),
  isBlocked: z.boolean().optional(),
  sprintId: uuid.optional(),
  rockId: optionalUuid,
  ownerId: optionalUuid
});

// Update progress schema
const updateStoryProgressSchema = z.object({
  progress: progress
});

// Query schema
const storyQuerySchema = z.object({
  sprintId: z.string().uuid().optional(),
  rockId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  isBlocked: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
});

module.exports = {
  createStorySchema,
  updateStorySchema,
  updateStoryProgressSchema,
  storyQuerySchema
};

