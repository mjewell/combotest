import { expect, it } from "vitest";
import { createDimension } from "./dimensions";
import { TestOutcomeMatrix } from "./TestOutcomeMatrix";

type User = {
  role: string;
};

function isAllowed({ user, feature }: { user: User; feature: boolean }) {
  return user.role === "admin" || feature;
}

// define your inputs as `dimensions`
const role = createDimension({
  header: "Role",
  values: ["admin", "user", "readonly"],
  apply: (value, context: { user: User }) => {
    context.user.role = value;
  },
});

const feature = createDimension({
  header: "Feature Enabled",
  values: [false, true],
  apply: (value, context: { feature: boolean }) => {
    context.feature = value;
  },
});

// create the matrix of possible outcomes
const outcomeMatrix = new TestOutcomeMatrix({
  dimensions: { role, feature },
  outcomes: ["allowed", "notAllowed"],
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

  // you can do whatever you want here, but this is a nice pattern for defining your tests
  const { message, assertion } = {
    allowed: {
      message: "is allowed",
      assertion: () => expect(isAllowed(context)).toBe(true),
    },
    notAllowed: {
      message: "is not allowed",
      assertion: () => expect(isAllowed(context)).toBe(false),
    },
  }[outcome];

  it(message, () => {
    // you can put shared test setup here

    // then call your outcome-specific assertion
    assertion();
  });
});
