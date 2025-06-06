import type { Dimension } from "./dimensions";
import { mapValues } from "./utils";

type Value<D extends Dimension<unknown, unknown>> = D["values"][number];

export type Values<D extends Record<string, Dimension<unknown, unknown>>> = {
  [K in keyof D]: Value<D[K]>;
};

type DimensionValue<D extends Dimension<unknown, unknown>> = D & {
  value: Value<D>;
};

type DimensionValues<D extends Record<string, Dimension<unknown, unknown>>> = {
  [K in keyof D]: DimensionValue<D[K]>;
};

export class OutcomeMatrix<
  Dimensions extends Record<string, Dimension<unknown, unknown>>,
  Outcomes extends string,
> {
  public dimensions: Dimensions;
  public outcomes: Outcomes[];
  private defaultOutcome: Outcomes;
  private getOutcomeFn: (values: Values<Dimensions>) => Outcomes | undefined =
    () => undefined;

  constructor({
    dimensions,
    outcomes,
    defaultOutcome,
  }: {
    dimensions: Dimensions;
    outcomes: Outcomes[];
    defaultOutcome: NoInfer<Outcomes>;
  }) {
    this.dimensions = dimensions;
    this.outcomes = outcomes;
    this.defaultOutcome = defaultOutcome;

    if (Object.keys(this.dimensions).length === 0) {
      throw new Error("No dimensions provided");
    }

    if (!this.outcomes.includes(this.defaultOutcome)) {
      throw new Error(
        `Default outcome "${
          this.defaultOutcome
        }" is not defined in the outcomes list: ${this.outcomes.join(", ")}`,
      );
    }
  }

  // TODO: part of the constructor?
  defineOutcomes(
    callback: (values: Values<Dimensions>) => Outcomes | undefined,
  ) {
    this.getOutcomeFn = callback;
  }

  private getOutcome(values: Values<Dimensions>) {
    return this.getOutcomeFn(values) ?? this.defaultOutcome;
  }

  private forEachInternal(
    callback: (
      dimensionValues: DimensionValues<Dimensions>,
      outcome: Outcomes,
    ) => void,
    dimensionValues: Partial<DimensionValues<Dimensions>> = {},
  ) {
    const nextDimension = Object.entries(this.dimensions)[
      Object.keys(dimensionValues).length
    ];

    if (!nextDimension) {
      const allDimensionValues = dimensionValues as DimensionValues<Dimensions>;
      const values = mapValues(allDimensionValues, (v) => v.value);

      const outcome = this.getOutcome(values);

      callback(allDimensionValues, outcome);

      return;
    }

    const [key, def] = nextDimension;

    for (const value of def.values) {
      const newDimensionValues = {
        ...dimensionValues,
        [key]: { ...def, value },
      };
      this.forEachInternal(callback, newDimensionValues);
    }
  }

  forEach(
    callback: (
      dimensionValues: DimensionValues<Dimensions>,
      outcome: Outcomes,
    ) => void,
  ) {
    this.forEachInternal(callback);
  }
}
