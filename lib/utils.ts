/** Return an array containing the values in `a` that are not in `b` */
export function subtractArrays<T>(
  a: readonly T[],
  b: readonly T[],
  equalityFn: (a: T, b: T) => boolean = (a, b) => a === b,
): T[] {
  return a.filter(
    (value) => b.findIndex((other) => equalityFn(value, other)) === -1,
  );
}

/** Return an array containing the values that are only in `a` OR `b` but not both */
export function difference<T>(
  a: readonly T[],
  b: readonly T[],
  equalityFn: (a: T, b: T) => boolean = (a, b) => a === b,
) {
  return [
    ...subtractArrays(a, b, equalityFn),
    ...subtractArrays(b, a, equalityFn),
  ];
}
