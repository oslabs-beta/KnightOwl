import express from 'express';
import { costs } from '../config.js';
import { parse } from 'graphql';

export default function costLimiter(req, res, next) {
  // grab the query string off the request body
  console.log('body: ', req.body);
  
  // if the query has content, parse the request into an object and assess it with helper function
  // TODO: refine this condition -- introspectionquery was causing errors because it gets attached to
  // the request to load the graphiql playground so I added it to make sure we don't try to parse this
  // internal-system type query, but we'll want to handle this better as we go
  if (req.body && req.body.query.definitions[0].name !== 'IntrospectionQuery') {
    // if (query?.definitions[0].name !== 'IntrospectionQuery') {
    const { query } = req.body;
    console.log('assessing');
    const parsedQuery = parse(query);
    const passRes = res; // save res object in a constant so it can be passed into helper function
    assessCost(parsedQuery, passRes);
  }

  // if cost is above total limit, return next() with an error
  // else return next()
  // return (res.locals.cost < costs.max) ? next() : next({
  //   log: 'KnightOwl: Query rejected by costLimiter - total cost per query exceeded.',
  //   status: 429,
  //   message: {err: 'Query exceeds maximum complexity cost.'} 
  // })
  console.log('cost: ', res.locals.cost)
  return next();
}

function assessCost(obj, res) {
  const passingRes = res
  // handle operation top level
  // assume at top level if there is a definitions property
  if (obj.definitions) {
    // initialize cost property in locals object
    res.locals.cost = 0;

    // grab the operation type off the definitions and increment cost accordingly per config file
    const { operation } = obj.definitions;
    res.locals.cost += costs.operationCosts[operation];

    // if the selectionSet property has content, iterate over each field requested in the selections array
    // for each field, increment cost by either default or, if field is present in the config file,
    // per the cost set there
    // then dive into the field by recursively calling assessCost on the field
    if (obj.definitions[0].selectionSet) {
      for (const field of obj.definitions[0].selectionSet.selections) {
        console.log('field: ', field)
        const increment = (costs.fieldCosts.hasOwnProperty('placeholderGETNAMEPROPERTY')) 
          ? costs.fieldCosts['placeholderGETNAMEPROPERTY'] 
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
      console.log('field: ', field)
      const increment = (costs.fieldCosts.hasOwnProperty('placeholderGETNAMEPROPERTY')) 
        ? costs.fieldCosts['placeholderGETNAMEPROPERTY'] 
        : costs.fieldCosts.default;
      res.locals.cost += increment;

      assessCost(field, passingRes);
    }
  }

}

