import { expect } from "vitest";
import { describe, it } from "./mockableVitest";
import type { UnionToIntersection } from "./types";

import { OutcomeMatrix, type Values } from "./OutcomeMatrix";
import type { Dimension } from "./dimensions";
import { mapValues } from "./utils";

type ApplyDimensionsCallback<
  D extends Record<string, Dimension<unknown, never>>,
> = (
  context: UnionToIntersection<Parameters<D[keyof D]["apply"]>[1]>,
) => typeof context;

export class TestOutcomeMatrix<
  Dimensions extends Record<string, Dimension<unknown, never>>,
  Outcomes extends string,
> extends OutcomeMatrix<Dimensions, Outcomes> {
  columnWidths: number[];

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
    filter: (values: Values<Dimensions>, outcome: Outcomes) => boolean = () =>
      true,
  ) {
    this.forEach((dimensionValues, outcome) => {
      const values = mapValues(dimensionValues, (v) => v.value);

      if (!filter(values, outcome)) {
        return;
      }

      const dimensionValuesArray = Object.values(dimensionValues);
      const description = this.stringifyRow(
        dimensionValuesArray.map((d) => d.formatValue(d.value)),
      );
      describe(description, () => {
        for (const dimensionValue of dimensionValuesArray) {
          dimensionValue.applyInDescribe?.(dimensionValue.value);
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
    });
  }

  testOutcomes(
    callback: (
      applyDimensions: ApplyDimensionsCallback<Dimensions>,
      outcome: Outcomes,
    ) => void,
    opts: {
      order?: "dimensions" | "outcomes";
      only?: (values: Values<Dimensions>, outcome: Outcomes) => boolean;
    } = {},
  ) {
    const options = { order: "outcomes", only: () => true, ...opts };

    this.printHeaders();
    if (options.order === "dimensions") {
      this.testOutcomesInternal(callback, options.only);
    } else {
      for (const targetOutcome of this.outcomes) {
        this.testOutcomesInternal(
          callback,
          (values, outcome) =>
            options.only(values, outcome) && outcome === targetOutcome,
        );
      }
    }
  }
}
