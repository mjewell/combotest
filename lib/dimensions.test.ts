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

it("errors when you define a dimension with no values", () => {
  expect(() =>
    createDimension({
      header: "Empty",
      values: [],
      apply(value, context: { emptyValue: string }) {
        context.emptyValue = value;
      },
    }),
  ).toThrowError("Dimensions must have at least one value defined");
});

it("errors when you try to create a group with a reserved name", () => {
  expect(() => exampleDimensions.string.group({ all: ["a"] })).toThrowError(
    "Cannot use [all, other] as group names, they are reserved",
  );

  expect(() => exampleDimensions.string.group({ other: ["a"] })).toThrowError(
    "Cannot use [all, other] as group names, they are reserved",
  );
});

it("errors when you try to create groups with overlapping values", () => {
  expect(() =>
    exampleDimensions.string.group({ group1: ["a"], group2: ["a"] }),
  ).toThrowError(
    'Each value must appear in exactly one group but found ["a"] in multiple groups',
  );
});

it("errors when you try to create empty groups", () => {
  expect(() => exampleDimensions.string.group({ group1: [] })).toThrowError(
    'Cannot create an empty group. Should you use the "other" group?',
  );
});

it("errors when you try to create groups with invalid values", () => {
  expect(() =>
    exampleDimensions.string.group({
      // @ts-expect-error
      group1: ["d"],
    }),
  ).toThrowError(
    'Cannot create a group with value ["d"] because it is not defined in the dimension values ["a", "b", "c"]',
  );
});
