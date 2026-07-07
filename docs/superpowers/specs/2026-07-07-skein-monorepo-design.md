# Design Specification: Skein — Standalone Node-Based Workflow & AI-Agent Runtime

**Date:** 2026-07-07  
**Status:** Approved  
**Repository Path:** `/Users/barankurtulusozan/skein`

---

## 1. Project Goal & Architecture Overview
Skein is a node-based workflow execution and AI-agent runtime. It differentiates itself by offering:
1. **Live, Observable DAG Execution** where nodes animate through execution states (idle, running, success, error) and display outputs inline.
2. **Strict Port Typing** validated on the canvas at connection time.
3. **Plug-and-play Executor Plugins** requiring no core canvas changes.
4. **Zero-dependency Standalone Export** where any workflow graph can be compiled into a single executable TypeScript file.

The codebase is organized as a **monorepo** to decouple the core execution engine (`packages/engine`), schemas (`packages/schema`), and code-generation utilities (`packages/export-codegen`) from specific UI or server runtimes.

---

## 2. Monorepo Structure
The repository is managed via `pnpm` workspaces:
```
skein/
├── pnpm-workspace.yaml      # Monorepo workspaces definition
├── package.json             # Root scripts and build tool dependencies
├── turbo.json               # Pipeline build rules
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-07-07-skein-monorepo-design.md (this file)
├── apps/
│   ├── web/                 # React + Vite + TS canvas application
│   └── server/              # Fastify + TS API server & websocket coordinator
└── packages/
    ├── schema/              # Zod schema validation layer
    ├── engine/              # Framework-agnostic TS execution engine
    └── export-codegen/      # Bundled workflow compiler
```

---

## 3. Tech Stack & Integration
* **Package Manager:** `pnpm` workspaces
* **Build System:** Turborepo
* **Frontend:** React 19, TypeScript, Vite, `@xyflow/react` (React Flow), Zustand
* **Backend:** Node.js, Fastify, WebSockets (`ws`), BullMQ, Redis, PostgreSQL
* **Testing:** Vitest (unit/integration), Playwright (E2E)

---

## 4. Theme & Design Token Import
We will import colors and typography configurations from the desktop design prototype specs:
* **Palette:**
  * Background / Base Surface: `#0E1116`
  * Card / Secondary Surface: `#171B22`
  * Border / Outlines: `#2A2F3A`
  * Accent Primary: `#F2A65A`
  * Success State: `#3DDC97`
  * Running State: `#5B8DEF` (with pulsing micro-animations)
  * Error State: `#FF6B6B`
  * Warning State: `#E0A93E`
  * Text Colors: `#F5F6F8` (high contrast), `#9AA1AC` (muted text)
* **Fonts:**
  * UI Text: Inter
  * Technical labels / Logs / Data ids: JetBrains Mono

These variables will be configured inside `apps/web/tailwind.config.js` to ensure the interface matches the visual prototypes precisely.

---

## 5. Development Strategy (Phases)
* **Phase 0 (Current):** Setup Turborepo/pnpm monorepo structure. Configure `@skein/schema` and `@skein/engine` baseline workspaces. Setup Vitest and configure CI.
* **Phase 1:** Canvas MVP. Build custom node rendering with React Flow, type-safe ports, drag-and-drop node menu, and local storage state.
* **Phase 2:** Complete framework-agnostic execution engine. Topological sort and run workflows.
* **Phase 3:** Fastify server integration, DB persistence, and real-time execution streaming over WebSockets.
* **Phase 4:** AI-agent prompt and tool nodes.
* **Phase 5:** Code generation and export.
* **Phase 6:** Docker Compose configuration and final documentation.
