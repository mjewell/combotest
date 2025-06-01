import { TestOutcomeMatrix } from "./TestOutcomeMatrix";
import { createDimension } from "./dimensions";

const exampleDimensions = {
  string: createDimension({
    header: "String",
    values: ["a", "b", "c"] as const,
    apply(value, context: { stringValue: string }) {
      context.stringValue = value;
    },
  }),
  number: createDimension({
    header: "Number",
    values: [1, 2, 3] as const,
    apply(value, context: { numberValue: number }) {
      context.numberValue = value;
    },
  }),
};

it("errors when there are no dimensions", () => {
  expect(
    () =>
      new TestOutcomeMatrix({
        dimensions: [],
        outcomes: ["outcome1", "outcome2"],
        defaultOutcome: "outcome1",
      }),
  ).toThrowError("No dimensions provided");
});

it("errors when defaultOutcome is not one of the outcomes", () => {
  expect(
    () =>
      new TestOutcomeMatrix({
        dimensions: [exampleDimensions.string],
        outcomes: ["outcome1", "outcome2"],
        // @ts-expect-error
        defaultOutcome: "outcome3",
      }),
  ).toThrowError(
    'Default outcome "outcome3" is not defined in the outcomes list',
  );
});

it("enforces that applyDimensions receives the correct context type", () => {
  type Context1 = { exampleValue: string };
  const d1 = createDimension({
    header: "String",
    values: ["a", "b", "c"],
    apply(value, context: Context1) {
      context.exampleValue = value;
    },
  });

  type Context2 = { anotherValue?: number };
  const d2 = createDimension({
    header: "Number",
    values: [1, 2, 3],
    apply(value, context: Context2) {
      context.anotherValue = value;
    },
  });

  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: [d1, d2],
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.testOutcomes((applyDimensions) => {
    expectTypeOf(applyDimensions)
      .parameter(0)
      .branded.toEqualTypeOf<Context1 & Context2>();
  });
});

it("errors when you defineOutcomes with a dimension that isn't specified", () => {
  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: [exampleDimensions.string],
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  expect(() =>
    outcomeMatrix.defineOutcomes((outcomes) => {
      exampleDimensions.number.when("all", outcomes.outcome1);
    }),
  ).toThrowError(
    `Dimension not found. Are you defining outcomes with a dimension that's not specified in "dimensions"?`,
  );
});
