
const config = {
  rateConfig: {
    requestLimit: 150,
    timeLimit: 60,
  },
  costs: {
    max: 5,
    operationCosts: {
      query: 50,
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