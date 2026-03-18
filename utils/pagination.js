function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function getPaginationParams(req, options = {}) {
  const defaultLimit = toPositiveInt(options.defaultLimit, 20);
  const maxLimit = toPositiveInt(options.maxLimit, 200);
  const page = toPositiveInt(req.query.page, 1);
  const requestedLimit = toPositiveInt(req.query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);

  const hasPage = req.query.page !== undefined;
  const hasLimit = req.query.limit !== undefined;
  const enabled = options.force === true || hasPage || hasLimit;

  return { page, limit, enabled };
}

function paginateArray(items, params) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const page = toPositiveInt(params.page, 1);
  const limit = toPositiveInt(params.limit, total || 1);

  if (!params.enabled) {
    return {
      items: list,
      pagination: {
        page: 1,
        limit: total || 0,
        total,
        totalPages: total > 0 ? 1 : 0,
        hasMore: false,
      },
    };
  }

  const skip = (page - 1) * limit;
  const sliced = list.slice(skip, skip + limit);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    items: sliced,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

module.exports = {
  getPaginationParams,
  paginateArray,
};
