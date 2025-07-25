import type { SuiteAPI, SuiteCollector, TestAPI } from "vitest";
import { createDimension } from "./dimensions";
import { describe as describeImport } from "./mockableVitest";
import { TestOutcomeMatrix } from "./TestOutcomeMatrix";

vi.mock(import("./mockableVitest"), async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    describe: vi.fn((_, f) => f()) as unknown as SuiteAPI,
    it: vi.fn((_, f) => f()) as unknown as TestAPI,
  };
});

const exampleDimensions = {
  string: createDimension({
    header: "String",
    values: ["a", "b", "c"],
    apply(value, context: { stringValue: string }) {
      context.stringValue = value;
    },
  }),
  number: createDimension({
    header: "Number",
    values: [1, 2, 3],
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

it("errors when you define an invalid outcome", () => {
  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: { string: exampleDimensions.string },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  // @ts-expect-error
  outcomeMatrix.defineOutcomes(() => "outcome3");

  expect(() => outcomeMatrix.testOutcomes(() => {})).toThrowError(
    'Outcome "outcome3" is not defined in the outcomes list: outcome1, outcome2',
  );
});

it("correctly infers the type of a dimension as a const", () => {
  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: { string: exampleDimensions.string },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.defineOutcomes(({ string }) => {
    expectTypeOf(string).toEqualTypeOf<"a" | "b" | "c">();
    return "outcome1";
  });
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
    applyDimensions({ exampleValue: "", anotherValue: 0 });
    expectTypeOf(applyDimensions)
      .parameter(0)
      .branded.toEqualTypeOf<Context1 & Context2>();
  });
});

it("infers a context of never for a single dimension without context", () => {
  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: {
      d: createDimension({
        header: "Dimension",
        values: [false, true],
      }),
    },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.testOutcomes((applyDimensions) => {
    expectTypeOf(applyDimensions).parameter(0).branded.toEqualTypeOf<never>();
  });
});

it("infers a context of never for a single dimension without context defined outside the outcome matrix", () => {
  const d = createDimension({
    header: "Dimension",
    values: [false, true],
  });

  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: { d },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  outcomeMatrix.testOutcomes((applyDimensions) => {
    expectTypeOf(applyDimensions).parameter(0).branded.toEqualTypeOf<never>();
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

it("can limit what test cases are generated using `only`", () => {
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

  outcomeMatrix.testOutcomes(
    (applyDimensions, outcome) => {
      const context = applyDimensions({ stringValue: "", numberValue: 0 });
      contextFn(context);
      outcomeFn(outcome);
    },
    {
      only: (values, outcome) =>
        values.string === "a" || outcome === "outcome2",
    },
  );

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

it("can generate tests ordered by dimensions instead of outcomes", () => {
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

  outcomeMatrix.testOutcomes(
    (applyDimensions, outcome) => {
      const context = applyDimensions({ stringValue: "", numberValue: 0 });
      contextFn(context);
      outcomeFn(outcome);
    },
    { order: "dimensions" },
  );

  const expectations = [
    {
      name: "a      | 1     ",
      context: { stringValue: "a", numberValue: 1 },
      outcome: "outcome2",
    },
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
      name: "b      | 2     ",
      context: { stringValue: "b", numberValue: 2 },
      outcome: "outcome2",
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

it("calls applyInDescribe in the describe block", () => {
  const inDescribeFn = vi.fn();

  const outcomeMatrix = new TestOutcomeMatrix({
    dimensions: {
      inDescribe: createDimension({
        header: "Header",
        values: ["a", "b", "c"],
        applyInDescribe(value) {
          inDescribeFn(value);
        },
      }),
    },
    outcomes: ["outcome1", "outcome2"],
    defaultOutcome: "outcome1",
  });

  const nameFn = vi.fn();

  vi.mocked(describeImport).mockImplementation((name, fn) => {
    nameFn(name);
    return (fn as unknown as () => SuiteCollector)();
  });

  // intentionally not calling applyDimensions here to applyInDescribe is called outside of that
  outcomeMatrix.testOutcomes(() => {});

  const expectations = ["a", "b", "c"];

  expect(nameFn).toHaveBeenCalledTimes(expectations.length + 1);
  expect(inDescribeFn).toHaveBeenCalledTimes(expectations.length);

  expect(nameFn).toHaveBeenNthCalledWith(1, "Header");
  for (const [index, expectation] of expectations.entries()) {
    expect(nameFn).toHaveBeenNthCalledWith(
      index + 2,
      expectation.padEnd(6, " "),
    );
    expect(inDescribeFn).toHaveBeenNthCalledWith(index + 1, expectation);
  }
});
