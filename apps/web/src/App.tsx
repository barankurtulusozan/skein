import { runWorkflow } from '@skein/engine';

export default function App() {
  const message = runWorkflow({
    id: 'flow-test',
    name: 'Initial Scaffolding Flow',
    nodes: [],
    edges: [],
  });

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-surface border border-outline rounded-lg p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-primary mb-2">Skein Dashboard</h1>
        <p className="text-text-muted mb-4">Welcome to the Skein standalone workflow editor & runtime.</p>
        <div className="bg-background border border-outline rounded p-3 font-mono text-sm text-success">
          {message}
        </div>
      </div>
    </div>
  );
}
