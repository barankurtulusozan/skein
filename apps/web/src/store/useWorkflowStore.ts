import { create } from "zustand";
import {
  Node,
  Edge,
  Connection,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import { NODE_DEFINITIONS } from "../constants/nodeDefinitions";

const API_BASE = "http://localhost:3001/api";
const WS_BASE = "ws://localhost:3001/ws";

export interface ToastState {
  message: string;
  type: "success" | "error" | "warning";
  id: number;
}

export interface DbWorkflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt?: number;
  updatedAt?: number;
}

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  past: { nodes: Node[]; edges: Edge[] }[];
  future: { nodes: Node[]; edges: Edge[] }[];
  toasts: ToastState[];

  // Backend Integration
  workflowsList: DbWorkflow[];
  isLoading: boolean;
  activeWorkflowId: string | null;
  activeWorkflowName: string;
  nodeRunStatus: Record<
    string,
    "idle" | "running" | "success" | "error" | "skipped"
  >;
  nodeRunOutput: Record<string, any>;
  nodeRunError: Record<string, string>;

  // React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeDragStop: () => void;

  // Operations
  addNode: (type: string, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateNodeConfig: (id: string, key: string, value: any) => void;
  clearCanvas: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // Toasts
  showToast: (message: string, type: "success" | "error" | "warning") => void;
  removeToast: (id: number) => void;

  // Backend Actions
  fetchWorkflows: () => Promise<void>;
  saveWorkflow: (name?: string) => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  runWorkflow: (payload?: any) => Promise<void>;
  createNewWorkflow: () => void;
}

const serializeState = (nodes: Node[], edges: Edge[]) => {
  return JSON.stringify({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      config: n.data?.config,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  });
};

const DEFAULT_FLOW = {
  id: "default-workflow",
  name: "Default Workflow",
  nodes: [
    {
      id: "node-trigger",
      type: "manual-trigger",
      position: { x: 100, y: 150 },
      data: { config: { defaultPayload: '{\n  "message": "hello"\n}' } },
    },
    {
      id: "node-log",
      type: "log-debug",
      position: { x: 500, y: 150 },
      data: { config: {} },
    },
  ],
  edges: [
    {
      id: "e-node-trigger-payload-node-log-data",
      source: "node-trigger",
      sourceHandle: "payload",
      target: "node-log",
      targetHandle: "data",
    },
  ],
};

const getSavedFlow = () => {
  try {
    const saved = localStorage.getItem("skein-workflow");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load workflow from localStorage", e);
  }
  return DEFAULT_FLOW;
};

const saveFlow = (nodes: Node[], edges: Edge[]) => {
  try {
    localStorage.setItem("skein-workflow", JSON.stringify({ nodes, edges }));
  } catch (e) {
    console.error("Failed to save workflow to localStorage", e);
  }
};

export const useWorkflowStore = create<WorkflowState>((set, get) => {
  const initialFlow = getSavedFlow();

  const pushToHistory = (newNodes: Node[], newEdges: Edge[]) => {
    const { past, nodes, edges } = get();
    if (serializeState(nodes, edges) === serializeState(newNodes, newEdges)) {
      return;
    }
    set({
      past: [
        ...past,
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
      ],
      future: [],
    });
  };

  return {
    nodes: initialFlow.nodes,
    edges: initialFlow.edges,
    past: [],
    future: [],
    toasts: [],

    // Backend initial states
    workflowsList: [],
    isLoading: false,
    activeWorkflowId: initialFlow.id || DEFAULT_FLOW.id,
    activeWorkflowName: initialFlow.name || DEFAULT_FLOW.name,
    nodeRunStatus: {},
    nodeRunOutput: {},
    nodeRunError: {},

    onNodesChange: (changes) => {
      const isRemoval = changes.some((c) => c.type === "remove");
      const oldNodes = get().nodes;
      const newNodes = applyNodeChanges(changes, oldNodes);

      if (isRemoval) {
        pushToHistory(newNodes, get().edges);
      }

      set({ nodes: newNodes });
      saveFlow(newNodes, get().edges);
    },

    onEdgesChange: (changes) => {
      const oldEdges = get().edges;
      const newEdges = applyEdgeChanges(changes, oldEdges);
      if (
        serializeState(get().nodes, oldEdges) !==
        serializeState(get().nodes, newEdges)
      ) {
        pushToHistory(get().nodes, newEdges);
        set({ edges: newEdges });
        saveFlow(get().nodes, newEdges);
      }
    },

    onNodeDragStop: () => {
      const { nodes, edges } = get();
      saveFlow(nodes, edges);
      set((state) => {
        const lastHistory = state.past[state.past.length - 1];
        if (lastHistory) {
          const positionsChanged = state.nodes.some((node) => {
            const histNode = lastHistory.nodes.find((n) => n.id === node.id);
            return (
              !histNode ||
              histNode.position.x !== node.position.x ||
              histNode.position.y !== node.position.y
            );
          });
          if (!positionsChanged) return {};
        }
        return {
          past: [
            ...state.past,
            {
              nodes: JSON.parse(JSON.stringify(state.nodes)),
              edges: JSON.parse(JSON.stringify(state.edges)),
            },
          ],
          future: [],
        };
      });
    },

    onConnect: (connection) => {
      const { nodes, edges } = get();
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      const sourceDef = NODE_DEFINITIONS[sourceNode.type || ""];
      const targetDef = NODE_DEFINITIONS[targetNode.type || ""];

      if (!sourceDef || !targetDef) return;

      const sourcePort = sourceDef.outputs.find(
        (o) => o.id === connection.sourceHandle,
      );
      const targetPort = targetDef.inputs.find(
        (i) => i.id === connection.targetHandle,
      );

      if (!sourcePort || !targetPort) return;

      const sourceT = sourcePort.dataType;
      const targetT = targetPort.dataType;

      if (sourceT !== "any" && targetT !== "any" && sourceT !== targetT) {
        get().showToast(
          `Incompatible connection: Output "${sourcePort.label}" (${sourceT}) cannot connect to Input "${targetPort.label}" (${targetT})`,
          "error",
        );
        return;
      }

      pushToHistory(nodes, edges);
      const newEdges = addEdge(connection, edges);
      set({ edges: newEdges });
      saveFlow(nodes, newEdges);
    },

    addNode: (type, position) => {
      const { nodes, edges } = get();
      const nodeDef = NODE_DEFINITIONS[type];
      if (!nodeDef) return;

      const defaultConfig: Record<string, any> = {};
      nodeDef.configFields.forEach((field) => {
        defaultConfig[field.name] = field.defaultValue;
      });

      const newNode: Node = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        position,
        data: { config: defaultConfig },
      };

      const newNodes = [...nodes, newNode];
      pushToHistory(newNodes, edges);
      set({ nodes: newNodes });
      saveFlow(newNodes, edges);
    },

    deleteNode: (id) => {
      const { nodes, edges } = get();
      const newNodes = nodes.filter((n) => n.id !== id);
      const newEdges = edges.filter((e) => e.source !== id && e.target !== id);

      pushToHistory(newNodes, newEdges);
      set({ nodes: newNodes, edges: newEdges });
      saveFlow(newNodes, newEdges);
    },

    deleteEdge: (id) => {
      const { nodes, edges } = get();
      const newEdges = edges.filter((e) => e.id !== id);

      pushToHistory(nodes, newEdges);
      set({ edges: newEdges });
      saveFlow(nodes, newEdges);
    },

    updateNodeConfig: (id, key, value) => {
      const { nodes, edges } = get();
      const newNodes = nodes.map((n) => {
        if (n.id === id) {
          const oldConfig = (n.data?.config as Record<string, any>) || {};
          const config = { ...oldConfig, [key]: value };
          return { ...n, data: { ...n.data, config } };
        }
        return n;
      });

      pushToHistory(newNodes, edges);
      set({ nodes: newNodes });
      saveFlow(newNodes, edges);
    },

    clearCanvas: () => {
      const { nodes, edges } = get();
      if (nodes.length === 0 && edges.length === 0) return;

      pushToHistory([], []);
      set({
        nodes: [],
        edges: [],
        nodeRunStatus: {},
        nodeRunOutput: {},
        nodeRunError: {},
      });
      saveFlow([], []);
    },

    undo: () => {
      const { past, future, nodes, edges } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      set({
        past: newPast,
        future: [
          {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
          },
          ...future,
        ],
        nodes: previous.nodes,
        edges: previous.edges,
      });
      saveFlow(previous.nodes, previous.edges);
    },

    redo: () => {
      const { past, future, nodes, edges } = get();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);

      set({
        past: [
          ...past,
          {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
          },
        ],
        future: newFuture,
        nodes: next.nodes,
        edges: next.edges,
      });
      saveFlow(next.nodes, next.edges);
    },

    showToast: (message, type) => {
      const id = Date.now() + Math.random();
      set((state) => ({
        toasts: [...state.toasts, { message, type, id }],
      }));

      setTimeout(() => {
        get().removeToast(id);
      }, 4000);
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    // --- Backend API Actions ---

    fetchWorkflows: async () => {
      set({ isLoading: true });
      try {
        const res = await fetch(`${API_BASE}/workflows`);
        if (!res.ok) throw new Error("Failed to load workflows list.");
        const list = await res.json();
        set({ workflowsList: list });
      } catch (err: any) {
        get().showToast(err.message || "API Server connection error", "error");
      } finally {
        set({ isLoading: false });
      }
    },

    saveWorkflow: async (customName) => {
      const { activeWorkflowId, activeWorkflowName, nodes, edges } = get();
      const finalName = customName || activeWorkflowName;
      set({ isLoading: true });
      try {
        const res = await fetch(`${API_BASE}/workflows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: activeWorkflowId,
            name: finalName,
            nodes,
            edges,
          }),
        });

        if (!res.ok) throw new Error("Failed to save workflow.");
        await res.json();

        get().showToast(
          `Workflow "${finalName}" saved successfully.`,
          "success",
        );
        set({ activeWorkflowName: finalName });
        saveFlow(nodes, edges);
        await get().fetchWorkflows();
      } catch (err: any) {
        get().showToast(err.message || "Save error", "error");
      } finally {
        set({ isLoading: false });
      }
    },

    loadWorkflow: async (id) => {
      set({ isLoading: true });
      try {
        const res = await fetch(`${API_BASE}/workflows/${id}`);
        if (!res.ok) throw new Error("Workflow details not found.");
        const workflow = await res.json();

        set({
          activeWorkflowId: workflow.id,
          activeWorkflowName: workflow.name,
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
          nodeRunStatus: {},
          nodeRunOutput: {},
          nodeRunError: {},
          past: [],
          future: [],
        });
        saveFlow(workflow.nodes || [], workflow.edges || []);
        get().showToast(`Loaded workflow: "${workflow.name}"`, "success");
      } catch (err: any) {
        get().showToast(err.message || "Load error", "error");
      } finally {
        set({ isLoading: false });
      }
    },

    runWorkflow: async (payload) => {
      const { activeWorkflowId, nodes } = get();
      if (!activeWorkflowId) {
        get().showToast(
          "Workflow context missing. Try saving first.",
          "warning",
        );
        return;
      }

      // Reset UI state statuses
      const initialStatus: Record<string, any> = {};
      nodes.forEach((n) => {
        initialStatus[n.id] = "idle";
      });
      set({
        nodeRunStatus: initialStatus,
        nodeRunOutput: {},
        nodeRunError: {},
      });

      try {
        const res = await fetch(
          `${API_BASE}/workflows/${activeWorkflowId}/run`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload }),
          },
        );

        if (!res.ok) throw new Error("Run trigger request failed.");
        const { runId } = await res.json();

        get().showToast(`Execution run started (ID: ${runId})`, "success");

        // Subscribe to live run streams via WebSockets
        const ws = new WebSocket(WS_BASE);

        ws.onopen = () => {
          console.log("[WebSocket]: Connected to streaming endpoint");
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.runId !== runId) return;

          const { event: wsEvent, nodeId, output, error } = data;

          if (wsEvent === "node:start") {
            set((state) => ({
              nodeRunStatus: { ...state.nodeRunStatus, [nodeId]: "running" },
            }));
          } else if (wsEvent === "node:success") {
            set((state) => ({
              nodeRunStatus: { ...state.nodeRunStatus, [nodeId]: "success" },
              nodeRunOutput: { ...state.nodeRunOutput, [nodeId]: output },
            }));
          } else if (wsEvent === "node:skipped") {
            set((state) => ({
              nodeRunStatus: { ...state.nodeRunStatus, [nodeId]: "skipped" },
            }));
          } else if (wsEvent === "node:error") {
            set((state) => ({
              nodeRunStatus: { ...state.nodeRunStatus, [nodeId]: "error" },
              nodeRunError: { ...state.nodeRunError, [nodeId]: error },
            }));
          } else if (wsEvent === "run:complete" || wsEvent === "run:error") {
            ws.close();
            get().showToast(
              wsEvent === "run:complete"
                ? "Workflow run completed!"
                : `Workflow run aborted: ${error}`,
              wsEvent === "run:complete" ? "success" : "error",
            );
          }
        };

        ws.onerror = (err) => {
          console.error("[WebSocket] Error:", err);
        };
      } catch (err: any) {
        get().showToast(err.message || "Trigger error", "error");
      }
    },

    createNewWorkflow: () => {
      const newId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const nodes = [
        {
          id: "node-trigger",
          type: "manual-trigger",
          position: { x: 100, y: 150 },
          data: { config: { defaultPayload: '{\n  "message": "hello"\n}' } },
        },
      ];
      set({
        activeWorkflowId: newId,
        activeWorkflowName: "New Workflow",
        nodes,
        edges: [],
        nodeRunStatus: {},
        nodeRunOutput: {},
        nodeRunError: {},
        past: [],
        future: [],
      });
      saveFlow(nodes, []);
      get().showToast("Created new workflow workspace", "success");
    },
  };
});
