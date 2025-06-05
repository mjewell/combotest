import type { Dimension } from "./dimensions";

type DimensionValue<D extends Dimension<unknown, unknown>> =
  D["values"][number];

type DimensionsValues<D extends Record<string, Dimension<unknown, unknown>>> = {
  [K in keyof D]: DimensionValue<D[K]>;
};

type DimensionWithValue<D extends Dimension<unknown, unknown>> = D & {
  value: DimensionValue<D>;
};

type DimensionsWithValues<
  D extends Record<string, Dimension<unknown, unknown>>,
> = {
  [K in keyof D]: DimensionWithValue<D[K]>;
};

export class OutcomeMatrix<
  Dimensions extends Record<string, Dimension<unknown, unknown>>,
  Outcomes extends string,
> {
  public dimensions: Dimensions;
  public outcomes: Outcomes[];
  private defaultOutcome: Outcomes;
  private getOutcomeFn: (
    dimensionValues: DimensionsValues<Dimensions>,
  ) => Outcomes | undefined = () => undefined;

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
  defineOutcomes(callback: typeof this.getOutcomeFn) {
    this.getOutcomeFn = callback;
  }

  private getOutcome(dimensionValues: DimensionsValues<Dimensions>) {
    return this.getOutcomeFn(dimensionValues) ?? this.defaultOutcome;
  }

  private forEachInternal(
    callback: (
      dimensionsWithValues: DimensionsWithValues<Dimensions>,
      outcome: Outcomes,
    ) => void,
    filter: (outcome: Outcomes) => boolean = () => true,
    dimensionsWithValues: Partial<DimensionsWithValues<Dimensions>> = {},
  ) {
    const nextDimension = Object.entries(this.dimensions)[
      Object.keys(dimensionsWithValues).length
    ];

    if (!nextDimension) {
      const allDimensionsWithValues =
        dimensionsWithValues as DimensionsWithValues<Dimensions>;
      const allDimensionsValues = Object.fromEntries(
        Object.entries(allDimensionsWithValues).map(([k, v]) => [k, v.value]),
      ) as DimensionsValues<Dimensions>;

      const outcome = this.getOutcome(allDimensionsValues);

      if (filter(outcome)) {
        callback(allDimensionsWithValues, outcome);
      }

      return;
    }

    const [key, def] = nextDimension;

    for (const value of def.values) {
      const newDimensionsWithValues = {
        ...dimensionsWithValues,
        [key]: { ...def, value },
      };
      this.forEachInternal(callback, filter, newDimensionsWithValues);
    }
  }

  forEach(
    callback: (
      dimensionsWithValues: DimensionsWithValues<Dimensions>,
      outcome: Outcomes,
    ) => void,
    filter: (outcome: Outcomes) => boolean = () => true,
  ) {
    this.forEachInternal(callback, filter);
  }
}
