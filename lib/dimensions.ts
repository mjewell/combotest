import { addGlobalContext, removeGlobalContext } from "./globalContext";
import type { Required } from "./types";
import { difference, subtractArrays } from "./utils";

type PartialOptions<T> = {
  equalityFn?: (a: T, b: T) => boolean;
};

const defaultOptions: Required<PartialOptions<unknown>, "equalityFn"> = {
  equalityFn: (a: unknown, b: unknown) => a === b,
};

type Options<T> = Required<PartialOptions<T>, keyof typeof defaultOptions>;

type DimensionDef<T, Context> = {
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
  apply(value: T, context: Context): void;
};

const reservedGroupNames = ["all", "other"] as const;
type ReservedGroupNames = (typeof reservedGroupNames)[number];

type GroupType<T> = {
  [K: Exclude<string, ReservedGroupNames>]: T[] | readonly T[];
};

export type Dimension<
  T,
  Context,
  G extends GroupType<T> = Record<never, never>,
> = Required<DimensionDef<T, Context>, "formatValue"> & {
  /** creates groups with the corresponding names and values, in addition to an `other` group for the unspecified values, and an `all` group for all possible values */
  group: <NewG extends GroupType<T>>(
    groups: NewG,
  ) => Dimension<T, Context, NewG>;
  /** creates a `true` group for [true], and a `false` group for [false]. `other` will be empty. */
  bool(): Dimension<boolean, Context, { false: [false]; true: [true] }>;
  /** calls the callback with the value */
  whenValue(value: T, callback: () => void): void;
  /** calls the callback with all other values */
  whenNotValue(value: T, callback: () => void): void;
  /** calls the callback with each value in the group provided */
  when(groupName: keyof G | ReservedGroupNames, callback: () => void): void;
};

function createGroupedDimension<T, Context, G extends GroupType<T>>(
  def: DimensionDef<T, Context>,
  groups: G,
  options: Options<NoInfer<T>>,
): Dimension<T, Context, G> {
  if (reservedGroupNames.some((name) => name in groups)) {
    throw new Error(
      `Cannot use [${reservedGroupNames.join(
        ", ",
      )}] as group names, they are reserved`,
    );
  }

  if (Object.values(groups).some((group) => group.length === 0)) {
    throw new Error(
      'Cannot create an empty group. Should you use the "other" group?',
    );
  }

  const allGroupValues = Object.values(groups).flat();

  const unexpectedValues = allGroupValues.filter(
    (v) => !def.values.some((d) => options.equalityFn(v, d)),
  );

  if (unexpectedValues.length > 0) {
    throw new Error(
      `Cannot create a group with value [${unexpectedValues
        .map((v) => JSON.stringify(v))
        .join(
          ", ",
        )}] because it is not defined in the dimension values [${def.values
        .map((v) => JSON.stringify(v))
        .join(", ")}]`,
    );
  }

  const allGroupValuesSet = new Set(allGroupValues);
  if (allGroupValuesSet.size !== allGroupValues.length) {
    throw new Error(
      `Each value must appear in exactly one group but found [${Array.from(
        allGroupValuesSet.values(),
      )
        .map((v) => JSON.stringify(v))
        .join(", ")}] in multiple groups`,
    );
  }

  const allGroups = {
    ...groups,
    other: subtractArrays(def.values, allGroupValues, options.equalityFn),
    all: def.values,
  };

  const group = <G extends GroupType<T>>(newGroups: G) =>
    createGroupedDimension(def, newGroups, options);

  return {
    ...def,
    formatValue: def.formatValue ?? ((value) => String(value)),
    group,
    bool: () => {
      const isBooleanDimension =
        difference<unknown>(def.values, [false, true]).length === 0;

      if (!isBooleanDimension) {
        throw new Error(
          "This dimension is not a boolean dimension. Expected values to be exactly [false, true].",
        );
      }

      return createGroupedDimension(
        def as DimensionDef<boolean, Context>,
        { false: [false], true: [true] },
        { ...options, equalityFn: defaultOptions.equalityFn },
      );
    },
    whenValue(value, callback) {
      addGlobalContext(def.apply, value);
      callback();
      removeGlobalContext(def.apply);
    },
    whenNotValue(value, callback) {
      const values = subtractArrays(def.values, [value], options.equalityFn);
      for (const value of values) {
        this.whenValue(value, callback);
      }
    },
    when(groupName, callback) {
      const values = allGroups[groupName];
      for (const value of values) {
        this.whenValue(value, callback);
      }
    },
  };
}

/** create a new dimension where all provided values are in the `other` group */
export function createDimension<T, Context>(
  def: DimensionDef<T, Context>,
  opts?: PartialOptions<T>,
) {
  const options = { ...defaultOptions, ...opts };

  if (def.values.length === 0) {
    throw new Error("Dimensions must have at least one value defined");
  }

  return createGroupedDimension(def, {}, options);
}

/** create a new dimension with the values [false, true] and corresponding groups */
export function createBooleanDimension<Context>(
  def: Omit<DimensionDef<boolean, Context>, "values">,
) {
  return createDimension({ ...def, values: [false, true] }).bool();
}
