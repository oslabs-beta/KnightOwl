const { GraphQLError } = require('graphql');
const {redis, batchQueries} = require('../utils/runRedis.js');
const {reqInfo} = require('../cost-assesser/cost-limiter.js')

const depthLimit = (maxDepth) => validationContext => {
    try {
      const { definitions } = validationContext.getDocument();
      // Organize the nested queries into a nested object.
      const queries = getQueriesAndMutations(definitions);
      // Object to hold the depth and the query into key/value pairs.
      const queryDepthsCalc = {};

    for (let name in queries) {
      queryDepthsCalc[name] = determineDepth(queries[name], 0, maxDepth, validationContext, name);
    }
    return validationContext;
    } catch (err) {
      console.error(err);
      throw err;
    }
};


// Handle the queries and mutations to return an object of just queries.
function getQueriesAndMutations(definitions) {
  return definitions.reduce((queries, definition) => {
    if (definition.kind === 'OperationDefinition') {
      const definitionName = definition.name ? definition.name.value : 'queryList';
      queries[definitionName] = definition;
    }
    return queries;
  }, {});
};

async function determineDepth(node, depthSoFar, maxDepth, context, operationName) {
  if (depthSoFar > maxDepth) {
    await redis.sendCommand(['RPUSH', 'queries', JSON.stringify({
      querier_IP_address: reqInfo.querierIP,
      query_string: reqInfo.queryString,
      rejected_by: 'depth_limiter',
      rejected_on: Date.now()
    })]);
    batchQueries();
    return context.reportError(
      new GraphQLError(`'${operationName}' exceeds maximum operation depth of ${maxDepth}`, [ node ])
    );
  };

  try {
    // For basic field lookup query.
    if (node.kind === 'Field') {
      // If there are no more nested queries then the selectionSet is falsey so it has a depth of 0.
      if (!node.selectionSet) return 0;
      const depths = [];
      depths.push(node.selectionSet.selections.map(selection =>
        determineDepth(selection, depthSoFar + 1, maxDepth, context, operationName)));
      return 1 + Math.max(...depths);
    } 
    // For initial document query object.
    if (node.kind === 'OperationDefinition') {
      const depths = [];
      depths.push(node.selectionSet.selections.map(selection =>
        determineDepth(selection, depthSoFar, maxDepth, context, operationName)));
      return Math.max(...depths);
    } 
  } 
  catch (err) {
    throw new Error('Depth crawler error in the determineDepth function: ' + node.kind);
  }
};

module.exports = depthLimit;
