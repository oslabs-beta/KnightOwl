
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