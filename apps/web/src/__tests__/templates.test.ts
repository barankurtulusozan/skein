import { describe, it, expect } from "vitest";
import { WORKFLOW_TEMPLATES } from "../constants/templates";

describe("WORKFLOW_TEMPLATES", () => {
  it("contains the AI Support Ticket Router showcase template", () => {
    const showcase = WORKFLOW_TEMPLATES.find(
      (t) => t.id === "template-ai-support-router"
    );
    expect(showcase).toBeDefined();
    expect(showcase?.name).toContain("AI Support Ticket Router");
    expect(showcase?.nodes.length).toBe(5);
    expect(showcase?.edges.length).toBe(4);
  });
});
