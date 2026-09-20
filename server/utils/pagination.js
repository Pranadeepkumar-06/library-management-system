const parsePagination = (req, defaults = {}) => {
  let page = parseInt(req.query.page, 10) || defaults.page || 1;
  let limit = parseInt(req.query.limit, 10) || defaults.limit || 12;
  page = Math.max(1, page);
  limit = Math.min(100, Math.max(1, limit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseSort = (req, allowed = [], fallback = '-createdAt') => {
  const raw = req.query.sort || fallback;
  const fields = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  const sort = {};
  for (const f of fields) {
    const dir = f.startsWith('-') ? -1 : 1;
    const key = f.replace(/^-/, '');
    if (allowed.length === 0 || allowed.includes(key)) sort[key] = dir;
  }
  return Object.keys(sort).length ? sort : { createdAt: -1 };
};

module.exports = { parsePagination, parseSort };
