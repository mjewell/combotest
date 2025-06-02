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

it("can split the dimension into groups", () => {
  const stringDimension = exampleDimensions.string.group({
    group1: ["a", "b"],
  });

  const group1Callback = vi.fn();
  stringDimension.when("group1", (val) => group1Callback(val));
  expect(group1Callback).toHaveBeenCalledTimes(2);
  expect(group1Callback).toHaveBeenNthCalledWith(1, "a");
  expect(group1Callback).toHaveBeenNthCalledWith(2, "b");

  const otherCallback = vi.fn();
  stringDimension.when("other", (val) => otherCallback(val));
  expect(otherCallback).toHaveBeenCalledTimes(1);
  expect(otherCallback).toHaveBeenNthCalledWith(1, "c");

  const allCallback = vi.fn();
  stringDimension.when("all", (val) => allCallback(val));
  expect(allCallback).toHaveBeenCalledTimes(3);
  expect(allCallback).toHaveBeenNthCalledWith(1, "a");
  expect(allCallback).toHaveBeenNthCalledWith(2, "b");
  expect(allCallback).toHaveBeenNthCalledWith(3, "c");
});

it('errors when you call "when" with an invalid group', () => {
  const stringDimension = exampleDimensions.string.group({
    group1: ["a", "b"],
  });

  expect(() =>
    stringDimension.when(
      // @ts-expect-error
      "blah",
      () => {},
    ),
  ).toThrowError(
    'Group "blah" does not exist. Available groups: "group1", "other", "all"',
  );
});

it("can use whenValue and whenNotValue instead of groups", () => {
  const aCallback = vi.fn();
  exampleDimensions.string.whenValue("a", (val) => aCallback(val));
  expect(aCallback).toHaveBeenCalledTimes(1);
  expect(aCallback).toHaveBeenCalledWith("a");

  const notACallback = vi.fn();
  exampleDimensions.string.whenNotValue("a", (val) => notACallback(val));
  expect(notACallback).toHaveBeenCalledTimes(2);
  expect(notACallback).toHaveBeenNthCalledWith(1, "b");
  expect(notACallback).toHaveBeenNthCalledWith(2, "c");
});

it('errors when you call "whenValue" or "whenNotValue" with an invalid value', () => {
  expect(() =>
    exampleDimensions.string.whenValue(
      // @ts-expect-error
      "blah",
      () => {},
    ),
  ).toThrowError(
    'Value "blah" is not defined in the dimension values ["a", "b", "c"]',
  );

  expect(() =>
    exampleDimensions.string.whenNotValue(
      // @ts-expect-error
      "blah",
      () => {},
    ),
  ).toThrowError(
    'Value "blah" is not defined in the dimension values ["a", "b", "c"]',
  );
});
