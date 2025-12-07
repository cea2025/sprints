/**
 * Error Handler Middleware
 * מטפל בכל השגיאות במקום מרכזי
 */

const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'כבר קיים רשומה עם ערך זה',
      code: 'DUPLICATE_ERROR',
      field: err.meta?.target?.[0]
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'הרשומה לא נמצאה',
      code: 'NOT_FOUND'
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'לא ניתן לבצע פעולה זו - קיימים קשרים תלויים',
      code: 'FOREIGN_KEY_ERROR',
      field: err.meta?.field_name
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'שגיאת אימות נתונים',
      code: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // App operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details
    });
  }

  // Unknown errors - don't leak details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    error: isProduction ? 'שגיאה פנימית בשרת' : err.message,
    code: 'INTERNAL_ERROR',
    ...(isProduction ? {} : { stack: err.stack })
  });
};

/**
 * Async handler wrapper - catches async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not Found handler - for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'הנתיב לא נמצא',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};

