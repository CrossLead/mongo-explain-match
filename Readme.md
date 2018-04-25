# mongo-match

WORK IN PROGRESS -- API / features still rapidly changing...

[![Build Status](https://travis-ci.org/CrossLead/mongo-match.svg?branch=master)](https://travis-ci.org/CrossLead/mongo-match)

Utility library for explaining why a document matches a query.

## Example

```typescript
import { match } from 'mongo-match';

const doc = {
  id: 1
};

const result = match({ id: { $in: [2, 3] } }, doc);

console.log(result);
// {
//   "match": true,
//   "reasons": [
//     {
//       "propertyPath": "id",
//       "queryPath": "id.$in",
//       "type": "IN_SET"
//     }
//   ]
// }
```

## Implemented query operators

* [x] `$and`
* [x] `$or`
* [ ] `$not`
* [x] `$nin`
* [x] `$in`
* [ ] `$elemMatch`
* [ ] `$regex`
