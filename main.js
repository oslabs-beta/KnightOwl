const costLimiter = require('./cost-assesser/cost-limiter');
const rateLimiter = require('./rate-limiter/rate-limiter');
const depthLimit = require('./utils/depthLimit');

exports.knightOwl = {
  costLimiter,
  rateLimiter,
  depthLimit,
}