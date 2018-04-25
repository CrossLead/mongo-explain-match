export const doc = {
  name: 'Amanda',
  id: 1,
  cheese: 'Cheddar'
};

export const query = {
  $or: [{ name: 'Amanda' }, { id: 1 }, { cheese: 'Gouda' }]
};

export const matches = true;

export const reasons = [
  { propertyPath: 'id', queryPath: '$or.[1].id', type: 'EQUAL' },
  {
    propertyPath: 'name',
    queryPath: '$or.[0].name',
    type: 'EQUAL'
  }
];
