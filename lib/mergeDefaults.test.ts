import { mergeDefaults } from "./mergeDefaults";

it("uses defaults for unspecified props", () => {
  type Props = {
    a: number;
    b?: number;
    c?: number;
  };
  const props: Props = { a: 1 };
  const merged = mergeDefaults({ b: 2 }, props);
  expect(merged).toEqual({ a: 1, b: 2 });
  expectTypeOf(merged).branded.toEqualTypeOf<{
    a: number;
    b: number;
    c?: number;
  }>();
});

it("uses defaults for undefined props", () => {
  type Props = {
    a: number;
    b?: number;
    c?: number;
  };
  const props: Props = { a: 1, b: undefined };
  const merged = mergeDefaults({ b: 2 }, props);
  expect(merged).toEqual({ a: 1, b: 2 });
  expectTypeOf(merged).branded.toEqualTypeOf<{
    a: number;
    b: number;
    c?: number;
  }>();
});

it("does not use defaults for null props", () => {
  type Props = {
    a: number;
    b: number | null;
    c?: number;
  };
  const props: Props = { a: 1, b: null };
  const merged = mergeDefaults({ b: 2 }, props);
  expect(merged).toEqual({ a: 1, b: null });
  expectTypeOf(merged).branded.toEqualTypeOf<{
    a: number;
    b: number | null;
    c?: number;
  }>();
});

it("correctly infers the defaults as const", () => {
  const opts: {
    val?: "a" | "b";
    func?: () => boolean;
  } = {};

  const options = mergeDefaults({ val: "a" }, opts);

  expectTypeOf(options).branded.toEqualTypeOf<{
    val: "a" | "b";
    func?: () => boolean;
  }>();
});

describe("compared to alternatives", () => {
  type Options = {
    isRequired: boolean;
    defaultsToTrue?: boolean;
    defaultsToFalse?: boolean;
  };

  const defaults: Partial<Options> = {
    defaultsToTrue: true,
    defaultsToFalse: false,
  };

  function funcWithMergeDefaults(options: Options) {
    return mergeDefaults(options, defaults);
  }

  it("is better than a default param because it does not require all defaults to be specified", () => {
    function funcWithDefaultParam(
      options: Options = { isRequired: true, ...defaults },
    ) {
      return options;
    }

    const opts = { isRequired: true };
    const expected = { isRequired: true, ...defaults };

    expect(funcWithMergeDefaults(opts)).toEqual(expected);
    expect(funcWithDefaultParam(opts)).not.toEqual(expected);
  });

  it("is better than default attributes because it does not force destructuring and recreating the options object", () => {
    function funcWithDefaultParam({
      isRequired,
      defaultsToTrue = true,
      defaultsToFalse = false,
    }: Options) {
      // recreating the object isnt always necessary, but for more complex utilities you may want
      // other internal functions to receive the full options object
      return {
        isRequired,
        defaultsToTrue,
        defaultsToFalse,
      };
    }

    const opts = { isRequired: true };
    const expected = { isRequired: true, ...defaults };

    expect(funcWithMergeDefaults(opts)).toEqual(expected);
    expect(funcWithDefaultParam(opts)).toEqual(expected);
  });

  it("behaves the same as default attributes otherwise", () => {
    type Options = {
      a?: number;
      b: number;
    };

    const defaultAttributesExample = ({ a = 1, b }: Options = { b: 2 }) => ({
      a,
      b,
    });
    const mergeDefaultsExample = (options: Options = { b: 2 }) =>
      mergeDefaults({ a: 1 }, options);

    const cases = [
      [undefined, { a: 1, b: 2 }],
      [{ b: 3 }, { a: 1, b: 3 }],
      [
        { a: 4, b: 5 },
        { a: 4, b: 5 },
      ],
      [
        { a: undefined, b: 6 },
        { a: 1, b: 6 },
      ],
    ];

    for (const [input, expected] of cases) {
      const defaultAttributesResult = defaultAttributesExample(input);
      const mergeDefaultsResult = mergeDefaultsExample(input);
      expect(defaultAttributesResult).toEqual(mergeDefaultsResult);
      expect(defaultAttributesResult).toEqual(expected);
    }
  });

  it("is better than merging because it adds type safety to the defaults", () => {
    const noop = (_: unknown) => {};
    const opts = { isRequired: true, defaultsToTrue: undefined };

    noop({ ...defaults, notARealProperty: true, ...opts });

    // @ts-expect-error -- we are asserting that this catches an issue
    noop(mergeDefaults({ ...defaults, notARealProperty: true }, opts));
  });

  it("is better than merging because it allows you to pass undefined to get the defaults", () => {
    function funcWithMerge(options: Options) {
      return { ...defaults, ...options };
    }

    const opts = { isRequired: true, defaultsToTrue: undefined };
    const expected = { isRequired: true, ...defaults };

    expect(funcWithMergeDefaults(opts)).toEqual(expected);
    expect(funcWithMerge(opts)).not.toEqual(expected);
  });
});
