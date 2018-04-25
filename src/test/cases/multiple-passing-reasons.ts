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
  { propertyPath: 'id', queryPath: '$or.id', type: 'EQUAL' },
  {
    propertyPath: 'name',
    queryPath: '$or.name',
    type: 'EQUAL'
  }
];
