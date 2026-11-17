/**
 * Request query validation middleware using Zod
 * Parses and replaces req.query with coerced, validated values.
 *
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.query);
    req.query = parsed;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateQuery;
