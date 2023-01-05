// const Express = require('express');
// const { promisifyAll } = require('bluebird');
// const Redis = require('redis');
// const { rateConfig } = require('../config');

const Express = require('express');
// const Redis = require('redis');
const { rateConfig } = require('../config.js');
// const pkg = require('bluebird');
// const { promisifyAll } = pkg;

// const redis = new Redis.createClient();
const {redis, batchQueries} = require('../utils/runRedis.js')
// promisifyAll(redis);

// // connect to redis

// async function connect() {
//   await redis.connect();
// }
// connect();

/*
* Rate Limiter
* @param
* @param
* @param

*/

/* ON scratch logic
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
  // TODO: confirm that this is the appropriate way to handle getting IP addresses when behind proxy
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
  console.log('increment amount: ', incrementAmount)

  const requestCount = await redis.sendCommand(['INCRBY', `${ip}`, `${incrementAmount}`]);
  console.log('request count: ', requestCount);
  const ttl = await redis.ttl(ip);
  console.log(`ip: ${ip}; requestCount: ${requestCount}; TTL: ${ttl}`);

  if (requestCount > rateConfig.requestLimit) {
    console.log('too many requests');
    await redis.sendCommand(['RPUSH', 'queries', JSON.stringify({
      querierIPaddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      queryString: req.body.query.slice(0, 5000),
      rejectedBy: 'rate_limiter',
      rejectedOn: Date.now()
    })]);
    const cachedQueries = await redis.sendCommand(['LRANGE', 'queries', '0', '-1']);
    console.log('cachedQueries: ', cachedQueries)
    batchQueries();
    return res.status(429).json({
      message: 'Too Many Requests',
      // status: 429,
      // log: 'KnightOwl: Exceeded request limit, Error in rateLimiter.',
    });
  }

  return next();
}

module.exports = rateLimiter;