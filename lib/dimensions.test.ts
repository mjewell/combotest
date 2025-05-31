import { createBooleanDimension, createDimension } from "./dimensions";
import { TestOutcomeMatrix } from "./testOutcomeMatrix";
import { it, expect } from "vitest";

type User = {
  role: string;
};

const roles = createDimension({
  header: "Role",
  values: ["admin", "user", "readonly"] as const,
  apply: (value, context: { user: User }) => {
    context.user.role = value;
  },
}).group({ admins: ["admin"] });

const feature = createBooleanDimension({
  header: "Feature Enabled",
  apply: (value, context: { feature: boolean }) => {
    context.feature = value;
  },
});

const outcomeMatrix = new TestOutcomeMatrix({
  dimensions: [roles, feature],
  outcomes: ["allowed", "notAllowed"] as const,
  defaultOutcome: "notAllowed",
});

outcomeMatrix.defineOutcomes((outcomes) => {
  roles.when("admins", outcomes.allowed);
  feature.when("true", outcomes.allowed);
});

outcomeMatrix.testOutcomes(
  (applyDimensions, outcome) => {
    it(outcome === "allowed" ? "is allowed" : "is not allowed", () => {
      const context = { user: { role: "admin" }, feature: false };

      applyDimensions(context);

      if (outcome === "allowed") {
        // Whatever you want to test for the allowed case
        expect(true).toBe(true);
      } else {
        // Whatever you want to test for the not allowed case
        expect(true).toBe(true);
      }
    });
  },
  { order: "outcomes" }
);
