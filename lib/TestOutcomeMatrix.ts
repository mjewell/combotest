import { expect } from "vitest";
import { describe, it } from "./mockableVitest";
import type { UnionToIntersection } from "./types";

import { type Options, OutcomeMatrix } from "./OutcomeMatrix";
import type { Dimension, DimensionContext } from "./dimensions";

type ApplyDimensionsCallback<
  D extends Record<string, Dimension<unknown, never>>,
> = (
  context: UnionToIntersection<DimensionContext<D[keyof D]>>,
) => typeof context;

export class TestOutcomeMatrix<
  Dimensions extends Record<string, Dimension<unknown, never>>,
  Outcomes extends string,
> extends OutcomeMatrix<Dimensions, Outcomes> {
  private columnWidths: number[];

  constructor({
    dimensions,
    outcomes,
    defaultOutcome,
  }: {
    dimensions: Dimensions;
    outcomes: Outcomes[];
    defaultOutcome: NoInfer<Outcomes>;
  }) {
    super({
      dimensions,
      outcomes,
      defaultOutcome,
    });
    this.columnWidths = Object.values(this.dimensions).map((d) =>
      Math.max(
        d.header.length,
        ...d.values.map((v) => d.formatValue(v).length),
      ),
    );
  }

  private stringifyRow(row: string[]) {
    return [...row.map((c, i) => c.padEnd(this.columnWidths[i], " "))].join(
      " | ",
    );
  }

  private printHeaders() {
    const description = this.stringifyRow(
      Object.values(this.dimensions).map((d) => d.header),
    );

    describe(description, () => {
      // just some dummy expectation to make the header look right
      it("Outcome", () => expect(true).toBe(true));
    });
  }

  private testOutcomesInternal(
    callback: (
      applyDimensions: ApplyDimensionsCallback<Dimensions>,
      outcome: Outcomes,
    ) => void,
    options: Options<Dimensions, Outcomes>,
  ) {
    this.forEach((dimensionValues, outcome) => {
      const dimensionValuesArray = Object.values(dimensionValues);
      const description = this.stringifyRow(
        dimensionValuesArray.map((d) => d.formatValue(d.value)),
      );
      describe(description, () => {
        for (const dimensionValue of dimensionValuesArray) {
          dimensionValue.applyInDescribe(dimensionValue.value);
        }

        const applyDimensions: ApplyDimensionsCallback<Dimensions> = (
          context,
        ) => {
          for (const dimensionValue of dimensionValuesArray) {
            dimensionValue.apply(dimensionValue.value, context);
          }
          return context;
        };

        callback(applyDimensions, outcome);
      });
    }, options);
  }

  public testOutcomes(
    callback: (
      applyDimensions: ApplyDimensionsCallback<Dimensions>,
      outcome: Outcomes,
    ) => void,
    options: Options<Dimensions, Outcomes> = {},
  ) {
    this.printHeaders();
    this.testOutcomesInternal(callback, options);
  }
}
