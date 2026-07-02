// Wraps an async route handler so rejected promises are forwarded to Express's
// error handler instead of crashing the process (Express 4 doesn't do this).
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
