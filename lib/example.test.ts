import { expect, it } from "vitest";
import { TestOutcomeMatrix } from "./TestOutcomeMatrix";
import { createDimension } from "./dimensions";

type User = {
  role: string;
};

function isAllowed({ user, feature }: { user: User; feature: boolean }) {
  return user.role === "admin" || feature;
}

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
