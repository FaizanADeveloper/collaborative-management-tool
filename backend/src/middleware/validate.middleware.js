/**
 * Generic request body validation middleware using Zod
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate;
