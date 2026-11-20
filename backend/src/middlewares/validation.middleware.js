import { ApiError } from '../utils/apiError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new ApiError(400, 'Validation Failed', errorMessages);
    }

    // Assign sanitized data
    req.body = parsed.data.body || req.body;
    req.query = parsed.data.query || req.query;
    req.params = parsed.data.params || req.params;

    next();
  } catch (error) {
    next(error);
  }
};
