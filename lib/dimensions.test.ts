import { createDimension } from "./dimensions";

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
