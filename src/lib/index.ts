export interface ExplainResult {
  matches: boolean;
  reason: string;
}

export interface ObjectID {
  equals(other: ObjectID): boolean;
}

export type MongoPrimative =
  | number
  | string
  | null
  | Date
  | ObjectID
  | undefined;

export interface MongoQueryOperatorProperties {
  $and?: MongoQuery[];
  $or?: MongoQuery[];
  $in?: MongoPrimative[];
  $nin?: MongoPrimative[];
}

export interface MongoQueryRawProps {
  [key: string]: MongoPrimative | MongoQuery | undefined;
}

export type MongoQuery = MongoQueryOperatorProperties & MongoQueryRawProps;

/**
 * explain why a query matches a doc
 *
 * @param doc mongodb document as plain object
 * @param query mongodb query object
 */
export function explain(doc: any, query: MongoQuery) {
  return handleDocument(doc, query, '');
}

function handleDocument(
  doc: any,
  query: MongoQuery,
  path: string
): ExplainResult {
  const keys = Object.keys(query);

  if (!keys.length) {
    return {
      matches: true,
      reason: `has no keys`
    };
  }

  const reasons: string[] = [];

  for (const key of keys) {
    if (isOperatorKey(key)) {
      const result = handleOperatorKey(key, doc, query, path);
      if (!result.matches) {
        return result;
      }
    }

    if (isNestedPropertyKey(key)) {
      const result = handleNestedKey(key, doc, query, path);
      if (!result.matches) {
        return result;
      }
    }

    // key is directly in doc, can check the property...
    if (key in doc) {
      const nestedDoc = doc[key];
      const nestedQuery = query[key];

      if (isMongoPrimative(nestedQuery)) {
        const matches = matchesPrimative(nestedDoc, nestedQuery);
        if (!matches) {
          return {
            matches: false,
            reason: `Document value at path ${path}.${key} does not match query`
          };
        }
      } else {
        const result = handleDocument(nestedDoc, nestedQuery, `${path}.{key}`);
      }
    } else {
      return {
        matches: false,
        reason: `Document has no property ${path}.key`
      };
    }
  }

  return { matches: true, reason: `Document matches query` };
}

/**
 * check if a nested property query field matches the document
 *
 * @param key
 * @param doc
 * @param query
 * @param path
 */
function handleNestedKey(
  key: string,
  doc: any,
  query: MongoQuery,
  path = ''
): ExplainResult {
  const nestedDoc = get(doc, key);
  const nestedQuery = query[key];

  if (isMongoPrimative(nestedQuery)) {
    const matches = matchesPrimative(nestedDoc, nestedQuery);
    return {
      matches,
      reason: `${matches ? '' : 'does not '}match${
        matches ? 'es' : ''
      } query property ${path}.${key}`
    };
  } else {
    return handleDocument(nestedDoc, nestedQuery, `${path}.${key}`);
  }
}

/**
 * check if an operator field matches the document
 *
 * @param key
 * @param doc
 * @param query
 * @param path
 */
function handleOperatorKey(
  key: string,
  doc: any,
  query: MongoQuery,
  path = ''
): ExplainResult {
  switch (key) {
    case '$and': {
      errorIfNotArray(key, query);
      const arr = query[key]!;

      for (const q of arr) {
        const result = handleDocument(doc, q, `${path}.$and`);
        if (!result.matches) {
          return {
            matches: false,
            reason: `$and operator at path ${path}.$and`
          };
        }
      }

      return {
        matches: true,
        reason: `Document matches $and operator at path ${path}.$and`
      };
    }

    case '$or': {
      errorIfNotArray(key, query);
      const arr = query[key]!;

      for (const q of arr) {
        const result = handleDocument(doc, q, `${path}.$or`);
        if (result.matches) {
          return {
            matches: true,
            reason: `Document matches $or operator at path ${path}.$or`
          };
        }
      }

      return {
        matches: false,
        reason: `Document does not match $or operator at path ${path}.$or`
      };
    }

    case '$in': {
      errorIfNotArray(key, query);
    }

    case '$nin': {
      errorIfNotArray(key, query);
    }

    default: {
      console.warn(`No logic implemented for query operator: ${key}`);
      return {
        matches: false,
        reason: `Query contains unrecognized operator ${key} at path ${path}.${key}`
      };
    }
  }
}

function errorIfNotArray(
  key: keyof MongoQueryOperatorProperties,
  query: MongoQuery
) {
  if (!Array.isArray(query[key])) {
    throw new Error(`Value for mongo query operator ${key} must be an array.`);
  }
}

function matchesPrimative(val: MongoPrimative, query: MongoPrimative) {
  if (val instanceof Date) {
    return query instanceof Date && query.getTime() === val.getTime();
  }

  if (isObjectID(val)) {
    return isObjectID(query) && val.equals(query);
  }

  return val === query;
}

/**
 * ducktype check if object is ObjectID
 *
 * @param obj
 */
function isObjectID<T>(obj: T | ObjectID): obj is ObjectID {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).equals === 'function'
  );
}

function isMongoPrimative<T>(obj: T | MongoPrimative): obj is MongoPrimative {
  return (
    typeof obj === 'undefined' ||
    typeof obj !== 'object' ||
    obj === null ||
    obj instanceof Date ||
    isObjectID(obj)
  );
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
