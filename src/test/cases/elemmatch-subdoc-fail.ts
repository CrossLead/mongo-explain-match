export const doc = {
  groups: [{ _id: 1 }, { _id: 2 }]
};

export const query = {
  groups: {
    $elemMatch: {
      _id: {
        $in: [3]
      }
    }
  }
};

export const matches = false;
