// zodErrorMapper.js
const { z } = require("zod");

/**
 * Maps Zod validation errors into a structured object.
 *
 * @param {Error} err - The error object to check and map.
 * @returns {Object|null} A mapped error object if ZodError, else null.
 */
const mapZodErrors = (err) => {
  if (err instanceof z.ZodError) {
    return err.errors.reduce((acc, issue) => {
      acc[issue.path.join(".")] = issue.message;
      return acc;
    }, {});
  }
  return null;
};

module.exports = mapZodErrors;
