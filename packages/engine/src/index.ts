import { Workflow } from '@skein/schema';

export function runWorkflow(workflow: Workflow): string {
  return `Engine executing workflow: ${workflow.name}`;
}
