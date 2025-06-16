import { mergeDefaults } from "./mergeDefaults";

export type DimensionDef<T, Context> = {
  /** a human-readable header that will show at the top of the table in the test logs */
  header: string;
  /**
   * a human-readable version of this dimension's value that will show in the rows of the test logs
   * @param value the current value of this dimension
   */
  formatValue?(value: T): string;
  /** all possible values for this dimension */
  values: readonly T[];
  /**
   * runs within the describe block for each value for this dimension. Can be used to add given / beforeEach / afterEach, etc.
   * @param value the current value of this dimension
   */
  applyInDescribe?(value: T): void;
  /**
   * modifies the test context to configure the value for this dimension
   * @param value the current value of this dimension
   * @param context the context your dimension needs to apply its value to
   */
  apply?(value: T, context: Context): void;
};

export type Dimension<T, Context> = Required<DimensionDef<T, Context>>;

export type DimensionContext<D extends Dimension<unknown, never>> =
  D extends Dimension<unknown, infer C> ? C : never;

export function createDimension<T, Context = never>(
  def: DimensionDef<T, Context>,
) {
  if (def.values.length === 0) {
    throw new Error("Dimensions must have at least one value defined");
  }

  return mergeDefaults(
    {
      formatValue: (value) => String(value),
      applyInDescribe: () => {},
      apply: () => {},
    },
    def,
  );
}
