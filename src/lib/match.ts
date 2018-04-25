import {
  errorIfNotArray,
  errorIfNotPrimative,
  isMongoPrimative,
  isNestedPropertyKey,
  isObjectID,
  isOperatorKey,
  matchesPrimative,
  MongoPrimative,
  MongoQuery,
  ObjectID
} from './mongo';
import { get } from './util';

export interface MatchResult {
  match: boolean;
  reasons: MatchResultReason[];
}

export interface MatchResultReason {
  propertyPath: string;
  queryPath: string;
  type: MatchResultType;
}

export enum MatchResultType {
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  IN_SET = 'IN_SET',
  NOT_IN_SET = 'NOT_IN_SET',
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
 * @param query mongodb query object
 * @param doc mongodb document as plain object
 */
export function match(query: MongoQuery): ((doc: object) => MatchResult);
export function match(query: MongoQuery, doc: object): MatchResult;
export function match(
  query: MongoQuery,
  doc?: object
): MatchResult | ((doc: object) => MatchResult) {
  const state = { propertyPath: '', queryPath: '' };

  if (!doc) {
    return (d: object) => handleDocument(d, query, state);
  }

  return handleDocument(doc, query, state);
}

/**
 * base handler for query objects
 *
 * @param doc
 * @param query
 * @param state
 */
function handleDocument(
  doc: any,
  query: MongoQuery,
  state: TraversalState
): MatchResult {
  const keys = Object.keys(query);

  let hasMatchFailure = false;

  const failureReasons: MatchResultReason[] = [];
  const successReasons: MatchResultReason[] = [];

  // short circuit on no keys -- universal positive match
  if (!keys.length) {
    return {
      match: true,
      reasons: [createReason(state, MatchResultType.HAS_NO_KEYS)]
    };
  }

  for (const key of keys) {
    const { match: resultMatches, reasons } = handleDocumentProperty(
      key,
      doc,
      query,
      state
    );

    if (!hasMatchFailure && resultMatches) {
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
): MatchResult {
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
      reasons: [createReason(state, MatchResultType.HAS_NO_PATH)]
    };
  }
}

function handlePrimative(
  doc: any,
  value: MongoPrimative,
  state: TraversalState
) {
  return {
    match: matchesPrimative(doc, value),
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
): MatchResult {
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
): MatchResult {
  const positiveReasons: MatchResultReason[] = [];
  const negativeReasons: MatchResultReason[] = [];

  switch (key) {
    case '$and': {
      const arr = errorIfNotArray(key, query);
      const newState = extendPaths(state, { query: '$and' });

      let isMatch = true;
      let i = 0;

      for (const q of arr) {
        const result = handleDocument(
          doc,
          q as MongoQuery,
          extendPaths(newState, { query: `[${i}]` })
        );

        if (!result.match) {
          isMatch = false;
          negativeReasons.push(...result.reasons);
        } else {
          positiveReasons.push(...result.reasons);
        }

        i++;
      }

      return {
        match: isMatch,
        reasons: isMatch ? positiveReasons : negativeReasons
      };
    }

    case '$or': {
      const arr = errorIfNotArray(key, query);
      const newState = extendPaths(state, { query: '$or' });

      let isMatch = false;
      let i = 0;

      for (const q of arr) {
        const result = handleDocument(
          doc,
          q as MongoQuery,
          extendPaths(newState, { query: `[${i}]` })
        );

        if (result.match) {
          isMatch = true;
          positiveReasons.push(...result.reasons);
        } else {
          negativeReasons.push(...result.reasons);
        }

        i++;
      }

      return {
        match: isMatch,
        reasons: isMatch ? positiveReasons : negativeReasons
      };
    }

    case '$in': {
      const arr = errorIfNotArray(key, query);
      const newState = extendPaths(state, { query: '$in' });
      const reason = createReason(newState, MatchResultType.IN_SET);

      for (const v of arr) {
        if (!isMongoPrimative(v)) {
          throw new Error(`Non primative in $in clause`);
        }
        if (matchesPrimative(doc, v)) {
          return {
            match: true,
            reasons: [reason]
          };
        }
      }
      return {
        match: false,
        reasons: [reason]
      };
    }

    case '$nin': {
      const arr = errorIfNotArray(key, query);
      const newState = extendPaths(state, { query: '$nin' });
      const reason = createReason(newState, MatchResultType.NOT_IN_SET);

      for (const v of arr) {
        if (!isMongoPrimative(v)) {
          throw new Error(`Non primative in $in clause`);
        }
        if (matchesPrimative(doc, v)) {
          return {
            match: false,
            reasons: [reason]
          };
        }
      }
      return {
        match: true,
        reasons: [reason]
      };
    }

    case '$ne': {
      const value = errorIfNotPrimative(key, query);
      return {
        match: !matchesPrimative(doc, value),
        reasons: [
          createReason(
            extendPaths(state, { query: '$ne' }),
            MatchResultType.NOT_EQUAL
          )
        ]
      };
    }

    default: {
      throw new Error(`No logic for query operator: "${key}"`);
    }
  }
}

function extendPaths(
  state: TraversalState,
  paths: { query?: string; doc?: string }
): TraversalState {
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
  return createReason(state, MatchResultType.EQUAL);
}

function createReason(state: TraversalState, type: MatchResultType) {
  const { propertyPath, queryPath } = state;

  return { propertyPath, queryPath, type };
}
