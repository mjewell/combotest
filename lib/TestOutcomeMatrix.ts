import { expect } from "vitest";
import { describe, it } from "./mockableVitest";
import type { UnionToIntersection } from "./types";

import { OutcomeMatrix } from "./OutcomeMatrix";
import type { Dimension } from "./dimensions";

type ApplyDimensionsCallback<
  D extends Record<string, Dimension<unknown, unknown>>,
> = (
  context: UnionToIntersection<Parameters<D[keyof D]["apply"]>[1]>,
) => typeof context;

export class TestOutcomeMatrix<
  Dimensions extends Record<string, Dimension<unknown, unknown>>,
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
    filter: (outcome: Outcomes) => boolean = () => true,
  ) {
    this.forEach((dimensionValues, outcome) => {
      const dimensionValuesArray = Object.values(dimensionValues);
      const description = this.stringifyRow(
        dimensionValuesArray.map((d) => d.formatValue(d.value)),
      );
      describe(description, () => {
        for (const dimension of dimensionValuesArray) {
          dimension.applyInDescribe?.(dimension.value);
        }

        const applyDimensions: ApplyDimensionsCallback<Dimensions> = (
          context,
        ) => {
          for (const dimension of dimensionValuesArray) {
            dimension.apply(dimension.value, context);
          }
          return context;
        };

        callback(applyDimensions, outcome);
      });
    }, filter);
  }

  testOutcomes(
    callback: (
      applyDimensions: ApplyDimensionsCallback<Dimensions>,
      outcome: Outcomes,
    ) => void,
    opts: { order?: "dimensions" | "outcomes" } = {},
  ) {
    const options = { order: "outcomes", ...opts };

    this.printHeaders();
    if (options.order === "dimensions") {
      this.testOutcomesInternal(callback);
    } else {
      for (const targetOutcome of this.outcomes) {
        this.testOutcomesInternal(
          callback,
          (outcome) => outcome === targetOutcome,
        );
      }
    }
  }
}
