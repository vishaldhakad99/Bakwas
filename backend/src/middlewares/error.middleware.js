import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { ENV } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || []
  };

  if (ENV.NODE_ENV !== 'production' && error.stack) {
    response.stack = error.stack;
  }

  logger.error(`[${req.method}] ${req.originalUrl} - ${error.statusCode} - ${error.message}`);

  return res.status(error.statusCode).json(response);
};
