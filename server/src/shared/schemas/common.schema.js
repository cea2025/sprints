/**
 * Common Schemas
 * סכמות משותפות לכל המודולים
 */

const { z } = require('zod');

// UUID schema
const uuid = z.string().uuid();

// Optional UUID (can be empty string or null)
const optionalUuid = z.string().uuid().nullable().optional()
  .transform(val => val === '' ? null : val);

// Pagination query schema
const paginationQuery = z.object({
  page: z.string().optional().transform(val => parseInt(val) || 1),
  limit: z.string().optional().transform(val => parseInt(val) || 50)
});

// Year schema (2020-2100)
const year = z.coerce.number().int().min(2020).max(2100);

// Quarter schema (1-4)
const quarter = z.coerce.number().int().min(1).max(4);

// Progress schema (0-100)
const progress = z.coerce.number().int().min(0).max(100);

// ID param schema
const idParam = z.object({
  id: uuid
});

module.exports = {
  uuid,
  optionalUuid,
  paginationQuery,
  year,
  quarter,
  progress,
  idParam
};

