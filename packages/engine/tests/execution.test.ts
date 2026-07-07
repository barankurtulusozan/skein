import { describe, it, expect, vi } from 'vitest';
import { WorkflowExecutor } from '../src';
import { topoSort } from '../src/topoSort';

describe('WorkflowExecutor & Topological Sort', () => {
  describe('topoSort', () => {
    it('should sort nodes topologically', () => {
      const workflow = {
        id: 'flow-1',
        name: 'Linear Flow',
        nodes: [
          { id: 'node-3', type: 'log-debug', position: { x: 0, y: 0 }, config: {} },
          { id: 'node-1', type: 'manual-trigger', position: { x: 0, y: 0 }, config: {} },
          { id: 'node-2', type: 'transform', position: { x: 0, y: 0 }, config: {} },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', sourceHandle: 'payload', target: 'node-2', targetHandle: 'input' },
          { id: 'edge-2', source: 'node-2', sourceHandle: 'output', target: 'node-3', targetHandle: 'data' },
        ],
      };
      
      const sorted = topoSort(workflow);
      expect(sorted).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should throw an error on cycles', () => {
      const workflow = {
        id: 'flow-cyclic',
        name: 'Cyclic Flow',
        nodes: [
          { id: 'node-1', type: 'transform', position: { x: 0, y: 0 }, config: {} },
          { id: 'node-2', type: 'transform', position: { x: 0, y: 0 }, config: {} },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', sourceHandle: 'output', target: 'node-2', targetHandle: 'input' },
          { id: 'edge-2', source: 'node-2', sourceHandle: 'output', target: 'node-1', targetHandle: 'input' },
        ],
      };

      expect(() => topoSort(workflow)).toThrow(
        /Cycle detected/
      );
    });
  });

  describe('execute', () => {
    it('should execute a simple linear workflow successfully', async () => {
      const workflow = {
        id: 'flow-2',
        name: 'Simple Log Flow',
        nodes: [
          { id: 'trigger', type: 'manual-trigger', position: { x: 0, y: 0 }, config: {} },
          { id: 'transform', type: 'transform', position: { x: 0, y: 0 }, config: { code: 'return input.message.toUpperCase();' } },
          { id: 'logger', type: 'log-debug', position: { x: 0, y: 0 }, config: {} },
        ],
        edges: [
          { id: 'e1', source: 'trigger', sourceHandle: 'payload', target: 'transform', targetHandle: 'input' },
          { id: 'e2', source: 'transform', sourceHandle: 'output', target: 'logger', targetHandle: 'data' },
        ],
      };

      const executor = new WorkflowExecutor(workflow);
      
      const onStart = vi.fn();
      const onSuccess = vi.fn();
      const onComplete = vi.fn();

      executor.on('node:start', onStart);
      executor.on('node:success', onSuccess);
      executor.on('run:complete', onComplete);

      const results = await executor.execute({ message: 'hello world' });

      expect(results.trigger.status).toBe('success');
      expect(results.trigger.output).toEqual({ payload: { message: 'hello world' } });

      expect(results.transform.status).toBe('success');
      expect(results.transform.output).toEqual({ output: 'HELLO WORLD' });

      expect(results.logger.status).toBe('success');

      expect(onStart).toHaveBeenCalledTimes(3);
      expect(onSuccess).toHaveBeenCalledTimes(3);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should execute parallel paths concurrently', async () => {
      const workflow = {
        id: 'flow-parallel',
        name: 'Parallel Branching',
        nodes: [
          { id: 'trigger', type: 'manual-trigger', position: { x: 0, y: 0 }, config: {} },
          // Branch A (runs with 10ms delay)
          { id: 'delay-a', type: 'delay', position: { x: 0, y: 0 }, config: { seconds: 0.01 } },
          { id: 'logger-a', type: 'log-debug', position: { x: 0, y: 0 }, config: {} },
          // Branch B (runs instantly)
          { id: 'transform-b', type: 'transform', position: { x: 0, y: 0 }, config: { code: 'return "instant";' } },
          { id: 'logger-b', type: 'log-debug', position: { x: 0, y: 0 }, config: {} },
        ],
        edges: [
          { id: 'e-a1', source: 'trigger', sourceHandle: 'payload', target: 'delay-a', targetHandle: 'input' },
          { id: 'e-a2', source: 'delay-a', sourceHandle: 'output', target: 'logger-a', targetHandle: 'data' },
          
          { id: 'e-b1', source: 'trigger', sourceHandle: 'payload', target: 'transform-b', targetHandle: 'input' },
          { id: 'e-b2', source: 'transform-b', sourceHandle: 'output', target: 'logger-b', targetHandle: 'data' },
        ],
      };

      const executor = new WorkflowExecutor(workflow);
      const executionOrder: string[] = [];

      executor.on('node:success', (nodeId) => {
        executionOrder.push(nodeId);
      });

      const results = await executor.execute({ val: 1 });

      expect(results['logger-a'].status).toBe('success');
      expect(results['logger-b'].status).toBe('success');

      // Because Branch B is instant and Branch A is delayed, Branch B's logger should resolve BEFORE Branch A's logger!
      const indexOfB = executionOrder.indexOf('logger-b');
      const indexOfA = executionOrder.indexOf('logger-a');
      expect(indexOfB).toBeLessThan(indexOfA);
    });

    it('should propagate skipped state along conditional branches', async () => {
      const workflow = {
        id: 'flow-condition',
        name: 'If/Else Routing',
        nodes: [
          { id: 'trigger', type: 'manual-trigger', position: { x: 0, y: 0 }, config: {} },
          { id: 'if-node', type: 'condition', position: { x: 0, y: 0 }, config: { expression: 'input.score > 50' } },
          // True Branch
          { id: 'pass-node', type: 'transform', position: { x: 0, y: 0 }, config: { code: 'return "passed";' } },
          // False Branch
          { id: 'fail-node', type: 'transform', position: { x: 0, y: 0 }, config: { code: 'return "failed";' } },
        ],
        edges: [
          { id: 'e-trig', source: 'trigger', sourceHandle: 'payload', target: 'if-node', targetHandle: 'value' },
          { id: 'e-true', source: 'if-node', sourceHandle: 'true', target: 'pass-node', targetHandle: 'input' },
          { id: 'e-false', source: 'if-node', sourceHandle: 'false', target: 'fail-node', targetHandle: 'input' },
        ],
      };

      // Scenario 1: Condition matches true branch (score: 80 > 50)
      const exec1 = new WorkflowExecutor(workflow);
      const res1 = await exec1.execute({ score: 80 });

      expect(res1['if-node'].output).toEqual({ true: { score: 80 } });
      expect(res1['pass-node'].status).toBe('success');
      expect(res1['pass-node'].output).toEqual({ output: 'passed' });
      expect(res1['fail-node'].status).toBe('skipped');

      // Scenario 2: Condition matches false branch (score: 30 <= 50)
      const exec2 = new WorkflowExecutor(workflow);
      const res2 = await exec2.execute({ score: 30 });

      expect(res2['if-node'].output).toEqual({ false: { score: 30 } });
      expect(res2['pass-node'].status).toBe('skipped');
      expect(res2['fail-node'].status).toBe('success');
      expect(res2['fail-node'].output).toEqual({ output: 'failed' });
    });
  });
});
