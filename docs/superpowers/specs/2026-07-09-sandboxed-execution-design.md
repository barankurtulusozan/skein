# 2026-07-09 Sandboxed Execution Design

This design document outlines the transition of dynamic code execution inside Skein executors from insecure `new Function()` evaluations to sandboxed executions using Node.js's native `node:vm` module.

## Context

Skein currently allows users to evaluate dynamic JavaScript expressions in two key executors:
1. `conditionExecutor` inside [condition.ts](file:///Users/barankurtulusozan/skein/packages/nodes/src/executors/condition.ts) (e.g., `input === true`).
2. `transformExecutor` inside [transform.ts](file:///Users/barankurtulusozan/skein/packages/nodes/src/executors/transform.ts) (e.g., custom data transformations).

Both implementations use `new Function()` directly, which runs code within the parent Node.js process and thread context. This exposes the host server to Remote Code Execution (RCE) vulnerabilities, scope pollution, and denial-of-service via infinite loops.

## Design

We will replace the insecure `new Function` calls with `node:vm` scripts, which execute code within context-isolated global scopes.

### 1. Isolated Contexts
Each code execution gets a fresh, empty context created via `vm.createContext()`. Only explicitly passed variables (such as the node's `input`) are injected.

### 2. Timeouts
To mitigate denial-of-service risks (e.g., infinite loops like `while(true) {}`), script executions are passed a `{ timeout: 1000 }` option. This causes Node.js to abort the execution after 1 second.

### 3. IIFE Wrapper for Transforms
Standard `node:vm` scripts do not support top-level `return` statements. To preserve compatibility with existing user code (which often starts with `return ...`), we will wrap transform scripts inside an immediately invoked function expression (IIFE):
```javascript
((input) => {
  [USER_CODE_HERE]
})(input)
```

## Proposed Changes

### Packages / Nodes & Codegen

#### [MODIFY] [condition.ts](file:///Users/barankurtulusozan/skein/packages/nodes/src/executors/condition.ts)
Refactor `conditionExecutor` to run inside a `vm.Script` context with timeout.

#### [MODIFY] [transform.ts](file:///Users/barankurtulusozan/skein/packages/nodes/src/executors/transform.ts)
Refactor `transformExecutor` to run inside a `vm.Script` context wrapped in an IIFE with timeout.

#### [MODIFY] [index.ts](file:///Users/barankurtulusozan/skein/packages/export-codegen/src/index.ts)
Update codegen string templates for `condition` and `transform` nodes, and conditionally append `import vm from "node:vm";` to the top of standalone generated files when these executors are utilized.

## Verification

### Automated Tests
Run workspace tests to ensure no functionality is broken:
- `pnpm test`
