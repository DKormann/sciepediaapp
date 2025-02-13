
const _objectIds = new WeakMap<any, number>()
let _ctr = 0

export const objectId = (obj: any): number => {
  if (_objectIds.has(obj)) return _objectIds.get(obj)!
  _objectIds.set(obj, _ctr)
  return _ctr++
}
