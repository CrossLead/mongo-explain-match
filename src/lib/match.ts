import {
  errorIfNotArray,
  errorIfNotPrimative,
  inequalityCompare,
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

/**
 * return value of calling `match(query, doc)`
 */
export interface MatchResult {
  match: boolean;
  reasons: MatchResultReason[];
}

/**
 * metadata describing the reason for the match (or failure to match)
 *  - `propertyPath`: location in the document of the relevant value
 *  - `queryPath`: location in the query relevant to the above value
 *  - `type`: the type of interaction between query and document
 */
export interface MatchResultReason {
  propertyPath: string;
  queryPath: string;
  type: MatchResultType;
}

/**
 * types of interactions between documents and queries
 */
export enum MatchResultType {
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  IN_SET = 'IN_SET',
  NOT_IN_SET = 'NOT_IN_SET',
  ELEMENT_MATCH = 'ELEMENT_MATCH',
  HAS_NO_KEYS = 'HAS_NO_KEYS',
  HAS_NO_PATH = 'HAS_NO_PATH',
  INEQUALITY = 'INEQUALITY',
  INVALID_OPERATOR = 'INVALID_OPERATOR'
}

/**
 * current paths as we recurse through a mongo query and document pair.
 */
export interface TraversalState {
  propertyPath: string;
  queryPath: string;
}

/**
 * explain why a query matches a doc or return a curried function
 * for filtering an array of mongodb objects
 *
 * @param query mongodb query object
 * @param doc mongodb document as plain object
 */
export function match(query: object): ((doc: object) => boolean);
export function match(query: object, doc: object): MatchResult;
export function match(
  query: object,
  doc?: object
): MatchResult | ((doc: object) => boolean) {
  const state = { propertyPath: '', queryPath: '' };

  if (!doc) {
    return (d: object) => handleDocument(d, query as MongoQuery, state).match;
  }

  return handleDocument(doc, query as MongoQuery, state);
}

/**
 * determine if a query matches a document,
 * and find all reasons why (or why not)
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
    } else if (!resultMatches) {
      hasMatchFailure = true;
      failureReasons.push(...reasons);
    }
  }

  return {
    match: !hasMatchFailure,
    reasons: hasMatchFailure ? failureReasons : successReasons
  };
}

/**
 * determine if a query matches a specific document property,
 * and find all reasons why (or why not)
 */
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

/**
 * determine if a primative value matches another primative value
 */
function handlePrimative(
  doc: any,
  value: MongoPrimative,
  state: TraversalState
) {
  return {
    match: matchesPrimative(doc, value),
    reasons: [createReason(state, MatchResultType.EQUAL)]
  };
}

/**
 * check if a nested property query field matches the document,
 * and find all reasons why or why not.
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
 * check if a property inside of an operator key on a query matches the document,
 * and find all reasons why or why not.
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

    case '$in':
    case '$nin': {
      const arr = errorIfNotArray(key, query);
      const newState = extendPaths(state, { query: key });
      const $in = key === '$in';
      const reason = createReason(
        newState,
        $in ? MatchResultType.IN_SET : MatchResultType.NOT_IN_SET
      );

      for (const v of arr) {
        if (!isMongoPrimative(v)) {
          throw new Error(`Non primative in ${key} clause`);
        }

        const isMatch = Array.isArray(doc)
          ? doc.some(dv => matchesPrimative(dv, v))
          : matchesPrimative(doc, v);

        if (isMatch) {
          return {
            match: $in,
            reasons: [reason]
          };
        }
      }
      return {
        match: !$in,
        reasons: [reason]
      };
    }

    case '$not': {
      const invertResult = handleDocument(
        doc,
        query[key] as MongoQuery,
        extendPaths(state, { query: '$not' })
      );
      return {
        match: !invertResult.match,
        reasons: invertResult.reasons
      };
    }

    case '$ne':
    case '$eq': {
      const value = errorIfNotPrimative(key, query);
      const $eq = key === '$eq';
      const matches = matchesPrimative(doc, value);
      return {
        match: $eq ? matches : !matches,
        reasons: [
          createReason(
            extendPaths(state, { query: key }),
            $eq ? MatchResultType.EQUAL : MatchResultType.NOT_EQUAL
          )
        ]
      };
    }

    case '$gt':
    case '$gte':
    case '$lt':
    case '$lte': {
      const value = errorIfNotPrimative(key, query);
      return {
        match: inequalityCompare(key, doc, value),
        reasons: [
          createReason(
            extendPaths(state, { query: key }),
            MatchResultType.INEQUALITY
          )
        ]
      };
    }

    case '$elemMatch': {
      if (!Array.isArray(doc)) {
        throw new Error(`Cannot use $elemMatch for non-array property.`);
      }
      const value = query[key];
      const newState = extendPaths(state, { query: key });

      let i = 0;
      for (const docVal of doc) {
        const result = handleDocument(
          docVal,
          value!,
          extendPaths(newState, { doc: `[${i}]` })
        );
        if (result.match) {
          positiveReasons.push(...result.reasons);
        } else {
          negativeReasons.push(...result.reasons);
        }
        i++;
      }

      const isMatch = !!positiveReasons.length;

      return {
        match: isMatch,
        reasons: isMatch ? positiveReasons : negativeReasons
      };
    }

    default: {
      throw new Error(`No logic for query operator: "${key}"`);
    }
  }
}

/**
 * increment query or document paths as we recurse deeper
 */
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

/**
 * extend a path by one property access level if needed
 */
function joinPaths(a: string, b: string) {
  return a && b ? `${a}.${b}` : b || a;
}

/**
 * MatchResultReason factory function
 */
function createReason(
  state: TraversalState,
  type: MatchResultType
): MatchResultReason {
  const { propertyPath, queryPath } = state;

  return { propertyPath, queryPath, type };
}
