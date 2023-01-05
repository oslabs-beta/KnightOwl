const { GraphQLError } = require('graphql');
const {redis, batchQueries} = require('../utils/runRedis.js');

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

    // TODO: need to figure out how to access request body here to grab IP address and query string, since not
    // using middleware pattern don't have access to req body

    // await redis.sendCommand(['RPUSH', 'queries', JSON.stringify({
    //   querierIPaddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    //   queryString: req.body.query.slice(0, 5000),
    //   rejectedBy: 'depth_limiter',
    //   rejectedOn: Date.now()
    // })]);
    // const cachedQueries = await redis.sendCommand(['LRANGE', 'queries', '0', '-1']);
    // console.log('cachedQueries: ', cachedQueries)
    // batchQueries();
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
