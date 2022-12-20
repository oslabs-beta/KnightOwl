// const Express = require('express');
// const { promisifyAll } = require('bluebird');
// const Redis = require('redis');
// const { rateConfig } = require('../config');

import Express, { request } from 'express';
import Redis from 'redis';
import { rateConfig } from '../config.js';
import pkg from 'bluebird';
const { promisifyAll } = pkg;

const redis = new Redis.createClient();
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

export default async function rateLimiter(req, res, next) {
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

  const requestCount = await redis.sendCommand(['INCRBY', `${ip}`, `${res.locals.cost}`]);
  console.log('request count: ', requestCount);
  const ttl = await redis.ttl(ip);
  console.log(`ip: ${ip}; requestCount: ${requestCount}; TTL: ${ttl}`);

  if (requestCount > rateConfig.requestLimit) {
    console.log('too many requests');
    return res.status(429).json({
      message: 'Too Many Requests',
      // status: 429,
      // log: 'KnightOwl: Exceeded request limit, Error in rateLimiter.',
    });
  }

  return next();
}
