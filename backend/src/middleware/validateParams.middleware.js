/**
 * Request parameter validation middleware using Zod
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 */
const validateParams = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.params);
    req.params = parsed;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateParams;
