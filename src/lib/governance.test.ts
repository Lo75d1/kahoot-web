import { describe, expect, it } from "vitest";
import { ROLE_LABELS, WORKFLOW_LABELS } from "./governance";

describe("UDA governance vocabulary", () => {
  it("covers all eight institutional roles", () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(8);
    expect(ROLE_LABELS.assessment_officer).toContain("khảo thí");
  });

  it("represents the complete question-set lifecycle", () => {
    expect(Object.keys(WORKFLOW_LABELS)).toEqual([
      "draft",
      "in_review",
      "changes_requested",
      "approved",
      "sealed",
      "retired",
    ]);
  });
});
