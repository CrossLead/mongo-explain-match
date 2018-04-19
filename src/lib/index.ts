export interface ExplainResult {
  matches: boolean;
  reason: string;
}

export type MongoPrimative = number | string | null | Date;

export interface MongoQuery {
  $and?: MongoQuery[];
  $or?: MongoQuery[];
  $in?: MongoPrimative[];
  $nin?: MongoPrimative[];
  [key: string]:
    | MongoQuery[]
    | MongoPrimative[]
    | MongoPrimative
    | MongoQuery
    | void;
}

/**
 * explain why a query matches a doc
 *
 * @param doc mongodb document as plain object
 * @param query mongodb query object
 */
export function explain(doc: any, query: MongoQuery, path = ''): ExplainResult {
  const keys = Object.keys(query);
  const reasons: string[] = [];

  for (const key of keys) {
    if (isOperatorKey(key)) {
      switch (key) {
        case '$and': {
          //
        }

        case '$or': {
          //
        }

        case '$in': {
          //
        }

        case '$nin': {
          //
        }

        default: {
          console.warn(`No logic implemented for query operator: ${key}`);
          continue;
        }
      }
    }

    if (isNestedPropertyKey(key)) {
      const nestedDoc = get(doc, key);
      const nestedQuery = query[key];

      if (typeof nestedQuery === 'undefined') {
        throw new Error(`Value at query path ${path}.${key} is undefined.`);
      }

      if (isMongoPrimative(nestedQuery)) {
        const matches = matchesPrimative(nestedDoc, nestedQuery);
        if (!matches) {
          return {
            matches: false,
            reason: `Document does not match query property ${path}.${key}`
          };
        }
      } else if (Array.isArray(nestedQuery)) {
        // TODO deal with TS
        throw new Error(`Invalid nested query.`);
      } else {
        const nested = explain(nestedDoc, nestedQuery, `${path}.${key}`);

        // don't match a sub query, short circuit...
        if (!nested.matches) {
          return nested;
        }

        // add the match to the list of reasons
        reasons.push(nested.reason);
      }
    }

    // key is directly in doc, can check the property...
    if (key in doc) {
      const nestedDoc = doc[key];
    } else {
      return {
        matches: false,
        reason: `Document has no property ${path}.key`
      };
    }
  }

  return { matches: true, reason: reasons.join(',') };
}

function matchesPrimative(val: MongoPrimative, query: MongoPrimative) {
  if (val instanceof Date) {
    return query instanceof Date && query.getTime() === val.getTime();
  }

  return val === query;
}

function isMongoPrimative<T>(obj: T | MongoPrimative): obj is MongoPrimative {
  return typeof obj !== 'object' || obj === null || obj instanceof Date;
}

function explainAndOperator() {
  //
}

function explainOrOperator() {
  //
}

function explainInOperator() {
  //
}

function isOperatorKey(key: string) {
  return key.charAt(0) === '$';
}

function isNestedPropertyKey(key: string) {
  return key.indexOf('.') !== -1;
}

function get(obj: any, path: string) {
  const components = path.split('.');
  for (const key of components) {
    obj = obj[key];
  }
  return obj;
}
