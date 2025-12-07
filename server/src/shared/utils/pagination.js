/**
 * Pagination Utilities
 * פונקציות עזר לעימוד תוצאות
 */

/**
 * מחשב את פרמטרי העימוד
 * @param {object} query - Query parameters from request
 * @param {number} defaultLimit - Default items per page
 * @returns {object} - { skip, take, page, limit }
 */
const getPaginationParams = (query, defaultLimit = 50) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    page,
    limit
  };
};

/**
 * יוצר תגובת עימוד
 * @param {Array} items - Items to return
 * @param {number} totalCount - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
const paginatedResponse = (items, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: items,
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

module.exports = {
  getPaginationParams,
  paginatedResponse
};

