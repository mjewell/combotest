# Combotest

A testing utility for exhaustively testing combinations of variables. Makes it easy to define expected outcomes, and generates a nice, easy-to-read table of results.

Combotest is primarily designed for use cases where you have many combinations of variables but only a small set of distinct outcomes. A common use case for this would be to determine which users have access to a given feature. It might be conditional based on roles, feature flags, product tiers, or any other internal logic. As a counterexample, you wouldn't necessarily want to use it for something like testing an addition function where every combination of inputs may produce a distinct output.

For example, let's say you want to test this simple function:

```ts
type User = {
  role: string;
};

function isAllowed({ user, feature }: { user: User; feature: boolean }) {
  return user.role === "admin" || feature;
}
```

Here's how you would use combotest to ensure it works correctly for all combinations of values:

```ts
// define your inputs as `dimensions`
const role = createDimension({
  header: "Role",
  values: ["admin", "user", "readonly"] as const,
  apply: (value, context: { user: User }) => {
    context.user.role = value;
  },
});

const feature = createDimension({
  header: "Feature Enabled",
  values: [false, true] as const,
  apply: (value, context: { feature: boolean }) => {
    context.feature = value;
  },
});

// create the matrix of possible outcomes
const outcomeMatrix = new TestOutcomeMatrix({
  dimensions: { role, feature },
  outcomes: ["allowed", "notAllowed"] as const,
  defaultOutcome: "notAllowed",
});

// define the non-default outcomes you expect
outcomeMatrix.defineOutcomes(({ role, feature }) => {
  if (role === "admin" || feature) {
    return "allowed";
  }
});

// write your test cases tailored to your custom outcomes
outcomeMatrix.testOutcomes((applyDimensions, outcome) => {
  // this will call the `apply` function for every combination of dimension values
  // provide some defaults to satisfy typescript, these attributes will be overwritten
  const context = applyDimensions({ user: { role: "admin" }, feature: false });

  if (outcome === "allowed") {
    it("is allowed", () => {
      expect(isAllowed(context)).toBe(true);
    });
  } else {
    it("is not allowed", () => {
      expect(isAllowed(context)).toBe(false);
    });
  }
});
```

This will generate the following tests:

```sh
 ✓ src/feature-access.test.ts (7 tests) 2ms
   ✓ Role     | Feature Enabled > Outcome 1ms
   ✓ admin    | false           > is allowed 0ms
   ✓ admin    | true            > is allowed 0ms
   ✓ user     | true            > is allowed 0ms
   ✓ readonly | true            > is allowed 0ms
   ✓ user     | false           > is not allowed 0ms
   ✓ readonly | false           > is not allowed 0ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

If, for example, the logic changed to `user.role === "admin" && feature`, you would see these failures:

```sh
 ❯ src/feature-access.test.ts (7 tests | 3 failed) 6ms
   ✓ Role     | Feature Enabled > Outcome 1ms
   × admin    | false           > is allowed 4ms
     → expected false to be true // Object.is equality
   ✓ admin    | true            > is allowed 0ms
   × user     | true            > is allowed 1ms
     → expected false to be true // Object.is equality
   × readonly | true            > is allowed 0ms
     → expected false to be true // Object.is equality
   ✓ user     | false           > is not allowed 0ms
   ✓ readonly | false           > is not allowed 0ms
```

To fix it, you would update your test to:

```ts
outcomeMatrix.defineOutcomes(({ role, feature }) => {
  if (role === 'admin' && feature) {
    return 'allowed';
  }
});
```

And you would see this output:

```sh
 ✓ src/feature-access.test.ts (7 tests) 2ms
   ✓ Role     | Feature Enabled > Outcome 1ms
   ✓ admin    | true            > is allowed 0ms
   ✓ admin    | false           > is not allowed 0ms
   ✓ user     | false           > is not allowed 0ms
   ✓ user     | true            > is not allowed 0ms
   ✓ readonly | false           > is not allowed 0ms
   ✓ readonly | true            > is not allowed 0ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```
