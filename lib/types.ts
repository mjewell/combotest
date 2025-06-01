export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// copied from https://github.com/piotrwitek/utility-types
export type UnionToIntersection<U> =
  // biome-ignore lint/suspicious/noExplicitAny: copied code from utility-types
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;
