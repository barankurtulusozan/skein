import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ponytail: file-based JSON database serves as a zero-dependency persistence layer.
// Upgrading path: swap out with PostgreSQL + Prisma client for multi-node production deployment.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

export interface DbWorkflow {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  createdAt: number;
  updatedAt: number;
}

export interface DbRun {
  id: string;
  workflowId: string;
  status: "running" | "success" | "error" | "skipped";
  results: Record<string, any>;
  startedAt: number;
  finishedAt?: number;
}

class Database {
  private workflowsFile = path.join(DATA_DIR, "workflows.json");
  private runsFile = path.join(DATA_DIR, "runs.json");

  private async ensureDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Initialize files if they don't exist
    try {
      await fs.access(this.workflowsFile);
    } catch {
      await fs.writeFile(this.workflowsFile, JSON.stringify([]));
    }
    try {
      await fs.access(this.runsFile);
    } catch {
      await fs.writeFile(this.runsFile, JSON.stringify([]));
    }
  }

  private async atomicWrite(filePath: string, data: any) {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.rename(tempPath, filePath);
  }

  // Workflows CRUD
  async listWorkflows(): Promise<DbWorkflow[]> {
    await this.ensureDir();
    const data = await fs.readFile(this.workflowsFile, "utf-8");
    return JSON.parse(data) as DbWorkflow[];
  }

  async getWorkflow(id: string): Promise<DbWorkflow | null> {
    const list = await this.listWorkflows();
    return list.find((w) => w.id === id) || null;
  }

  async saveWorkflow(
    workflow: Omit<DbWorkflow, "createdAt" | "updatedAt">,
  ): Promise<DbWorkflow> {
    await this.ensureDir();
    const list = await this.listWorkflows();
    const existingIndex = list.findIndex((w) => w.id === workflow.id);
    const now = Date.now();

    let saved: DbWorkflow;
    if (existingIndex >= 0) {
      saved = {
        ...list[existingIndex],
        ...workflow,
        updatedAt: now,
      };
      list[existingIndex] = saved;
    } else {
      saved = {
        ...workflow,
        createdAt: now,
        updatedAt: now,
      };
      list.push(saved);
    }

    await this.atomicWrite(this.workflowsFile, list);
    return saved;
  }

  // Runs history
  async listRuns(): Promise<DbRun[]> {
    await this.ensureDir();
    const data = await fs.readFile(this.runsFile, "utf-8");
    return JSON.parse(data) as DbRun[];
  }

  async getRunsForWorkflow(workflowId: string): Promise<DbRun[]> {
    const list = await this.listRuns();
    return list.filter((r) => r.workflowId === workflowId);
  }

  async getRun(id: string): Promise<DbRun | null> {
    const list = await this.listRuns();
    return list.find((r) => r.id === id) || null;
  }

  async saveRun(run: DbRun): Promise<DbRun> {
    await this.ensureDir();
    const list = await this.listRuns();
    const existingIndex = list.findIndex((r) => r.id === run.id);

    if (existingIndex >= 0) {
      list[existingIndex] = run;
    } else {
      list.push(run);
    }

    await this.atomicWrite(this.runsFile, list);
    return run;
  }
}

export const db = new Database();
