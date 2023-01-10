# KnightOwl Middleware Library
![](/public/knightowlbanner.png)

KnightOwl is a middleware library to protect your GraphQL API, combined with a web app monitor to give observability to its activity.
<br /> <br />
Sign in at [KnightOwl.app](https://knightowl.app/) to utilize our the web app monitor in conjunction with the library protecting your GraphQL endpoints.

# Getting Started
Run the command `npm i knightOwl` to install the Knight Owl Rate Limiter, Cost Limiter, and Depth Limiter middleware functions into your express GraphQL codebase.

<br />

## Redis
<hr>

In order to use this product, you'll need to have a redis server running. 
<br />
<br />

If you haven't already, run the command `npm i redis` to install redis as a dependency in your package.json. <br />
Once you've installed redis, run the command `redis-server` in your terminal to spin up an instance of a redis server that you will need in order to use this library.

![](/public/redis.png)

You should see a message like above once your redis server is successfully running. You should expect the port to default to `6379`.


</hr>

<br />

# Utilizing the Library

## Config.js
<hr>

In `node_modules/knightowl` go to the config.js file to configure your KnightOwl Query Limiting settings. <br />
It should be setup in the following format:

```
const config = {
  rateConfig: {
    requestLimit: 1000,
    timeLimit: 60,
  },
  costs: {
    max: 50000,
    operationCosts: {
      query: 1 ,
      mutation: 10,
      subscription: 10
    },
    fieldCosts: {
      default: 1,
    }
  },
  forbiddenOperations: {
    introspectionQueries: false,
  }
}

module.exports = config;
```
<br />

You can tailor `requestLimit` (number of requests made) and `timeLimit` (seconds) to reflect what kind of traffic you're expecting to recieve to get the most out of the `rateLimiter` in your project.

You can also assign cost values to handle the size of the query. You can adjust the number values that correspond to the keys in the `operationCosts` property to account for the kind of queries you expect to recieve. By configuring your operationCosts you get more dynamic protection and this way the rate limiter isn't working under the assumtion that every query will tax your endpoints equally. 


</hr>
<br />

# The Knight Owl Team
<hr>
Ona Narbutas <a href='https://github.com/ona-narbutas'>@ona-narbutas</a> | <a href='https://www.linkedin.com/in/ona-narbutas/'>LinkedIn</a> <br />
Simon Grigenas <a href='https://github.com/sosasays'>@sosasays</a> | <a href='https://www.linkedin.com/in/simon-grigenas/'>LinkedIn</a> <br />
Caitlin Ervine <a href='https://github.com/caitlinme24'>@caitlinme24</a> | <a href='https://www.linkedin.com/in/caitlin-ervine/'>LinkedIn</a> <br />
Jackson Kalmbach <a href='https://github.com/jacksonkalmbach'>@jacksonkalmbach</a> | <a href='https://www.linkedin.com/in/jacksonkalmbach/'>LinkedIn</a> <br />
<hr>
