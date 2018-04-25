export const query = { $and: [{ id: 1, name: 'Ben' }] };
export const doc = { id: 2, name: 'Ben' };
export const matches = false;
export const reasons = [
  { propertyPath: 'id', queryPath: '$and.[0].id', type: 'EQUAL' }
];
