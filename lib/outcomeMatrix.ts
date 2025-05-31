import type { Dimension } from "./dimensions";

type DimensionValue<D extends Dimension<unknown, unknown>> =
  D["values"][number];

type DimensionWithValue<D extends Dimension<unknown, unknown>> = D & {
  value: DimensionValue<D>;
};

export class OutcomeMatrix<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- inference works better with `any` for some reason
  Dimensions extends Dimension<any, any>[],
  Outcomes extends string
> {
  private outcomeRegistry: {
    outcome: Outcomes;
    dimensions: Map<() => void, DimensionValue<Dimensions[number]>>;
  }[] = [];
  public dimensions: Dimensions;
  public outcomes: Outcomes[];
  private defaultOutcome: Outcomes;

  constructor({
    dimensions,
    outcomes,
    defaultOutcome,
  }: {
    dimensions: Dimensions;
    outcomes: Outcomes[];
    defaultOutcome: Outcomes;
  }) {
    this.dimensions = dimensions;
    this.outcomes = outcomes;
    this.defaultOutcome = defaultOutcome;

    if (!this.outcomes.includes(this.defaultOutcome)) {
      throw new Error(
        `Default outcome "${
          this.defaultOutcome
        }" is not defined in the outcomes list: ${this.outcomes.join(", ")}`
      );
    }
  }

  private forEachInternal(
    callback: (
      dimensionValues: DimensionWithValue<Dimensions[number]>[],
      outcome: Outcomes
    ) => void,
    filter: (outcome: Outcomes) => boolean = () => true,
    dimensionValues: DimensionWithValue<Dimensions[number]>[] = []
  ) {
    const def = this.dimensions[dimensionValues.length];

    if (!def) {
      const outcome = this.getOutcome(dimensionValues);
      if (filter(outcome)) {
        callback(dimensionValues, outcome);
      }
      return;
    }

    def.values.forEach((value) => {
      this.forEachInternal(callback, filter, [
        ...dimensionValues,
        { ...def, value },
      ]);
    });
  }

  forEach(
    callback: (
      dimensionValues: DimensionWithValue<Dimensions[number]>[],
      outcome: Outcomes
    ) => void,
    filter: (outcome: Outcomes) => boolean = () => true
  ) {
    this.forEachInternal(callback, filter);
  }

  markOutcome(
    dimensions: Map<() => void, DimensionValue<Dimensions[number]>>,
    outcome: Outcomes
  ) {
    if (!this.outcomes.includes(outcome)) {
      throw new Error(
        `Outcome "${outcome}" is not defined in the outcomes list: ${this.outcomes.join(
          ", "
        )}`
      );
    }

    this.outcomeRegistry.push({ outcome, dimensions: new Map(dimensions) });
  }

  getOutcome(
    dimensionValues: DimensionWithValue<Dimensions[number]>[]
  ): Outcomes {
    if (dimensionValues.length === 0) {
      throw new Error("No dimensions provided");
    }

    const matchingEntries = this.outcomeRegistry.filter((entry) =>
      Array.from(entry.dimensions.entries()).every(([key, value]) => {
        const dimensionValue = dimensionValues.find((dv) => dv.apply === key);

        if (!dimensionValue) {
          throw new Error(
            `Dimension not found. Are you defining outcomes with a dimension that's not specified in 'dimensions'?`
          );
        }

        return value === dimensionValue.value;
      })
    );

    if (matchingEntries.length === 0) {
      return this.defaultOutcome;
    }

    const uniqueOutcomes = new Set(matchingEntries.map((o) => o.outcome));

    if (uniqueOutcomes.size > 1) {
      throw new Error(
        `Multiple outcomes found for ${dimensionValues
          .map((v) => v.value)
          .join(", ")}: ${Array.from(uniqueOutcomes).join(", ")}`
      );
    }

    return matchingEntries[0].outcome;
  }
}
