
export const prim = {
  isObject: isObject,
  isString: isString,
  isNumber: isNumber,
  isPromise: isPromise,

  is_object,
} as const;

function isObject(val: unknown): val is Record<string | number | symbol, unknown> {
  return (
    (val !== null)
    && ((typeof val) === 'object')
  );
}

/* For non-Record object type. use for libs. _*/
function is_object(val: unknown): val is object {
  return isObject(val);
}

function isString(val: unknown): val is string {
  return (typeof val) === 'string';
}

function isNumber(val: unknown): val is number {
  return (typeof val) === 'number';
}

export function isPromise<T>(val: unknown): val is Promise<T> {
  if(!isObject(val)) {
    return false;
  }
  if(val instanceof Promise) {
    return true;
  }
  return (typeof val?.then) === 'function';
}
