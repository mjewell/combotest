import type { Prettify } from "./types";

type RequireKeys<T, K extends keyof T = keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export type WithDefaults<
  T extends object,
  D extends Partial<T> | keyof T,
> = Prettify<RequireKeys<T, D extends keyof T ? D : keyof D & keyof T>>;

function omitUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as T;
}

/**
 * Creates a new object by merging the defaults with the given object, using the default value when
 * the corresponding value in the object is missing or `undefined`. This behaves the same as
 * defining defaults in a destructured function parameter, e.g.
 *
 * ```ts
 * type Options = {
 *   a?: number;
 *   b: number;
 * };
 *
 * const example = ({ a = 1, b }: Options = { b: 2 }) => ({ a, b });
 * // is equivalent to
 * const example = (options: Options = { b: 2 }) => mergeDefaults({ a: 1 }, options);
 *
 * example();                       // { a: 1, b: 2 }
 * example({ b: 3 });               // { a: 1, b: 3 }
 * example({ a: 4, b: 5 });         // { a: 4, b: 5 }
 * example({ a: undefined, b: 6 }); // { a: 1, b: 6 }
 * ```
 *
 * but it does not require destructuring, so it's useful if you need a reference to the original
 * object.
 *
 * @param defaults The default values.
 * @param obj The object to merge with the defaults.
 * @returns The merged object.
 */
export function mergeDefaults<T extends object, const D extends Partial<T>>(
  defaults: D,
  obj: T,
) {
  return {
    ...defaults,
    ...omitUndefined(obj),
  } as WithDefaults<T, D>;
}
