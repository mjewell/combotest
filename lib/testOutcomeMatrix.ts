import { describe, expect, it } from "vitest";
import type { UnionToIntersection } from "./types";

import type { Dimension } from "./dimensions";
import { globalContext } from "./globalContext";
import { OutcomeMatrix } from "./outcomeMatrix";

type ApplyDimensionsCallback<D extends Dimension<unknown, unknown>> = (
  context: UnionToIntersection<Parameters<D["apply"]>[1]>,
) => void;

export class TestOutcomeMatrix<
  Dimensions extends Dimension<unknown, unknown>[],
  Outcomes extends string,
> extends OutcomeMatrix<Dimensions, Outcomes> {
  columnWidths: number[];

  constructor(
    ...args: ConstructorParameters<typeof OutcomeMatrix<Dimensions, Outcomes>>
  ) {
    super(...args);
    this.columnWidths = this.dimensions.map((d) =>
      Math.max(
        d.header.length,
        ...d.values.map((v) => d.formatValue(v).length),
      ),
    );
  }

  defineOutcomes(
    callback: (
      outcomes: { [K in Outcomes]: () => void },
      dimensions: Dimensions,
    ) => void,
  ) {
    globalContext.clear();

    const outcomeLookup = Object.fromEntries(
      this.outcomes.map((outcome) => [
        outcome,
        () => this.markOutcome(globalContext, outcome),
      ]),
    ) as { [K in Outcomes]: () => void };

    callback(outcomeLookup, this.dimensions);
  }

  private stringifyRow(row: string[]) {
    return [...row.map((c, i) => c.padEnd(this.columnWidths[i], " "))].join(
      " | ",
    );
  }

  private printHeaders() {
    describe(this.stringifyRow(this.dimensions.map((d) => d.header)), () => {
      it("Outcome", () => expect(true).toBe(true));
    });
  }

  private testOutcomesInternal(
    callback: (
      applyDimensions: ApplyDimensionsCallback<Dimensions[number]>,
      outcome: Outcomes,
    ) => void,
    filter: (outcome: Outcomes) => boolean = () => true,
  ) {
    this.forEach((dimensionValues, outcome) => {
      const dimensionValuesArray = Object.values(dimensionValues);
      describe(this.stringifyRow(
        dimensionValuesArray.map((d) => d.formatValue(d.value)),
      ), () => {
        for (const dimension of dimensionValuesArray) {
          dimension.applyInDescribe?.(dimension.value);
        }

        const applyDimensions: ApplyDimensionsCallback<Dimensions[number]> = (
          context,
        ) => {
          for (const dimension of dimensionValuesArray) {
            dimension.apply(dimension.value, context);
          }
        };

        callback(applyDimensions, outcome);
      });
    }, filter);
  }

  testOutcomes(
    callback: (
      applyDimensions: ApplyDimensionsCallback<Dimensions[number]>,
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
