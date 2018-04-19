export interface ExplainResult {
  matches: boolean;
  reason: string;
}

export interface Stringable {
  toString(): string;
}

export type MongoPrimative = number | string | null | Date | Stringable;

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
    }

    if (isNestedPropertyKey(key)) {
      const result = handleNestedKey(key, doc, query, path);
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

  if (typeof nestedQuery === 'undefined') {
    throw new Error(`value at query path ${path}.${key} is undefined.`);
  }

  if (isMongoPrimative(nestedQuery)) {
    const matches = matchesPrimative(nestedDoc, nestedQuery);
    return {
      matches,
      reason: `${matches ? '' : 'does not '}match${
        matches ? 'es' : ''
      } query property ${path}.${key}`
    };
  } else if (Array.isArray(nestedQuery)) {
    // TODO deal with TS
    throw new Error(`Invalid nested query.`);
  } else {
    return explain(nestedDoc, nestedQuery, `${path}.${key}`);
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
      return {
        matches: false,
        reason: `Query contains unrecognized operator ${key} at path ${path}`
      };
    }
  }
}

function matchesPrimative(val: MongoPrimative, query: MongoPrimative) {
  if (val instanceof Date) {
    return query instanceof Date && query.getTime() === val.getTime();
  }

  if (isStringable(val)) {
    return isStringable(query) && val.toString() === query.toString();
  }

  return val === query;
}

function isStringable<T>(obj: T | Stringable): obj is Stringable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).toString === 'function'
  );
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
