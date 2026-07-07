import React, { useRef } from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';

export default function Topbar() {
  const { past, future, undo, redo, clearCanvas, nodes, edges, showToast } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify({ nodes, edges }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `skein-workflow-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast('Workflow JSON exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export workflow', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          // Update the store by clearing and pushing
          useWorkflowStore.setState({
            nodes: parsed.nodes,
            edges: parsed.edges,
            past: [],
            future: []
          });
          localStorage.setItem('skein-workflow', JSON.stringify({ nodes: parsed.nodes, edges: parsed.edges }));
          showToast('Workflow JSON imported successfully', 'success');
        } else {
          showToast('Invalid workflow JSON file structure', 'error');
        }
      } catch (err) {
        showToast('Failed to parse workflow JSON', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    event.target.value = '';
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-background border-b border-outline">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-sans text-xl font-bold tracking-tight text-primary">Skein</span>
        <div className="flex items-center gap-1.5 bg-surface border border-outline px-2.5 py-0.5 rounded-full text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
          <span className="text-text-muted">LOCAL</span>
        </div>
      </div>

      {/* Center Controls: Undo / Redo */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={past.length === 0}
          className="p-2 rounded-lg bg-surface border border-outline hover:border-text-muted disabled:opacity-40 disabled:hover:border-outline text-text-primary transition-all flex items-center gap-1 text-sm font-medium"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <span>Undo</span>
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-2 rounded-lg bg-surface border border-outline hover:border-text-muted disabled:opacity-40 disabled:hover:border-outline text-text-primary transition-all flex items-center gap-1 text-sm font-medium"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
          <span>Redo</span>
        </button>
      </div>

      {/* Right Controls: Import/Export & Clear */}
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-surface border border-outline hover:border-text-muted text-text-primary transition-all flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Import
        </button>
        <button
          onClick={handleExport}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-surface border border-outline hover:border-text-muted text-text-primary transition-all flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export
        </button>
        <button
          onClick={clearCanvas}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg border border-red-950/40 bg-red-950/20 hover:bg-red-950/40 text-error hover:border-error transition-all"
        >
          Clear
        </button>
      </div>
    </header>
  );
}
