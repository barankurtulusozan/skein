import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { WorkflowExecutor } from "@skein/engine";
import { generateStandaloneCode } from "@skein/export-codegen";
import { db, DbWorkflow, DbRun } from "./db";
import { scheduler } from "./scheduler";
import { randomUUID } from "crypto";

const fastify = Fastify({
  logger: true,
});

// Register CORS for frontend connection (runs on Port 5173 by default)
await fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// Register WebSocket plugin
await fastify.register(websocket);

// Active WebSocket connections
const clients = new Set<any>();

fastify.get("/health", async (request, reply) => {
  return { status: "ok" };
});

// WS route for run logs and visual updates
fastify.route({
  method: "GET",
  url: "/ws",
  handler: (request, reply) => {
    reply.send({ error: "Websocket connection only" });
  },
  wsHandler: (conn, req) => {
    clients.add(conn.socket);
    conn.socket.send(JSON.stringify({ type: "connected" }));

    conn.socket.on("close", () => {
      clients.delete(conn.socket);
    });
  },
});

// Helper: Broadcast event to all WebSocket clients
function broadcast(eventData: any) {
  const message = JSON.stringify(eventData);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      client.send(message);
    }
  });
}

// Core Execution Trigger Function
async function triggerWorkflowExecution(
  workflow: DbWorkflow,
  initialPayload: Record<string, any> = {},
): Promise<string> {
  const runId = randomUUID();
  const executor = new WorkflowExecutor(workflow);

  const activeRun: DbRun = {
    id: runId,
    workflowId: workflow.id,
    status: "running",
    results: {},
    startedAt: Date.now(),
  };

  // Save initial run log
  await db.saveRun(activeRun);

  broadcast({ event: "run:start", runId, workflowId: workflow.id });

  // Listen to engine steps and broadcast + persist state updates
  executor.on("node:start", async (nodeId) => {
    activeRun.results[nodeId] = {
      nodeId,
      status: "running",
      startedAt: Date.now(),
    };
    await db.saveRun(activeRun);
    broadcast({ event: "node:start", runId, nodeId });
  });

  executor.on("node:success", async (nodeId, output) => {
    const prev = activeRun.results[nodeId] || {};
    activeRun.results[nodeId] = {
      ...prev,
      nodeId,
      status: "success",
      output,
      finishedAt: Date.now(),
    };
    await db.saveRun(activeRun);
    broadcast({ event: "node:success", runId, nodeId, output });
  });

  executor.on("node:skipped", async (nodeId) => {
    const prev = activeRun.results[nodeId] || {};
    activeRun.results[nodeId] = {
      ...prev,
      nodeId,
      status: "skipped",
      finishedAt: Date.now(),
    };
    await db.saveRun(activeRun);
    broadcast({ event: "node:skipped", runId, nodeId });
  });

  executor.on("node:error", async (nodeId, error) => {
    const prev = activeRun.results[nodeId] || {};
    activeRun.results[nodeId] = {
      ...prev,
      nodeId,
      status: "error",
      error,
      finishedAt: Date.now(),
    };
    await db.saveRun(activeRun);
    broadcast({ event: "node:error", runId, nodeId, error });
  });

  // Handle final completion
  executor.on("run:complete", async (results) => {
    activeRun.status = "success";
    activeRun.finishedAt = Date.now();
    await db.saveRun(activeRun);
    broadcast({ event: "run:complete", runId, results });
  });

  executor.on("run:error", async (error) => {
    activeRun.status = "error";
    activeRun.finishedAt = Date.now();
    await db.saveRun(activeRun);
    broadcast({ event: "run:error", runId, error });
  });

  // Run execution in the background asynchronously
  executor.execute(initialPayload).catch((err) => {
    fastify.log.error(`Execution error for run ID ${runId}:`, err);
  });

  return runId;
}

// Bind trigger callback to scheduler
scheduler.setTriggerFunction(async (w) => {
  await triggerWorkflowExecution(w, { trigger: "schedule" });
});

// --- REST API Endpoints ---

// List all workflows
fastify.get("/api/workflows", async (request, reply) => {
  return await db.listWorkflows();
});

// Get workflow by ID
fastify.get("/api/workflows/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const workflow = await db.getWorkflow(id);
  if (!workflow) {
    reply.status(404);
    return { error: "Workflow not found" };
  }
  return workflow;
});

// Save or Update workflow config
fastify.post("/api/workflows", async (request, reply) => {
  const body = request.body as any;
  if (!body.id || !body.name) {
    reply.status(400);
    return { error: "Missing workflow id or name" };
  }

  const saved = await db.saveWorkflow({
    id: body.id,
    name: body.name,
    nodes: body.nodes || [],
    edges: body.edges || [],
  });

  // Update schedule status dynamically
  await scheduler.scheduleWorkflow(saved);

  return saved;
});

// List execution logs for a workflow
fastify.get("/api/workflows/:id/runs", async (request, reply) => {
  const { id } = request.params as { id: string };
  return await db.getRunsForWorkflow(id);
});

// Trigger a manual run
fastify.post("/api/workflows/:id/run", async (request, reply) => {
  const { id } = request.params as { id: string };
  const workflow = await db.getWorkflow(id);
  if (!workflow) {
    reply.status(404);
    return { error: "Workflow not found" };
  }

  const payload = (request.body as any)?.payload || {};
  const runId = await triggerWorkflowExecution(workflow, payload);

  return { runId, status: "started" };
});

// Export workflow as standalone typescript code
fastify.get("/api/workflows/:id/export", async (request, reply) => {
  const { id } = request.params as { id: string };
  const workflow = await db.getWorkflow(id);
  if (!workflow) {
    reply.status(404);
    return { error: "Workflow not found" };
  }

  const code = generateStandaloneCode(workflow);
  reply.header("Content-Type", "text/plain; charset=utf-8");
  return code;
});

// Webhook trigger endpoint
fastify.post("/api/webhooks/:workflowId", async (request, reply) => {
  const { workflowId } = request.params as { workflowId: string };
  const workflow = await db.getWorkflow(workflowId);
  if (!workflow) {
    reply.status(404);
    return { error: "Workflow not found" };
  }

  const hasWebhookTrigger = workflow.nodes.some(
    (n) => n.type === "webhook-trigger",
  );
  if (!hasWebhookTrigger) {
    reply.status(400);
    return { error: "This workflow does not contain a Webhook Trigger node" };
  }

  const initialPayload = {
    headers: request.headers || {},
    body: request.body || {},
  };

  const runId = await triggerWorkflowExecution(workflow, initialPayload);

  return { status: "webhook_triggered", runId };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;

    // Initialize Database
    await db.listWorkflows();

    // Initialize Scheduler
    await scheduler.init();

    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server is running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
