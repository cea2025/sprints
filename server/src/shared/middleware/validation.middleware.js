/**
 * Validation Middleware
 * מאמת נתונים נכנסים באמצעות Zod schemas
 */

/**
 * Creates a validation middleware from a Zod schema
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @param {'body' | 'query' | 'params'} source - Where to get data from
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      // Zod errors will be caught by error middleware
      next(error);
    }
  };
};

/**
 * Validates body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validates query parameters
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validates URL params
 */
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams
};

