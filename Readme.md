# mongo-query-explain

[![Build Status](https://travis-ci.org/CrossLead/mongo-query-explain.svg?branch=master)](https://travis-ci.org/CrossLead/mongo-query-explain)

Utility library for explaining why a document matches a query.

## Example

```typescript
import { explain } from 'mongo-query-explain';

const doc = {
  id: 1
};

const reason = explain(doc, { id: { $in: [1, 2, 3] } });

console.log(reason);
// -> "document.id property matches 'id.$in' clause on query"
```

## Implemented query operators

* [ ] `$and`
* [ ] `$or`
* [ ] `$not`
* [ ] `$nin`
* [ ] `$in`
* [ ] `$elemMatch`
* [ ] `$regex`
