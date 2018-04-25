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
  | undefined;

/**
 * Properties on a mongo query that would be arrays
 */
export interface MongoQueryOperatorProperties {
  $and?: MongoQuery[];
  $or?: MongoQuery[];
  $in?: MongoPrimative[];
  $nin?: MongoPrimative[];
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
  return (
    typeof obj === 'undefined' ||
    typeof obj !== 'object' ||
    obj === null ||
    obj instanceof Date ||
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
  if (!Array.isArray(query[key])) {
    throw new Error(`Value for mongo query operator ${key} must be an array.`);
  }
}
