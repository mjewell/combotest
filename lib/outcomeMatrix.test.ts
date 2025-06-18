import { OutcomeMatrix } from "./OutcomeMatrix";
import type { Dimension } from "./dimensions";

// this seems like a really weird test but it helps ensure we don't remove some typescript code
// that looks like it shouldn't be doing anything - specifically `{ [K in keyof D & string]: ... }`
it("doesn't type the dimensionValues as any in a subclass", () => {
  class TestClass<
    Dimensions extends Record<string, Dimension>,
    Outcomes extends string,
  > extends OutcomeMatrix<Dimensions, Outcomes> {
    whatever() {
      // biome-ignore lint/complexity/noForEach: this is a custom forEach method
      this.forEach((dv) => {
        const value = Object.values(dv)[0];
        expectTypeOf(value.header).toEqualTypeOf<string>();
      }, {});
    }
  }
  expect(TestClass).toBeDefined();
});
