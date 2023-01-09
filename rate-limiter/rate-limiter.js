const Express = require('express');
const { rateConfig } = require('../config.js');
const {redis, batchQueries} = require('../utils/runRedis.js')

/* 
  params: req res next

  get ip address from either the proxy if there is one or the querier itself if none
  ex (VERIFY): const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  using ip address as a key, check if requester has a session active
    if not, create one as a new property of the redis db with a set expiration of one minute
    if so, increment # of queries associated with the ip address
    **NOTE: ultimately this should not be a straight increment - we would incorporate cost analysis
    and incrimate by the complexity "score" of the query**
      if queries > limit, refuse query and through new graphqlerror (LOOK UP)
      else return next()

*/

async function rateLimiter(req, res, next) {
  console.log('cost: ', res.locals.cost);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  // if the ip address is in our redis store increment the count, otherwise initialize key val pair
  
  const firstRequest = await redis.exists(ip);
  console.log('firstrequest: ', firstRequest)
  if (!firstRequest) {
    console.log('creating and setting expiry');
    redis.incr(ip);
    redis.expire(ip, rateConfig.timeLimit);
  }

  // increment query by 1 if query bypassed cost limiter as an introspection query, else increment by cost
  // assigned in cost-limiter
  const incrementAmount = res.locals.cost || 1;

  const requestCount = await redis.sendCommand(['INCRBY', `${ip}`, `${incrementAmount}`]);
  const ttl = await redis.ttl(ip);

  if (requestCount > rateConfig.requestLimit) {
    console.log('KnightOwl: Query exceeds rate limit.');
    let timestamp = new Date();
    timestamp = timestamp.toISOString();
    await redis.sendCommand(['RPUSH', 'queries', JSON.stringify({
      querier_IP_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      query_string: (req.body.query) ? req.body.query.slice(0, 5000) : 'Introspection Query',
      rejected_by: 'rate_limiter',
      rejected_on: timestamp,
    })]);
    batchQueries();
    return res.status(429).json({
      message: 'Too Many Requests',
    });
  }

  return next();
}

module.exports = rateLimiter;