
const config = {
  rateConfig: {
    requestLimit: 100,
    timeLimit: 60,
  },
  costs: {
    max: Infinity,
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
    introspectionQueries: true,
  }
}

module.exports = config;