# mongo-query-explain

[![Build Status](https://travis-ci.org/CrossLead/mongo-query-explain.svg?branch=master)](https://travis-ci.org/CrossLead/mongo-query-explain)

Utility library for explaining why a document matches a query.

## Example

```typescript
import { explain } from 'mongo-query-explain';

const doc = {
  id: 1
};

const result = explain(doc, { id: { $in: [2, 3] } });

console.log(result.matches);
// -> false
console.log(result.reason);
// -> "document.id does not match the 'id.$in' clause on the given query"
```

## Implemented query operators

* [ ] `$and`
* [ ] `$or`
* [ ] `$not`
* [ ] `$nin`
* [ ] `$in`
* [ ] `$elemMatch`
* [ ] `$regex`
