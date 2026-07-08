import { describe, it, expect } from "vitest";
import { generateStandaloneCode } from "../src";
import * as fs from "fs";
import * as path from "path";

describe("Workflow Codegen Compiler", () => {
  it("should compile a linear DAG into valid, zero-dependency executable JS/TS code", async () => {
    const workflow = {
      id: "test-codegen-flow",
      name: "Test Codegen Flow",
      nodes: [
        {
          id: "node-trigger",
          type: "manual-trigger",
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: "node-transform",
          type: "transform",
          position: { x: 200, y: 0 },
          config: {
            code: "return input.value * 2;",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger",
          sourceHandle: "payload",
          target: "node-transform",
          targetHandle: "input",
        },
      ],
    };

    const code = generateStandaloneCode(workflow);

    // Ensure basic structures are present
    expect(code).toContain("manualTriggerExecutor");
    expect(code).toContain("transformExecutor");
    expect(code).toContain("StandaloneWorkflowExecutor");
    expect(code).toContain("export async function run");

    // Write to a temporary file to verify executing it works
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // We add a timestamp to path to avoid import caching in Node.js
    const tempFile = path.join(tempDir, `generated-run-${Date.now()}.js`);

    // Strip TypeScript schema import statement to let standard Node dynamic imports load the ESM file
    const esmJsCode = code.replace(/import\s+.*?;/g, "");

    fs.writeFileSync(tempFile, esmJsCode, "utf8");

    // Dynamic import to execute
    const module = await import(tempFile);
    const results = await module.run({ value: 15 });

    expect(results["node-transform"].status).toBe("success");
    expect(results["node-transform"].output?.output).toBe(30);

    // Cleanup
    try {
      fs.unlinkSync(tempFile);
      fs.rmdirSync(tempDir);
    } catch (e) {}
  });
});
