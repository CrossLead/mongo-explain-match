/**
 * explain why a query matches a doc
 *
 * @param doc mongodb document as plain object
 * @param query mongodb query object
 */
export function explain(doc: object, query: {}) {
  const reasons: string[] = [];

  return { matches: true, reasons: reasons.join(' ') };
}
