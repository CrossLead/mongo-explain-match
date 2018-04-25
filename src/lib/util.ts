/**
 * get object property by path
 *
 * @param obj
 * @param path
 */
export function get(obj: any, path: string) {
  const components = path.split('.');
  for (const key of components) {
    obj = obj[key];
  }
  return obj;
}
