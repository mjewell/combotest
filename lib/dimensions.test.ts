import { createBooleanDimension, createDimension } from "./dimensions";
import { TestOutcomeMatrix } from "./testOutcomeMatrix";
import { it, expect } from "vitest";

type User = {
  role: string;
};

function isAllowed({ user, feature }: { user: User; feature: boolean }) {
  return user.role === "admin" && feature;
}

const roles = createDimension({
  header: "Role",
  values: ["admin", "user", "readonly"] as const,
  apply: (value, context: { user: User }) => {
    context.user.role = value;
  },
});

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
  roles.whenValue("admin", outcomes.allowed);
  feature.when("true", outcomes.allowed);
});

outcomeMatrix.testOutcomes((applyDimensions, outcome) => {
  const context = { user: { role: "admin" }, feature: false };

  applyDimensions(context);

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
