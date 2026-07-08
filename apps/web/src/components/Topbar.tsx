import React, { useRef, useEffect } from "react";
import { useWorkflowStore } from "../store/useWorkflowStore";

export default function Topbar() {
  const {
    past,
    future,
    undo,
    redo,
    clearCanvas,
    nodes,
    edges,
    showToast,
    workflowsList,
    activeWorkflowId,
    activeWorkflowName,
    fetchWorkflows,
    saveWorkflow,
    loadWorkflow,
    runWorkflow,
    createNewWorkflow,
  } = useWorkflowStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved workflows list on mount
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify({ nodes, edges }, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `${activeWorkflowName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      showToast("Workflow JSON exported successfully", "success");
    } catch (e) {
      showToast("Failed to export workflow", "error");
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
          useWorkflowStore.setState({
            nodes: parsed.nodes,
            edges: parsed.edges,
            past: [],
            future: [],
          });
          showToast("Workflow JSON imported successfully", "success");
        } else {
          showToast("Invalid workflow JSON file structure", "error");
        }
      } catch (err) {
        showToast("Failed to parse workflow JSON", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-background border-b border-outline">
      {/* Brand Logo & Saved Workflows Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-sans text-xl font-bold tracking-tight text-primary">
            Skein
          </span>
        </div>

        {/* Workflow Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Workflow:</span>
          <select
            value={activeWorkflowId || ""}
            onChange={(e) => {
              if (e.target.value) loadWorkflow(e.target.value);
            }}
            className="bg-surface border border-outline rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary font-sans max-w-[200px] cursor-pointer"
          >
            {workflowsList.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Workflow Name Editor Input */}
        <div className="flex items-center gap-2 border-l border-outline pl-4">
          <input
            type="text"
            value={activeWorkflowName}
            onChange={(e) =>
              useWorkflowStore.setState({ activeWorkflowName: e.target.value })
            }
            placeholder="Workflow Name"
            className="bg-transparent text-text-primary font-sans text-sm font-semibold border-b border-transparent hover:border-outline focus:border-primary px-1 focus:outline-none w-[180px] transition-colors"
          />
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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
            />
          </svg>
          <span>Undo</span>
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-2 rounded-lg bg-surface border border-outline hover:border-text-muted disabled:opacity-40 disabled:hover:border-outline text-text-primary transition-all flex items-center gap-1 text-sm font-medium"
          title="Redo (Ctrl+Y)"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
            />
          </svg>
          <span>Redo</span>
        </button>
      </div>

      {/* Right Controls: New, Save, Run, Import/Export & Clear */}
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportFile}
          className="hidden"
        />

        <button
          onClick={createNewWorkflow}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-surface border border-outline hover:border-text-muted text-text-primary transition-all flex items-center gap-1.5"
        >
          New
        </button>

        <button
          onClick={() => saveWorkflow()}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/80 text-background transition-all flex items-center gap-1.5"
        >
          Save
        </button>

        <button
          onClick={() => runWorkflow()}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-success text-background hover:bg-success/80 transition-all flex items-center gap-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
            />
          </svg>
          Run
        </button>

        <button
          onClick={handleImportClick}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-surface border border-outline hover:border-text-muted text-text-primary transition-all flex items-center gap-1.5"
        >
          Import
        </button>
        <button
          onClick={handleExport}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-surface border border-outline hover:border-text-muted text-text-primary transition-all flex items-center gap-1.5"
        >
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
