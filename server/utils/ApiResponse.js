class ApiResponse {
  static success(res, { message = 'Success', data = null, statusCode = 200, meta = undefined }) {
    const body = { success: true, message };
    if (data !== undefined) body.data = data;
    if (meta !== undefined) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static paginated(res, { message = 'Fetched successfully', data = [], page, limit, total, statusCode = 200 }) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  }
}

module.exports = ApiResponse;
