export const doc = {
  name: 'Ben',
  id: 2
};

export const query = {
  $and: [
    { $or: [{ id: 1 }, { id: 3 }] },
    { $or: [{ name: 'Ben' }, { name: 'Amanda' }] }
  ]
};

export const matches = false;
