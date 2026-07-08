# Sandboxed Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure dynamic code evaluation in `condition` and `transform` executors by migrating from `new Function()` to Node's native `node:vm` module with context isolation and execution timeouts.

**Architecture:** We will create isolated script contexts via `vm.createContext()`, run user scripts via `vm.Script.runInContext()`, enforce a 1000ms timeout on execution, and wrap transform code in an IIFE.

**Tech Stack:** Node.js v20+ native `node:vm` module, TypeScript, Vitest.

## Global Constraints

- No external dependencies added for sandboxing.
- Transform node user code must support `return` statements (handled by wrapping in an IIFE).
- Execution must timeout after 1000ms if a loop is detected.

---

### Task 1: Refactor Condition Executor

**Files:**
- Modify: `packages/nodes/src/executors/condition.ts`

**Interfaces:**
- Consumes: None (uses standard Node.js `node:vm` module)
- Produces: `conditionExecutor` function

- [ ] **Step 1: Write the implementation**
  Replace the contents of `packages/nodes/src/executors/condition.ts` with the `node:vm` based evaluation:
  ```typescript
  import vm from "node:vm";

  export async function conditionExecutor(
    config: Record<string, any>,
    inputs: Record<string, any>,
  ): Promise<Record<string, any>> {
    const value = inputs.value;
    const expression = config.expression || "input === true";

    try {
      const context = vm.createContext({ input: value });
      const script = new vm.Script(`((${expression}))`);
      const result = Boolean(script.runInContext(context, { timeout: 1000 }));

      if (result) {
        return { true: value };
      } else {
        return { false: value };
      }
    } catch (err: any) {
      throw new Error(`Condition evaluation error: ${err.message}`);
    }
  }
  ```

- [ ] **Step 2: Run tests to verify the build**
  Run: `pnpm build` in the workspace to verify there are no compilation errors.
  Expected: Successful compile of `@skein/nodes`.

- [ ] **Step 3: Run Vitest to check existing condition tests**
  Run: `pnpm --filter @skein/engine test`
  Expected: All existing tests pass.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/nodes/src/executors/condition.ts
  git commit -m "feat: migrate condition executor to node:vm sandbox"
  ```

---

### Task 2: Refactor Transform Executor

**Files:**
- Modify: `packages/nodes/src/executors/transform.ts`

**Interfaces:**
- Consumes: None (uses standard Node.js `node:vm` module)
- Produces: `transformExecutor` function

- [ ] **Step 1: Write the implementation**
  Replace the contents of `packages/nodes/src/executors/transform.ts` to wrap code in an IIFE inside the VM:
  ```typescript
  import vm from "node:vm";

  export async function transformExecutor(
    config: Record<string, any>,
    inputs: Record<string, any>,
  ): Promise<Record<string, any>> {
    const input = inputs.input;
    const code = config.code || "return input;";

    try {
      const context = vm.createContext({ input });
      const script = new vm.Script(`((input) => {
        ${code}
      })(input)`);
      const output = script.runInContext(context, { timeout: 1000 });
      return { output };
    } catch (err: any) {
      throw new Error(`Transform code evaluation error: ${err.message}`);
    }
  }
  ```

- [ ] **Step 2: Run build to verify TypeScript compilation**
  Run: `pnpm build`
  Expected: Successful compile of all packages.

- [ ] **Step 3: Run tests to verify transform passes**
  Run: `pnpm --filter @skein/engine test`
  Expected: All 9 tests pass.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/nodes/src/executors/transform.ts
  git commit -m "feat: migrate transform executor to node:vm sandbox"
  ```

---

### Task 3: Refactor Export Codegen Executor Templates

**Files:**
- Modify: `packages/export-codegen/src/index.ts`

**Interfaces:**
- Consumes: None
- Produces: `generateStandaloneCode` function

- [ ] **Step 1: Write the implementation**
  Update the string templates for `condition` and `transform` in `packages/export-codegen/src/index.ts` to import and use `node:vm`. Additionally, update `generateStandaloneCode` to prepend `import vm from 'node:vm';` at the top of the generated code if a condition or transform node is used in the workflow.
  
  Locate `EXECUTORS_MAP.condition` and replace with:
  ```typescript
    condition: `
  async function conditionExecutor(config, inputs) {
    const value = inputs.value;
    const expression = config.expression || 'input === true';
    try {
      const context = vm.createContext({ input: value });
      const script = new vm.Script('((' + expression + '))');
      const result = Boolean(script.runInContext(context, { timeout: 1000 }));
      return result ? { true: value } : { false: value };
    } catch (err) {
      throw new Error('Condition evaluation error: ' + err.message);
    }
  }`,
  ```

  Locate `EXECUTORS_MAP.transform` and replace with:
  ```typescript
    transform: `
  async function transformExecutor(config, inputs) {
    const input = inputs.input;
    const code = config.code || 'return input;';
    try {
      const context = vm.createContext({ input });
      const script = new vm.Script('((input) => { ' + code + ' })(input)');
      const output = script.runInContext(context, { timeout: 1000 });
      return { output };
    } catch (err) {
      throw new Error('Transform code evaluation error: ' + err.message);
    }
  }`,
  ```

  Locate `generateStandaloneCode` function and modify it to prepend `import vm from "node:vm";` if `condition` or `transform` are active node types:
  ```typescript
  export function generateStandaloneCode(workflow: Workflow): string {
    // 1. Gather all node types present in the workflow
    const activeTypes = new Set<string>();
    workflow.nodes.forEach((node) => {
      if (node.type) activeTypes.add(node.type);
    });

    // 2. Generate the executor registration map string
    const executorImportsCode = Array.from(activeTypes)
      .map((type) => EXECUTORS_MAP[type] || "")
      .filter(Boolean)
      .join("\n");

    const registryMapping = Array.from(activeTypes)
      .map((type) => {
        const camelCaseName =
          type.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + "Executor";
        return `  '${type}': ${camelCaseName},`;
      })
      .join("\n");

    const requiresVm = activeTypes.has("condition") || activeTypes.has("transform");
    const vmImport = requiresVm ? 'import vm from "node:vm";\n' : '';

    return `// 🧶 Standalone workflow execution code generated by Skein
  // Workflow Name: ${workflow.name}
  // Generated At: ${new Date().toISOString()}

  ${vmImport}
  const workflow = ${JSON.stringify(workflow, null, 2)};
  ...
  ```

- [ ] **Step 2: Run build**
  Run: `pnpm build`
  Expected: Successful compile of `@skein/export-codegen`.

- [ ] **Step 3: Commit**
  ```bash
  git add packages/export-codegen/src/index.ts
  git commit -m "feat: update export-codegen template to use node:vm for sandboxing"
  ```

---

### Task 4: Add Verification & Security Tests

**Files:**
- Modify: `packages/engine/tests/execution.test.ts`

**Interfaces:**
- Consumes: None (modifies tests)
- Produces: None

- [ ] **Step 1: Write sandboxing & security unit tests**
  Open `packages/engine/tests/execution.test.ts` and add tests to verify the sandbox boundaries (e.g. inability to access global variables/processes, loop timeout handling):
  ```typescript
  describe("Executor Sandboxing & Security", () => {
    it("should fail execution if condition node contains an infinite loop", async () => {
      const workflow = {
        id: "flow-timeout-cond",
        name: "Timeout Condition Flow",
        nodes: [
          {
            id: "trigger",
            type: "manual-trigger",
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "timeout-if",
            type: "condition",
            position: { x: 0, y: 0 },
            config: { expression: "(() => { while(true) {} })()" },
          },
        ],
        edges: [
          {
            id: "e-timeout",
            source: "trigger",
            sourceHandle: "payload",
            target: "timeout-if",
            targetHandle: "value",
          },
        ],
      };

      const executor = new WorkflowExecutor(workflow);
      await expect(executor.execute({ score: 100 })).rejects.toThrow(
        /Script execution timed out/,
      );
    });

    it("should fail execution if transform node contains an infinite loop", async () => {
      const workflow = {
        id: "flow-timeout-trans",
        name: "Timeout Transform Flow",
        nodes: [
          {
            id: "trigger",
            type: "manual-trigger",
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "timeout-trans",
            type: "transform",
            position: { x: 0, y: 0 },
            config: { code: "while(true) {}" },
          },
        ],
        edges: [
          {
            id: "e-timeout",
            source: "trigger",
            sourceHandle: "payload",
            target: "timeout-trans",
            targetHandle: "input",
          },
        ],
      };

      const executor = new WorkflowExecutor(workflow);
      await expect(executor.execute({ score: 100 })).rejects.toThrow(
        /Script execution timed out/,
      );
    });

    it("should isolate global scope and reject access to system properties", async () => {
      const workflow = {
        id: "flow-sandbox-violation",
        name: "Sandbox Violation Flow",
        nodes: [
          {
            id: "trigger",
            type: "manual-trigger",
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "bad-trans",
            type: "transform",
            position: { x: 0, y: 0 },
            config: { code: "return process.env;" },
          },
        ],
        edges: [
          {
            id: "e-bad",
            source: "trigger",
            sourceHandle: "payload",
            target: "bad-trans",
            targetHandle: "input",
          },
        ],
      };

      const executor = new WorkflowExecutor(workflow);
      await expect(executor.execute({ message: "test" })).rejects.toThrow(
        /process is not defined/,
      );
    });
  });
  ```

- [ ] **Step 2: Run all tests in the workspace**
  Run: `pnpm test`
  Expected: All tests pass, including the new security/sandboxing tests.

- [ ] **Step 3: Commit**
  ```bash
  git add packages/engine/tests/execution.test.ts
  git commit -m "test: add VM sandboxing isolation and timeout unit tests"
  ```
