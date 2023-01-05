require('dotenv').config();
const Redis = require('redis');
const pkg = require('bluebird');

const { promisifyAll } = pkg;

const redis = new Redis.createClient();
promisifyAll(redis);

async function connect() {
  await redis.connect();
}
connect();

function manageBatch() {
  let timeRunning = false;

  return function() {
    if (!timeRunning) {
      timeRunning = true;
      setTimeout(async () => {
        const cachedQueries = await redis.sendCommand(['LRANGE', 'queries', '0', '-1']);
        fetch('localhost:8080/graphQL', {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            cachedQueries: cachedQueries,
            KOUser: process.env.KOUser,
            KOPass: process.env.KOPass
          })
        })
        .then(data => data.json())
        .then(response => {
          console.log('KnightOwl: Queries stored: ', response);
          redis.del('queries');
          timeRunning = false;
        })
        .catch(err => {
          console.log('KnightOwl: Error storing queries: ', err)
          timeRunning = false;
        });
      }, 5000)
    }
  }
}

const batchQueries = manageBatch();

module.exports = {redis, batchQueries};