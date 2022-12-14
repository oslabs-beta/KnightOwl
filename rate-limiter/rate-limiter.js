const Express = require('express');
const { promisifyAll } = require('bluebird');
const Redis = require('redis');
const { rateConfig } = require('../config');

const redis = new Redis();
promisifyAll(redis);

// connect to redis

async function connect() {
  await redis.connect();
}
connect();

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
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  // if the ip address is in our redis store increment the count, otherwise initialize key val pair
  const requestCount = await redis.incr(ip);
  if (requestCount === 1) {
    redis.expire(ip, rateConfig.timeLimit);
  }
  // const ttl = await redis.ttl(ip);
  // console.log(`ip: ${ip}; requestCount: ${requestCount}; TTL: ${ttl}`);

  // 60 here is an arbitrary number that will ultimately be replaced with a variable tied to config
  if (requestCount > rateConfig.requestLimit) {
    return next({
      message: 'Too Many Requests',
      error: 429,
      log: 'KnightOwl: Exceeded request limit, Error in rateLimiter.',
    });
  }

  return next();
}
