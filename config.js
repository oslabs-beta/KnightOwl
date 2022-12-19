export const rateConfig = {
  requestLimit: 100,
  timeLimit: 60,
};
export const costs = {
  max: 1000,
  operationCosts: {
    query: 1,
    mutation: 10,
    subscription: 10
  },
  fieldCosts: {
    default: 1,
  }
};
