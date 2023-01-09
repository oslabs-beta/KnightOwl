require('dotenv').config();
const Redis = require('redis');
const axios = require('axios').default
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
        const queryData = [];
        for (const q of cachedQueries) {
          queryData.push(JSON.parse(q));
        }
        const data = {
          query: `mutation SaveQueryBatch($cachedQueries: String, $KOUser: String, $KOPass: String) {
            saveQueryBatch(cachedQueries: $cachedQueries, KOUser: $KOUser, KOPass: $KOPass)
          }`,
          variables: {
            cachedQueries: queryData,
            KOUser: process.env.KO_USER,
            KOPass: process.env.KO_PASS
          }
        }
        axios.post('https://knight-owl-display-ixu7tjed5q-pd.a.run.app//graphql', 
          {query: `mutation SaveQueryBatch($cachedQueries: [BatchQueryInput], $KOUser: String, $KOPass: String) {
              saveQueryBatch(cachedQueries: $cachedQueries, KOUser: $KOUser, KOPass: $KOPass)
            }`,
          variables: {
            cachedQueries: queryData,
            KOUser: process.env.KO_USER,
            KOPass: process.env.KO_PASS
          }},
        )
        .then(response => {
          console.log('KnightOwl: Queries stored: ', response.status);
          redis.del('queries');
          timeRunning = false;
        })
        .catch(err => {
          console.log('KnightOwl: Error storing queries', err.response.data)
          timeRunning = false;
        });
      }, 1000)
    }
  }
}

const batchQueries = manageBatch();

module.exports = {redis, batchQueries};