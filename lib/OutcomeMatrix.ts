import type { Dimension } from "./dimensions";
import { type WithDefaults, mergeDefaults } from "./mergeDefaults";
import type { Prettify } from "./types";
import { mapValues } from "./utils";

type Value<D extends Dimension> = D["values"][number];

type Values<D extends Record<string, Dimension>> = Prettify<{
  [K in keyof D & string]: Value<D[K]>;
}>;

type DimensionValue<D extends Dimension> = D & {
  value: Value<D>;
};

type DimensionValues<D extends Record<string, Dimension>> = Prettify<{
  [K in keyof D & string]: DimensionValue<D[K]>;
}>;

export type Options<
  Dimensions extends Record<string, Dimension>,
  Outcomes extends string,
> = {
  order?: "dimensions" | "outcomes";
  only?: (values: Values<Dimensions>, outcome: Outcomes) => boolean;
};

type ResolvedOptions<
  Dimensions extends Record<string, Dimension>,
  Outcomes extends string,
> = WithDefaults<Options<Dimensions, Outcomes>, "order" | "only">;

export class OutcomeMatrix<
  Dimensions extends Record<string, Dimension>,
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
  public defineOutcomes(
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
    options: ResolvedOptions<Dimensions, Outcomes>,
    dimensionValues: Partial<DimensionValues<Dimensions>> = {},
  ) {
    const nextDimension = Object.entries(this.dimensions)[
      Object.keys(dimensionValues).length
    ];

    if (!nextDimension) {
      const allDimensionValues = dimensionValues as DimensionValues<Dimensions>;
      const values = mapValues(allDimensionValues, (v) => v.value);

      const outcome = this.getOutcome(values);

      if (!this.outcomes.includes(outcome)) {
        throw new Error(
          `Outcome "${outcome}" is not defined in the outcomes list: ${this.outcomes.join(", ")}`,
        );
      }

      if (!options.only(values, outcome)) {
        return;
      }

      callback(allDimensionValues, outcome);

      return;
    }

    const [key, def] = nextDimension;

    for (const value of def.values) {
      const newDimensionValues = {
        ...dimensionValues,
        [key]: { ...def, value },
      };
      this.forEachInternal(callback, options, newDimensionValues);
    }
  }

  public forEach(
    callback: (
      dimensionValues: DimensionValues<Dimensions>,
      outcome: Outcomes,
    ) => void,
    opts: Options<Dimensions, Outcomes>,
  ) {
    const options = mergeDefaults(
      { order: "outcomes", only: () => true },
      opts,
    );

    if (options.order === "dimensions") {
      this.forEachInternal(callback, options);
    } else {
      for (const targetOutcome of this.outcomes) {
        this.forEachInternal(callback, {
          ...options,
          only: (values, outcome) =>
            options.only(values, outcome) && outcome === targetOutcome,
        });
      }
    }
  }
}
