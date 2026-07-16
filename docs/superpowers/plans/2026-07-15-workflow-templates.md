# Workflow Templates Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a workflow templates dialog library allowing users to load prebuilt templates with a single click, featuring 5 automated AI/logic templates.

**Architecture:** A React modal dialog in the frontend displays a catalog of template layouts. When a user selects a template, it triggers confirmation if the canvas is populated, then replaces the Zustand store's active nodes/edges with the prebuilt template structure.

**Tech Stack:** React 19, TypeScript, TailwindCSS, Zustand, Lucide React (or SVG).

## Global Constraints
* Keep components clean and focused.
* Minimize backend changes by hosting the catalog statically in the frontend.
* Always check for unsaved canvas changes before overwriting.

---

### Task 1: Create Templates Registry
**Files:**
* Create: `apps/web/src/constants/templates.ts`

**Interfaces:**
* Produces: `TEMPLATES` array mapping templates metadata, nodes, and edges.

* [ ] **Step 1: Write static template configurations**
  Create [templates.ts](file:///Users/barankurtulusozan/skein/apps/web/src/constants/templates.ts) with the 5 templates structured with proper node positions and connections.

  ```typescript
  import { Node, Edge } from "@xyflow/react";

  export interface WorkflowTemplate {
    name: string;
    description: string;
    category: string;
    tags: string[];
    nodes: Node[];
    edges: Edge[];
  }

  export const TEMPLATES: WorkflowTemplate[] = [
    {
      name: "AI Support Ticket Router",
      description: "Classify incoming support tickets using an LLM classifier and route them conditionally to specific Slack alert Webhooks.",
      category: "AI & Integration",
      tags: ["AI", "Webhooks", "Condition"],
      nodes: [
        {
          id: "node-webhook",
          type: "webhook-trigger",
          position: { x: 50, y: 150 },
          data: { config: {} }
        },
        {
          id: "node-classifier",
          type: "llm-prompt",
          position: { x: 350, y: 150 },
          data: {
            config: {
              provider: "OpenAI",
              model: "gpt-4o",
              promptTemplate: "Categorize the following support ticket into one word (billing, technical, feedback):\n\n{{input.body.message}}"
            }
          }
        },
        {
          id: "node-condition",
          type: "condition",
          position: { x: 680, y: 150 },
          data: {
            config: {
              expression: "input === 'billing'"
            }
          }
        },
        {
          id: "node-slack-billing",
          type: "http-request",
          position: { x: 980, y: 50 },
          data: {
            config: {
              method: "POST",
              urlTemplate: "https://httpbin.org/post"
            }
          }
        },
        {
          id: "node-slack-general",
          type: "http-request",
          position: { x: 980, y: 300 },
          data: {
            config: {
              method: "POST",
              urlTemplate: "https://httpbin.org/post"
            }
          }
        }
      ],
      edges: [
        {
          id: "e-webhook-classifier",
          source: "node-webhook",
          sourceHandle: "body",
          target: "node-classifier",
          targetHandle: "prompt"
        },
        {
          id: "e-classifier-condition",
          source: "node-classifier",
          sourceHandle: "response",
          target: "node-condition",
          targetHandle: "value"
        },
        {
          id: "e-cond-billing",
          source: "node-condition",
          sourceHandle: "true",
          target: "node-slack-billing",
          targetHandle: "body"
        },
        {
          id: "e-cond-general",
          source: "node-condition",
          sourceHandle: "false",
          target: "node-slack-general",
          targetHandle: "body"
        }
      ]
    },
    {
      name: "Weekly Performance Summarizer",
      description: "Trigger weekly metrics fetching from your server API, compile it with an LLM summarizer, and output the report.",
      category: "Schedules & AI",
      tags: ["Cron", "HTTP", "AI"],
      nodes: [
        {
          id: "node-schedule",
          type: "schedule-trigger",
          position: { x: 50, y: 150 },
          data: {
            config: {
              cron: "0 9 * * 1"
            }
          }
        },
        {
          id: "node-fetch-metrics",
          type: "http-request",
          position: { x: 350, y: 150 },
          data: {
            config: {
              method: "GET",
              urlTemplate: "https://httpbin.org/get?metrics=weekly"
            }
          }
        },
        {
          id: "node-summarizer",
          type: "llm-prompt",
          position: { x: 680, y: 150 },
          data: {
            config: {
              provider: "OpenAI",
              model: "gpt-4o",
              promptTemplate: "Generate a markdown executive performance report from this weekly metric JSON data:\n\n{{input.response}}"
            }
          }
        },
        {
          id: "node-logger",
          type: "log-debug",
          position: { x: 980, y: 150 },
          data: { config: {} }
        }
      ],
      edges: [
        {
          id: "e-schedule-fetch",
          source: "node-schedule",
          sourceHandle: "timestamp",
          target: "node-fetch-metrics",
          targetHandle: "body"
        },
        {
          id: "e-fetch-summarizer",
          source: "node-fetch-metrics",
          sourceHandle: "response",
          target: "node-summarizer",
          targetHandle: "prompt"
        },
        {
          id: "e-summarizer-logger",
          source: "node-summarizer",
          sourceHandle: "response",
          target: "node-logger",
          targetHandle: "data"
        }
      ]
    },
    {
      name: "AI Translation & Localizer",
      description: "Take raw text input, translate to Spanish and French in parallel, format translations into structured JSON, and post to a CMS Webhook.",
      category: "AI & Logic",
      tags: ["Manual", "Translation", "Custom Code"],
      nodes: [
        {
          id: "node-manual",
          type: "manual-trigger",
          position: { x: 50, y: 180 },
          data: {
            config: {
              defaultPayload: '{\n  "text": "The quick brown fox jumps over the lazy dog."\n}'
            }
          }
        },
        {
          id: "node-translate-es",
          type: "llm-prompt",
          position: { x: 350, y: 50 },
          data: {
            config: {
              provider: "OpenAI",
              model: "gpt-4o",
              promptTemplate: "Translate the following text to Spanish:\n\n{{input.text}}"
            }
          }
        },
        {
          id: "node-translate-fr",
          type: "llm-prompt",
          position: { x: 350, y: 300 },
          data: {
            config: {
              provider: "OpenAI",
              model: "gpt-4o",
              promptTemplate: "Translate the following text to French:\n\n{{input.text}}"
            }
          }
        },
        {
          id: "node-combine",
          type: "transform",
          position: { x: 680, y: 180 },
          data: {
            config: {
              code: "const es = input.spanish;\nconst fr = input.french;\nreturn {\n  spanish: es,\n  french: fr\n};"
            }
          }
        },
        {
          id: "node-publish",
          type: "http-request",
          position: { x: 980, y: 180 },
          data: {
            config: {
              method: "POST",
              urlTemplate: "https://httpbin.org/post"
            }
          }
        }
      ],
      edges: [
        {
          id: "e-manual-es",
          source: "node-manual",
          sourceHandle: "payload",
          target: "node-translate-es",
          targetHandle: "prompt"
        },
        {
          id: "e-manual-fr",
          source: "node-manual",
          sourceHandle: "payload",
          target: "node-translate-fr",
          targetHandle: "prompt"
        },
        {
          id: "e-es-combine",
          source: "node-translate-es",
          sourceHandle: "response",
          target: "node-combine",
          targetHandle: "input"
        },
        {
          id: "e-combine-publish",
          source: "node-combine",
          sourceHandle: "output",
          target: "node-publish",
          targetHandle: "body"
        }
      ]
    },
    {
      name: "Data Sync Pipeline with Throttling",
      description: "Retrieve a list of items, iterate over each item in a loop, apply data mapping/transformation, hit a sync API, and throttle execution to respect rate limits.",
      category: "Logic & Integration",
      tags: ["Loop", "Throttling", "Data Sync"],
      nodes: [
        {
          id: "node-trigger",
          type: "webhook-trigger",
          position: { x: 50, y: 150 },
          data: { config: {} }
        },
        {
          id: "node-fetch-users",
          type: "http-request",
          position: { x: 320, y: 150 },
          data: {
            config: {
              method: "GET",
              urlTemplate: "https://httpbin.org/get?list=users"
            }
          }
        },
        {
          id: "node-loop",
          type: "loop",
          position: { x: 620, y: 150 },
          data: { config: {} }
        },
        {
          id: "node-format",
          type: "transform",
          position: { x: 920, y: 50 },
          data: {
            config: {
              code: "return {\n  fullName: input.firstName + ' ' + input.lastName,\n  email: input.email\n};"
            }
          }
        },
        {
          id: "node-sync",
          type: "http-request",
          position: { x: 1220, y: 50 },
          data: {
            config: {
              method: "POST",
              urlTemplate: "https://httpbin.org/post"
            }
          }
        },
        {
          id: "node-throttle",
          type: "delay",
          position: { x: 1500, y: 50 },
          data: {
            config: {
              seconds: 2
            }
          }
        }
      ],
      edges: [
        {
          id: "e-trigger-fetch",
          source: "node-trigger",
          sourceHandle: "body",
          target: "node-fetch-users",
          targetHandle: "body"
        },
        {
          id: "e-fetch-loop",
          source: "node-fetch-users",
          sourceHandle: "response",
          target: "node-loop",
          targetHandle: "array"
        },
        {
          id: "e-loop-format",
          source: "node-loop",
          sourceHandle: "item",
          target: "node-format",
          targetHandle: "input"
        },
        {
          id: "e-format-sync",
          source: "node-format",
          sourceHandle: "output",
          target: "node-sync",
          targetHandle: "body"
        },
        {
          id: "e-sync-throttle",
          source: "node-sync",
          sourceHandle: "status",
          target: "node-throttle",
          targetHandle: "input"
        }
      ]
    },
    {
      name: "Smart Autonomous Agent Loop",
      description: "Trigger an agent to complete a task, leverage external search tool capabilities, format the findings, and log the output.",
      category: "AI",
      tags: ["Agentic", "Tool Calling", "Loop"],
      nodes: [
        {
          id: "node-manual-trigger",
          type: "manual-trigger",
          position: { x: 50, y: 150 },
          data: {
            config: {
              defaultPayload: '{\n  "query": "Who won the latest Premier League match?"\n}'
            }
          }
        },
        {
          id: "node-agent",
          type: "llm-prompt",
          position: { x: 350, y: 150 },
          data: {
            config: {
              provider: "OpenAI",
              model: "gpt-4o",
              promptTemplate: "You are a research agent. Run a web search for the query: {{input.query}}"
            }
          }
        },
        {
          id: "node-tool-call",
          type: "tool-call",
          position: { x: 680, y: 150 },
          data: {
            config: {
              toolName: "web_search"
            }
          }
        },
        {
          id: "node-formatter",
          type: "transform",
          position: { x: 980, y: 150 },
          data: {
            config: {
              code: "return `Agent results:\\n\\n` + JSON.stringify(input, null, 2);"
            }
          }
        },
        {
          id: "node-log-out",
          type: "log-debug",
          position: { x: 1280, y: 150 },
          data: { config: {} }
        }
      ],
      edges: [
        {
          id: "e-manual-agent",
          source: "node-manual-trigger",
          sourceHandle: "payload",
          target: "node-agent",
          targetHandle: "prompt"
        },
        {
          id: "e-agent-tool",
          source: "node-agent",
          sourceHandle: "response",
          target: "node-tool-call",
          targetHandle: "args"
        },
        {
          id: "e-tool-formatter",
          source: "node-tool-call",
          sourceHandle: "result",
          target: "node-formatter",
          targetHandle: "input"
        },
        {
          id: "e-formatter-log",
          source: "node-formatter",
          sourceHandle: "output",
          target: "node-log-out",
          targetHandle: "data"
        }
      ]
    }
  ];
  ```

* [ ] **Step 2: Commit static catalog**
  Run:
  ```bash
  git add apps/web/src/constants/templates.ts
  git commit -m "feat(templates): add prebuilt templates configuration catalog"
  ```

---

### Task 2: Implement Store loading function
**Files:**
* Modify: `apps/web/src/store/useWorkflowStore.ts`

**Interfaces:**
* Produces: `loadTemplate: (name: string, nodes: Node[], edges: Edge[]) => void`

* [ ] **Step 1: Declare interface type for `loadTemplate` in WorkflowState**
  Add `loadTemplate` definition to the state interface around line 77 in [useWorkflowStore.ts](file:///Users/barankurtulusozan/skein/apps/web/src/store/useWorkflowStore.ts):
  ```typescript
  loadTemplate: (name: string, nodes: Node[], edges: Edge[]) => void;
  ```

* [ ] **Step 2: Implement `loadTemplate` in store creator**
  Add the method implementation to the store return block (around line 630):
  ```typescript
      loadTemplate: (name, templateNodes, templateEdges) => {
        const newId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const deepCopiedNodes = JSON.parse(JSON.stringify(templateNodes));
        const deepCopiedEdges = JSON.parse(JSON.stringify(templateEdges));

        set({
          activeWorkflowId: newId,
          activeWorkflowName: name,
          nodes: deepCopiedNodes,
          edges: deepCopiedEdges,
          nodeRunStatus: {},
          nodeRunOutput: {},
          nodeRunError: {},
          past: [],
          future: [],
        });

        saveFlow(deepCopiedNodes, deepCopiedEdges);
        get().showToast(`Loaded template: "${name}"`, "success");
      },
  ```

* [ ] **Step 3: Commit store changes**
  Run:
  ```bash
  git add apps/web/src/store/useWorkflowStore.ts
  git commit -m "feat(store): implement loadTemplate method in useWorkflowStore"
  ```

---

### Task 3: Create Template Library Dialog Component
**Files:**
* Create: `apps/web/src/components/TemplateLibraryDialog.tsx`

**Interfaces:**
* Produces: `<TemplateLibraryDialog isOpen={...} onClose={...} />` component.

* [ ] **Step 1: Write dialog component**
  Write [TemplateLibraryDialog.tsx](file:///Users/barankurtulusozan/skein/apps/web/src/components/TemplateLibraryDialog.tsx) with search filtering and nodes timeline preview list.

  ```tsx
  import React, { useState } from "react";
  import { TEMPLATES } from "../constants/templates";
  import { useWorkflowStore } from "../store/useWorkflowStore";

  interface TemplateLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
  }

  export default function TemplateLibraryDialog({ isOpen, onClose }: TemplateLibraryDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { nodes: canvasNodes, loadTemplate } = useWorkflowStore();

    if (!isOpen) return null;

    const filteredTemplates = TEMPLATES.filter((tpl) => {
      const query = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(query) ||
        tpl.description.toLowerCase().includes(query) ||
        tpl.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });

    const handleSelectTemplate = (name: string, nodesList: any[], edgesList: any[]) => {
      if (canvasNodes.length > 0) {
        const confirmLoad = window.confirm(
          `This will completely replace your active canvas workflow with the "${name}" template. Are you sure you want to proceed?`
        );
        if (!confirmLoad) return;
      }
      loadTemplate(name, nodesList, edgesList);
      onClose();
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-surface border border-outline w-full max-w-4xl h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM5 20h14a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <h2 className="text-lg font-bold text-text-primary">Workflow Templates</h2>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="px-6 py-3 border-b border-outline bg-background/50">
            <input
              type="text"
              placeholder="Search templates by name, tags, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary placeholder-text-muted"
            />
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-background/20 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-text-muted py-12">
                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">No templates match your search criteria.</span>
              </div>
            ) : (
              filteredTemplates.map((tpl) => (
                <div
                  key={tpl.name}
                  className="bg-surface border border-outline hover:border-text-muted rounded-xl p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {tpl.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-primary/10 text-primary uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-text-primary mb-1.5">{tpl.name}</h3>

                    {/* Description */}
                    <p className="text-xs text-text-muted mb-4 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>

                    {/* Flow Badge List */}
                    <div className="mb-4">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-semibold">Nodes Flow</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {tpl.nodes.map((node, idx) => (
                          <React.Fragment key={node.id}>
                            <span className="px-2 py-0.5 rounded bg-outline/40 text-[10px] text-text-primary font-medium">
                              {node.type?.replace("-trigger", " trigger").replace("-", " ")}
                            </span>
                            {idx < tpl.nodes.length - 1 && (
                              <span className="text-text-muted text-[10px]">➔</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Load Button */}
                  <button
                    onClick={() => handleSelectTemplate(tpl.name, tpl.nodes, tpl.edges)}
                    className="w-full py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/80 text-background transition-colors text-center"
                  >
                    Use Template
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
  ```

* [ ] **Step 2: Commit Dialog component**
  Run:
  ```bash
  git add apps/web/src/components/TemplateLibraryDialog.tsx
  git commit -m "feat(ui): implement TemplateLibraryDialog component"
  ```

---

### Task 4: Integrate Template Library trigger to Topbar
**Files:**
* Modify: `apps/web/src/components/Topbar.tsx`
* Modify: `apps/web/src/App.tsx`

**Interfaces:**
* Consumes: `<TemplateLibraryDialog />` component.

* [ ] **Step 1: Add Templates button to Topbar**
  Find the "New" button in [Topbar.tsx](file:///Users/barankurtulusozan/skein/apps/web/src/components/Topbar.tsx) around line 217-222, and add a "Templates" trigger callback prop and button:
  Modify `TopbarProps` interface and Topbar parameters:
  ```tsx
  interface TopbarProps {
    onOpenTemplates: () => void;
  }
  export default function Topbar({ onOpenTemplates }: TopbarProps) {
  ```
  Insert button before or after "New":
  ```tsx
          <button
            onClick={onOpenTemplates}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-surface border border-outline hover:border-text-muted text-text-primary transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM5 20h14a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Templates
          </button>
  ```

* [ ] **Step 2: Add dialog state and mount in App.tsx**
  Add state and component to [App.tsx](file:///Users/barankurtulusozan/skein/apps/web/src/App.tsx):
  ```tsx
  import { useState } from "react";
  import TemplateLibraryDialog from "./components/TemplateLibraryDialog";
  ```
  Pass `onOpenTemplates={() => setTemplatesOpen(true)}` to `<Topbar />`.
  Add `<TemplateLibraryDialog isOpen={isTemplatesOpen} onClose={() => setTemplatesOpen(false)} />` to the return layout block.

* [ ] **Step 3: Commit Topbar and App integration**
  Run:
  ```bash
  git add apps/web/src/components/Topbar.tsx apps/web/src/App.tsx
  git commit -m "feat(ui): connect TemplateLibraryDialog to Topbar and App layout"
  ```
