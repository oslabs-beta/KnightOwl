require('dotenv').config();
const Redis = require('redis');
const axios = require('axios')
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
        axios.post('http://localhost:8080/graphql', 
          {
            query: `mutation SaveQueryBatch($cachedQueries: String, $KOUser: String, $KOPass: String) {
                saveQueryBatch(cachedQueries: $cachedQueries, KOUser: $KOUser, KOPass: $KOPass)
              }`,
            variables: {
              cachedQueries: cachedQueries,
              KOUser: process.env.KO_USER,
              KOPass: process.env.KO_PASS
            }
          },
          {
            'content-type': 'application/json'
          }
        )
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