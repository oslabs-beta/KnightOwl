export const rateConfig = {
  requestLimit: 150,
  timeLimit: 60,
};
export const costs = {
  max: 100,
  operationCosts: {
    query: 1,
    mutation: 10,
    subscription: 10
  },
  fieldCosts: {
    default: 1,
  }
};
export const forbiddenOperations = {
  introspectionQueries: false,
}