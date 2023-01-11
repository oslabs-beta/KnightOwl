# KnightOwl Middleware Library
KnightOwl is a middleware library to protect your APIs built on `express-graphql` servers, combined with a web app monitor to give observability to its activity.
<br /> <br />
Sign in at [KnightOwl.app](https://knightowl.app/) to utilize our the web app monitor in conjunction with the library protecting your GraphQL endpoints. <br />
(Please make a note of the email and password you use to signup!) <br /> <br />

# Getting Started
Run the command `npm i knightowl` to install the Knight Owl Rate Limiter, Cost Limiter, and Depth Limiter middleware functions into your express GraphQL codebase.

<br />

## Redis
<hr>

In order to use this product, you'll need to have a redis server running. 
<br />
<br />

If you haven't already, run the command install redis on your machine (See [https://redis.io](https://redis.io)) <br />

The Knight Owl rate limiter uses redis to track queries by IP address. <br /> 
In addtion redis will cache query history as requests are made. Our middleware will periodically clear that cache and store metrics based on query history in our own database. <br />
These metrics are visualized when you sign in at [knightowl.app](https://knightowl.app/) <br />

Once you've installed redis, run the command `redis-server` in your terminal to spin up an instance of a redis server that you will need in order to use this library.

```
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis [Version]
  .-`` .-```.  ```\/    _.,_ ''-._                                  
 (    '      ,       .-`  | `,    )     
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 6379
 |    `-._   `._    /     _.-'    |     
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           https://redis.io       
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                 
```

You should see a message similar to above once your redis server is successfully running. You should expect the port to default to `6379`.

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

You can tailor `requestLimit` (number of requests made) and `timeLimit` (seconds) to reflect what kind of traffic you're expecting to recieve to get the most out of the `rateLimiter` in your project. <br /> <br />

You can also assign cost values to handle the size of the query. <br />
You can adjust the maximum complexity cost by changing the `max` value on the `costs` property. <br />
You can adjust the number values that correspond to the keys in the `operationCosts` property to account for the kind of queries you expect to recieve. <br />
You can change how much complexity to assign for any given field in a request by changing the `default` value on the `fieldCosts` property. <br />

By configuring your operationCosts you get more dynamic protection and this way the rate limiter isn't working under the assumtion that every query will tax your endpoints equally.  <br /> <br />

You can also **customize** how much to charge in complexity cost for requests for **any given field** defined in your schema by adding the [Field Name] and [Desired Cost] to the `costs.fieldCosts` object (underneath `default`) <br />

You can prohibit all introspection queries (queries that request information about the entire schema itself) by adjusting the `introspectionQueries` property within `forbiddenOperations`.  <br />
Set the value of `introspectionQueries` property to true to prohibit introspection queries. <br /> <br />

###  **Note: You Won't handle depth limiting in this config file!**
You can set the maximum depth allowed for a query by passing it as an argument to the `depth_limit`function when the function is invoked as a validation rule. (See the **Utilizing Knight Owl in Your Application** Below ) <br /> <br />


## .env
<hr>
Add the fields `KO_USER` and `KO_PASS` to your .env containing the email and password used to create their account respectively. It should look as follows:

```
KO_PASS='[theEmailYouSignedUpWith]'
KO_PASS='[thePasswordYouSignedUpWith]' 

```

## Utilizing Knight Owl in Your Application
<hr>
In your server file (Or wherever you are defining your `'/graphql'` endpoint and invoking the `graphqlHTTP()` function): <br />

- Require in the `knightowl` module with `const { knightOwl } = require('knightowl')`
- Add the `knightowl.costLimiter `and `knightowl.rateLimiter` functions to your middleware chain ***before*** an invocation of `graphqlHTTP()`
- Invoke of `graphqlHTTP()`. Make sure the object passed in as an argument contains the property `validationRules: [knightOwl.depthLimit(<Num>)]` with your desired depth limit in place of `<Num>`.
<br /> <br />

It should look as follows:
```
app.use('/graphql', knightOwl.costLimiter, knightOwl.rateLimiter, graphqlHTTP({
  schema,
  validationRules: [knightOwl.depthLimit(20)]
}));

```
<br />

# The Knight Owl Team
<hr>
Ona Narbutas <a href='https://github.com/ona-narbutas'>@ona-narbutas</a> | <a href='https://www.linkedin.com/in/ona-narbutas/'>LinkedIn</a> <br />
Simon Grigenas <a href='https://github.com/sosasays'>@sosasays</a> | <a href='https://www.linkedin.com/in/simon-grigenas/'>LinkedIn</a> <br />
Caitlin Ervine <a href='https://github.com/caitlinme24'>@caitlinme24</a> | <a href='https://www.linkedin.com/in/caitlin-ervine/'>LinkedIn</a> <br />
Jackson Kalmbach <a href='https://github.com/jacksonkalmbach'>@jacksonkalmbach</a> | <a href='https://www.linkedin.com/in/jacksonkalmbach/'>LinkedIn</a> <br />
<hr>
