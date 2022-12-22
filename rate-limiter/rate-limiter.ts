const Express = require('express');
const Redis = require('redis');
const { rateConfig } = require('../config.js');
const pkg = require('bluebird');
const { promisifyAll } = pkg;

const redis = new Redis.createClient();
promisifyAll(redis);

// Connect to redis
async function connect() {
  await redis.connect();
}
connect();

/**
* Rate Limiter
* @description: The Knight Owl Rate Limiter can be included in an Express JS middleware chain in order to limit 
* overly expensive queries being made to a GraphQL endpoint. This function works in conjunction with the Knight Owl
* costLimit middleware function. The rateLimiter function limits queries based on the values assigned to the requestLimit 
* and timeLimit properties in the config.js file's rateConfig object.
* @param req: Built-in request object from Express JS
* @param res: Built-in res object from Express JS
* @param next: Built-in next function from Express JS
* @see [Insert_Link_To_Knight_Owl_Docs_Here]
*/


async function rateLimiter(req, res, next) {
  
  // Grab the IP Address off of the incoming request
  const ip: String = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(typeof ip);
  
  // If the IP address is in our redis store increment the cost count, 
  // otherwise initialize it as a key in the store with the correct cost
  const firstRequest: Number = await redis.exists(ip);

  if (typeof firstRequest !== 'number') {
    redis.incr(ip);
    redis.expire(ip, rateConfig.timeLimit);
  }

  // Increment query by 1 if query bypassed cost limiter as an introspection query, else increment by cost
  // assigned in cost-limiter to the cost property on res.locals
  const incrementAmount: Number = res.locals.cost || 1;


  const requestCount: Number = await redis.sendCommand(['INCRBY', `${ip}`, `${incrementAmount}`]);


  if (requestCount > rateConfig.requestLimit) {
    return res.status(429).json({
      message: 'Too Many Requests',
    });
  }

  return next();
}

module.exports = rateLimiter;