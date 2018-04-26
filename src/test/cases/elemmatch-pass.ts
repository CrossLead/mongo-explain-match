export const doc = { _id: 1, results: [82, 85, 88] };
export const query = { results: { $elemMatch: { $gte: 80, $lt: 85 } } };
export const matches = true;
export const reasons = [
  {
    propertyPath: 'results',
    queryPath: 'results.$elemMatch.$gte',
    type: 'INEQUALITY'
  },
  {
    propertyPath: 'results',
    queryPath: 'results.$elemMatch.$lt',
    type: 'INEQUALITY'
  }
];
