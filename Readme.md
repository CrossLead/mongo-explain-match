# mongo-query-explain

WORK IN PROGRESS -- API / features still rapidly changing...

[![Build Status](https://travis-ci.org/CrossLead/mongo-query-explain.svg?branch=master)](https://travis-ci.org/CrossLead/mongo-query-explain)

Utility library for explaining why a document matches a query.

## Example

```typescript
import { explain } from 'mongo-query-explain';

const doc = {
  id: 1
};

const result = explain(doc, { id: { $in: [2, 3] } });

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
