const appRoot = require('app-root-path');
const { costs, forbiddenOperations } = require(appRoot + '/config.js')|| require('../config.js');
const { parse } = require('graphql');
const axios = require('axios')

const Express = require('express');
const { rateConfig } = require(appRoot + '/config.js') || require('../config.js');
const {redis, batchQueries} = require('../utils/runRedis.js');

const reqInfo = {};


// Main function to be added to middleware chain.
async function costLimiter(req, res, next) {
  // grab the query string off the request body
  reqInfo.queryString = (req.body?.query) ? req.body.query.slice(0, 5000) : undefined;
  reqInfo.querierIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  
  // if the query has content, parse the request into an object and assess it with helper function
  if (req.body?.query) {
    const parsedQuery = parse(req.body.query);
    const passRes = res; // save res object in a constant so it can be passed into helper function
    const assessment = assessCost(parsedQuery, passRes);
    
    // Refuse query if assessCost finds an introspection query and config is set to forbid
    if (!assessment) {
      console.log('introspection query forbidden')
      let timestamp = new Date();
      timestamp = timestamp.toISOString();
      await redis.sendCommand(['RPUSH', 'queries', JSON.stringify({
        querier_IP_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        query_string: 'Introspection Query',
        rejected_by: 'cost_limiter',
        rejected_on: timestamp
      })]);
      batchQueries();
      return res.status(429).json({
        message: 'Forbidden query.'
      })
    };

    if (res.locals.cost < costs.max) {
      return next();
    } else {
      let timestamp = new Date();
      timestamp = timestamp.toISOString();
      await redis.sendCommand(['RPUSH', 'queries', JSON.stringify({
        querier_IP_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        query_string: req.body.query.slice(0, 5000),
        rejected_by: 'cost_limiter',
        rejected_on: timestamp
      })]);
      batchQueries();
      return res.status(429).json({
        message: 'Query exceeds maximum complexity cost.'
      })
    }
  }
  
  return next();
}

// Helper function that will be invoked when costLimiter() runs in middleware chain
function assessCost(obj, res) {
  const passingRes = res
  // handle operation top level
  // assume at top level if there is a definitions property
  if (obj.definitions) {
    // initialize cost property in locals object
    res.locals.cost = 0;

    // grab the operation type off the definitions and increment cost accordingly per config file
    const { operation } = obj.definitions[0];
    res.locals.cost += costs.operationCosts[operation];

    /* if the selectionSet property has content, iterate over each field requested in the selections array
    for each field, increment cost by either default or, if field is present in the config file,
    per the cost set there
    then dive into the field by recursively calling assessCost on the field */
    if (obj.definitions[0].selectionSet) {
      for (const field of obj.definitions[0].selectionSet.selections) {
        // if the config property to forbid introspection queries is set to true, determine if the incoming operation
        // is an introspection query and if so reject
        if (forbiddenOperations.introspectionQueries) {
          console.log('checking for introspection: ', field.name)
          if (field.name.value.startsWith('__')) {
            console.log('introspection found')
            return false
          }
        }
        const increment = (costs.fieldCosts.hasOwnProperty(field.name.value)) 
          ? costs.fieldCosts[field.name.value] 
          : costs.fieldCosts.default;
        res.locals.cost += increment;

        assessCost(field, passingRes);
      }
    }

    // handle nested fields
  } else if (obj.selectionSet) {
    // as at the top level, iterate over all fields requested in the selections array, incrementing
    // cost per the config and recusively calling assessCost on the field
    for (const field of obj.selectionSet.selections) {
      // if the config property to forbid introspection queries is set to true, determine if the incoming operation
      // is an introspection query and if so reject
      if (forbiddenOperations.introspectionQueries) {
        if (field.name.value.startsWith('__')) {
          return false
        }
      }
      const increment = (costs.fieldCosts.hasOwnProperty(field.name.value)) 
        ? costs.fieldCosts[field.name.value] 
        : costs.fieldCosts.default;
      res.locals.cost += increment;

      assessCost(field, passingRes);
    }
  }
  return true;
}

module.exports = {costLimiter, reqInfo};
