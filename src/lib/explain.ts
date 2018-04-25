import {
  errorIfNotArray,
  isMongoPrimative,
  isNestedPropertyKey,
  isObjectID,
  isOperatorKey,
  MongoPrimative,
  MongoQuery,
  ObjectID
} from './mongo';
import { get } from './util';

export interface ExplainResult {
  match: boolean;
  reasons: ExplainResultReason[];
}

export interface ExplainResultReason {
  propertyPath: string;
  queryPath: string;
  type: ExplainResultType;
}

export enum ExplainResultType {
  EQUAL = 'EQUAL',
  IN_SET = 'IN_SET',
  HAS_NO_KEYS = 'HAS_NO_KEYS',
  HAS_NO_PATH = 'HAS_NO_PATH',
  INVALID_OPERATOR = 'INVALID_OPERATOR'
}

export interface TraversalState {
  propertyPath: string;
  queryPath: string;
}

/**
 * explain why a query matches a doc
 *
 * @param doc mongodb document as plain object
 * @param query mongodb query object
 */
export function explain(doc: any, query: MongoQuery) {
  return handleDocument(doc, query, { propertyPath: '', queryPath: '' });
}

/**
 * base handler for query objects
 *
 *
 * @param doc
 * @param query
 * @param state
 */
function handleDocument(
  doc: any,
  query: MongoQuery,
  state: TraversalState
): ExplainResult {
  const keys = Object.keys(query);

  let hasMatchFailure = false;

  const failureReasons: ExplainResultReason[] = [];
  const successReasons: ExplainResultReason[] = [];

  // short circuit on no keys -- universal positive match
  if (!keys.length) {
    return {
      match: true,
      reasons: [createReason(state, ExplainResultType.HAS_NO_KEYS)]
    };
  }

  for (const key of keys) {
    const { match, reasons } = handleDocumentProperty(key, doc, query, state);

    if (!hasMatchFailure && match) {
      successReasons.push(...reasons);
    } else {
      hasMatchFailure = true;
      failureReasons.push(...reasons);
    }
  }

  return {
    match: !hasMatchFailure,
    reasons: hasMatchFailure ? failureReasons : successReasons
  };
}

function handleDocumentProperty(
  key: string,
  doc: any,
  query: MongoQuery,
  state: TraversalState
): ExplainResult {
  if (isOperatorKey(key)) {
    return handleOperatorKey(key, doc, query, state);
  }

  if (isNestedPropertyKey(key)) {
    return handleNestedKey(key, doc, query, state);
  }

  const newState = extendPaths(state, { doc: key, query: key });

  if (key in doc) {
    const nestedDoc = doc[key];
    const nestedQuery = query[key];

    if (isMongoPrimative(nestedQuery)) {
      return handlePrimative(nestedDoc, nestedQuery, newState);
    } else {
      return handleDocument(nestedDoc, nestedQuery, newState);
    }
  } else {
    return {
      match: false,
      reasons: [createReason(state, ExplainResultType.HAS_NO_PATH)]
    };
  }
}

function handlePrimative(
  doc: any,
  value: MongoPrimative,
  state: TraversalState
) {
  const match = matchesPrimative(doc, value);
  return {
    match,
    reasons: [createEqualityReason(state)]
  };
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
  state: TraversalState
): ExplainResult {
  const newState = extendPaths(state, { doc: key, query: `"${key}"` });
  const nestedDoc = get(doc, key);
  const nestedQuery = query[key];

  if (isMongoPrimative(nestedQuery)) {
    return handlePrimative(nestedDoc, nestedQuery, newState);
  } else {
    return handleDocument(nestedDoc, nestedQuery, newState);
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
  state: TraversalState
): ExplainResult {
  switch (key) {
    case '$and': {
      errorIfNotArray(key, query);
      const arr = query[key]!;
      const newState = extendPaths(state, { query: '$and' });
      const positiveReasons: ExplainResultReason[] = [];

      for (const q of arr) {
        const result = handleDocument(doc, q, newState);
        if (!result.match) {
          return result;
        } else {
          positiveReasons.push(...result.reasons);
        }
      }

      return {
        match: true,
        reasons: positiveReasons
      };
    }

    case '$or': {
      errorIfNotArray(key, query);
      const arr = query[key]!;
      const newState = extendPaths(state, { query: '$or' });
      const negativeReasons: ExplainResultReason[] = [];

      for (const q of arr) {
        const result = handleDocument(doc, q, newState);
        if (result.match) {
          return result;
        } else {
          negativeReasons.push(...result.reasons);
        }
      }

      return {
        match: false,
        reasons: negativeReasons
      };
    }

    case '$in': {
      errorIfNotArray(key, query);
    }

    case '$nin': {
      errorIfNotArray(key, query);
    }

    default: {
      throw new Error(`No logic for query operator: "${key}"`);
    }
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

function extendPaths(
  state: TraversalState,
  paths: { query?: string; doc?: string }
) {
  const { query, doc } = paths;
  const { queryPath, propertyPath } = state;

  return {
    ...state,
    queryPath: query ? joinPaths(queryPath, query) : queryPath,
    propertyPath: doc ? joinPaths(propertyPath, doc) : propertyPath
  };
}

function joinPaths(a: string, b: string) {
  return a && b ? `${a}.${b}` : b || a;
}

function createEqualityReason(state: TraversalState) {
  return createReason(state, ExplainResultType.EQUAL);
}

function createReason(state: TraversalState, type: ExplainResultType) {
  const { propertyPath, queryPath } = state;
  return {
    propertyPath,
    queryPath,
    type
  };
}
