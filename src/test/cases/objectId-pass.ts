export class ObjectId {
  constructor(private value: number) {}
  public equals(other: ObjectId) {
    return this.value === other.value;
  }
}

export const doc = {
  _id: new ObjectId(1)
};

export const query = {
  $and: [
    {
      _id: {
        $in: [new ObjectId(1), new ObjectId(2)]
      }
    },
    {
      _id: {
        $nin: [new ObjectId(3)]
      }
    }
  ]
};

export const matches = true;
