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
            // cachedQueries: ['hi mom', 'ugh', 'why is this so hard :('],
            // cachedQueries: ['hi mom'],
            KOUser: process.env.KO_USER,
            KOPass: process.env.KO_PASS
          }
        }
        axios.post('http://localhost:8080/graphql', 
          {query: `mutation SaveQueryBatch($cachedQueries: [BatchQueryInput], $KOUser: String, $KOPass: String) {
              saveQueryBatch(cachedQueries: $cachedQueries, KOUser: $KOUser, KOPass: $KOPass)
            }`,
          variables: {
            cachedQueries: queryData,
            // cachedQueries: ['hi mom', 'ugh', 'why is this so hard :('],
            // cachedQueries: 'hi mom',
            KOUser: process.env.KO_USER,
            KOPass: process.env.KO_PASS
          }},
          // {
          //   // headers: {
          //     'content-type' : 'application/json'
          //   // }
          // }
        )
        // axios({
        //   method: 'post',
        //   url: 'http://localhost:8080/graphql',
        //   data,
        // })
        .then(response => {
          console.log('KnightOwl: Queries stored: ', response.status);
          redis.del('queries');
          timeRunning = false;
        })
        .catch(err => {
          console.log('KnightOwl: Error storing queries', err.response.data)
          timeRunning = false;
        });
      }, 2000)
    }
  }
}

const batchQueries = manageBatch();

module.exports = {redis, batchQueries};