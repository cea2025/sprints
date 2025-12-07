/**
 * Middleware Index
 * ייצוא מרכזי של כל ה-middleware
 */

module.exports = {
  ...require('./error.middleware'),
  ...require('./validation.middleware'),
  ...require('./organization.middleware')
};

