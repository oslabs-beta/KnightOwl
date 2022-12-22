// import express from 'express';
const { costs, forbiddenOperations } = require('../config.js');
const { parse } = require('graphql');
// import util from 'util';

// Main function to be added to middleware chain.
function costLimiter(req, res, next) {
  // grab the query string off the request body
  console.log('body: ', req.body);
  // const { query } = req.body

  
  // if the query has content, parse the request into an object and assess it with helper function
  if (req.body?.query) {
    const parsedQuery = parse(req.body.query);
    console.log('parsed query: ', parsedQuery)  
    
    const passRes = res; // save res object in a constant so it can be passed into helper function
    const assessment = assessCost(parsedQuery, passRes);
    
    // Refuse query if assessCost finds an introspection query and config is set to forbid
    if (!assessment) {
      return res.status(429).json({
        message: 'Forbidden query.'
      })
    };

    return (res.locals.cost < costs.max) ? next() : res.status(429).json({
      message: 'Query exceeds maximum complexity cost.'
    })

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
    // (console.log('intiializing cost: ', res.locals.cost))

    // grab the operation type off the definitions and increment cost accordingly per config file
    const { operation } = obj.definitions[0];
    // console.log(`operation: ${operation}. operation cost: ${costs.operationCosts[operation]}`)
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
        // console.log('field: ', field)
        const increment = (costs.fieldCosts.hasOwnProperty(field.name.value)) 
          ? costs.fieldCosts[field.name.value] 
          : costs.fieldCosts.default;
        // console.log('cost pre-increment: ', res.locals.cost);
        // console.log('increment: ', increment);
        res.locals.cost += increment;
        // console.log('cost incremented to: ', res.locals.cost);

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
      // console.log('field: ', field)
      const increment = (costs.fieldCosts.hasOwnProperty(field.name.value)) 
        ? costs.fieldCosts[field.name.value] 
        : costs.fieldCosts.default;
      // console.log('cost pre-increment: ', res.locals.cost);
      // console.log('increment: ', increment)
      res.locals.cost += increment;
      // console.log('cost incremented to: ', res.locals.cost);

      assessCost(field, passingRes);
    }
  }
  return true;
}

module.exports = costLimiter;
