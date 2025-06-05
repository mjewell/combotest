import type { SuiteAPI, SuiteCollector, TestAPI } from "vitest";
import { TestOutcomeMatrix } from "./TestOutcomeMatrix";
import { createDimension } from "./dimensions";
import { describe as describeImport } from "./mockableVitest";

vi.mock(import("./mockableVitest"), async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    describe: vi.fn() as unknown as SuiteAPI,
    it: vi.fn() as unknown as TestAPI,
  };
});

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
        dimensions: {},
        outcomes: ["outcome1", "outcome2"],
        defaultOutcome: "outcome1",
      }),
  ).toThrowError("No dimensions provided");
});

it("errors when defaultOutcome is not one of the outcomes", () => {
  expect(
    () =>
      new TestOutcomeMatrix({
        dimensions: { string: exampleDimensions.string },
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

  // no `apply`, so no way to infer context
  const d3 = createDimension({
    header: "Number",
    values: [1, 2, 3],
  });

  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: { d1, d2, d3 },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.testOutcomes((applyDimensions) => {
    expectTypeOf(applyDimensions)
      .parameter(0)
      .branded.toEqualTypeOf<Context1 & Context2>();
  });
});

it("generates the test cases with every combination of parameters", () => {
  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: {
      string: exampleDimensions.string,
      number: exampleDimensions.number,
    },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.defineOutcomes(({ string, number }) => {
    if (string === "a" && number === 1) {
      return "outcome2";
    }
    if (string === "b" && number === 2) {
      return "outcome2";
    }
  });

  const nameFn = vi.fn();

  vi.mocked(describeImport).mockImplementation((name, fn) => {
    nameFn(name);
    return (fn as unknown as () => SuiteCollector)();
  });

  const contextFn = vi.fn();
  const outcomeFn = vi.fn();

  outcomeMatrix.testOutcomes((applyDimensions, outcome) => {
    const context = applyDimensions({ stringValue: "", numberValue: 0 });
    contextFn(context);
    outcomeFn(outcome);
  });

  const expectations = [
    {
      name: "a      | 2     ",
      context: { stringValue: "a", numberValue: 2 },
      outcome: "outcome1",
    },
    {
      name: "a      | 3     ",
      context: { stringValue: "a", numberValue: 3 },
      outcome: "outcome1",
    },
    {
      name: "b      | 1     ",
      context: { stringValue: "b", numberValue: 1 },
      outcome: "outcome1",
    },
    {
      name: "b      | 3     ",
      context: { stringValue: "b", numberValue: 3 },
      outcome: "outcome1",
    },
    {
      name: "c      | 1     ",
      context: { stringValue: "c", numberValue: 1 },
      outcome: "outcome1",
    },
    {
      name: "c      | 2     ",
      context: { stringValue: "c", numberValue: 2 },
      outcome: "outcome1",
    },
    {
      name: "c      | 3     ",
      context: { stringValue: "c", numberValue: 3 },
      outcome: "outcome1",
    },
    {
      name: "a      | 1     ",
      context: { stringValue: "a", numberValue: 1 },
      outcome: "outcome2",
    },
    {
      name: "b      | 2     ",
      context: { stringValue: "b", numberValue: 2 },
      outcome: "outcome2",
    },
  ];

  expect(nameFn).toHaveBeenCalledTimes(expectations.length + 1);
  expect(contextFn).toHaveBeenCalledTimes(expectations.length);
  expect(outcomeFn).toHaveBeenCalledTimes(expectations.length);

  expect(nameFn).toHaveBeenNthCalledWith(1, "String | Number");
  for (const [index, expectation] of expectations.entries()) {
    expect(nameFn).toHaveBeenNthCalledWith(index + 2, expectation.name);
    expect(contextFn).toHaveBeenNthCalledWith(index + 1, expectation.context);
    expect(outcomeFn).toHaveBeenNthCalledWith(index + 1, expectation.outcome);
  }
});

it("generates good spacing with formatValue and values longer than the header", () => {
  const longDimension = createDimension({
    header: "Shorter",
    values: ["aaa", "b"],
    formatValue(value) {
      return value.repeat(5);
    },
    apply(value, context: { stringValue: string }) {
      context.stringValue = value;
    },
  });

  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: { long: longDimension, number: exampleDimensions.number },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.defineOutcomes(({ long, number }) => {
    if (long === "aaa" && number === 1) {
      return "outcome2";
    }
    if (long === "b" && number === 2) {
      return "outcome2";
    }
  });

  const nameFn = vi.fn();

  vi.mocked(describeImport).mockImplementation((name, fn) => {
    nameFn(name);
    return (fn as unknown as () => SuiteCollector)();
  });

  const contextFn = vi.fn();
  const outcomeFn = vi.fn();

  outcomeMatrix.testOutcomes((applyDimensions, outcome) => {
    const context = applyDimensions({ stringValue: "", numberValue: 0 });
    contextFn(context);
    outcomeFn(outcome);
  });

  const expectations = [
    {
      name: "aaaaaaaaaaaaaaa | 2     ",
      context: { stringValue: "aaa", numberValue: 2 },
      outcome: "outcome1",
    },
    {
      name: "aaaaaaaaaaaaaaa | 3     ",
      context: { stringValue: "aaa", numberValue: 3 },
      outcome: "outcome1",
    },
    {
      name: "bbbbb           | 1     ",
      context: { stringValue: "b", numberValue: 1 },
      outcome: "outcome1",
    },
    {
      name: "bbbbb           | 3     ",
      context: { stringValue: "b", numberValue: 3 },
      outcome: "outcome1",
    },
    {
      name: "aaaaaaaaaaaaaaa | 1     ",
      context: { stringValue: "aaa", numberValue: 1 },
      outcome: "outcome2",
    },
    {
      name: "bbbbb           | 2     ",
      context: { stringValue: "b", numberValue: 2 },
      outcome: "outcome2",
    },
  ];

  expect(nameFn).toHaveBeenCalledTimes(expectations.length + 1);
  expect(contextFn).toHaveBeenCalledTimes(expectations.length);
  expect(outcomeFn).toHaveBeenCalledTimes(expectations.length);

  expect(nameFn).toHaveBeenNthCalledWith(1, "Shorter         | Number");
  for (const [index, expectation] of expectations.entries()) {
    expect(nameFn).toHaveBeenNthCalledWith(index + 2, expectation.name);
    expect(contextFn).toHaveBeenNthCalledWith(index + 1, expectation.context);
    expect(outcomeFn).toHaveBeenNthCalledWith(index + 1, expectation.outcome);
  }
});
