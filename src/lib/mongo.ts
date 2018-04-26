/**
 * ducktype of ObjectID
 */
export interface ObjectID {
  equals(other: ObjectID): boolean;
}

/**
 * leaf value types
 */
export type MongoPrimative =
  | number
  | string
  | null
  | Date
  | ObjectID
  | RegExp
  | undefined;

/**
 * Properties on a mongo query that would be arrays
 */
export interface MongoQueryOperatorProperties {
  $and?: MongoQuery[];
  $or?: MongoQuery[];
  $in?: MongoPrimative[];
  $nin?: MongoPrimative[];
  $ne?: MongoPrimative;
  $eq?: MongoQuery;
  $gt?: MongoPrimative;
  $gte?: MongoPrimative;
  $lt?: MongoPrimative;
  $lte?: MongoPrimative;
  $elemMatch?: MongoQuery;
}

/**
 * raw properties on a document
 */
export interface MongoQueryRawProps {
  [key: string]: MongoPrimative | MongoQuery | undefined;
}

/**
 * overall query shape (either the specific query operators or document props)
 */
export type MongoQuery = MongoQueryOperatorProperties & MongoQueryRawProps;

/**
 * ducktype check if object is ObjectID
 *
 * @param obj
 */
export function isObjectID<T>(obj: T | ObjectID): obj is ObjectID {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).equals === 'function'
  );
}

/**
 * type guard to test if object is mongo primitive
 *
 * @param obj potential mongo primative
 */
export function isMongoPrimative<T>(
  obj: T | MongoPrimative
): obj is MongoPrimative {
  const type = typeof obj;
  return (
    type === 'undefined' ||
    type === 'number' ||
    type === 'string' ||
    obj === null ||
    obj instanceof Date ||
    obj instanceof RegExp ||
    isObjectID(obj)
  );
}

/**
 * check if key represents a query operator
 *
 * @param key
 */
export function isOperatorKey(key: string) {
  return key.charAt(0) === '$';
}

/**
 * check if key represents a nested property in the document
 *
 * @param key
 */
export function isNestedPropertyKey(key: string) {
  return key.indexOf('.') !== -1;
}

/**
 * assert that the value of a query operator property is an array
 *
 * @param key
 * @param query
 */
export function errorIfNotArray(
  key: keyof MongoQueryOperatorProperties,
  query: MongoQuery
) {
  const arr = query[key];
  if (!Array.isArray(arr)) {
    throw new Error(`Value for mongo query operator ${key} must be an array.`);
  } else {
    return arr;
  }
}

export function errorIfNotPrimative(
  key: keyof MongoQueryOperatorProperties,
  query: MongoQuery
) {
  const value = query[key];
  if (!isMongoPrimative(value)) {
    throw new Error(`Value for mongo query operator ${key} must be primative.`);
  } else {
    return value;
  }
}

export function matchesPrimative(val: MongoPrimative, query: MongoPrimative) {
  if (val instanceof Date) {
    return query instanceof Date && query.getTime() === val.getTime();
  }

  if (query instanceof RegExp) {
    if (typeof val === 'string') {
      return query.test(val);
    }
    return query === val;
  }

  if (isObjectID(val)) {
    return isObjectID(query) && val.equals(query);
  }

  return val === query;
}

export function inequalityCompare(
  key: '$gt' | '$gte' | '$lt' | '$lte',
  doc: MongoPrimative,
  query: MongoPrimative
) {
  switch (key) {
    case '$gt':
      return query! < doc!;
    case '$gte':
      return query! <= doc!;
    case '$lt':
      return query! > doc!;
    case '$lte':
      return query! >= doc!;

    default: {
      throw new Error(`Invalid inequality operator: ${key}`);
    }
  }
}
