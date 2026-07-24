import React, { useState } from "react";
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from "../constants/templates";
import { useWorkflowStore } from "../store/useWorkflowStore";

interface TemplateLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplateLibraryDialog({
  isOpen,
  onClose,
}: TemplateLibraryDialogProps) {
  const { nodes, showToast } = useWorkflowStore();
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredTemplates = WORKFLOW_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    if (nodes.length > 0) {
      const confirmOverwrite = window.confirm(
        "Loading this template will overwrite your active canvas layout. Do you want to proceed?"
      );
      if (!confirmOverwrite) return;
    }

    useWorkflowStore.setState({
      activeWorkflowId: template.id,
      activeWorkflowName: template.name,
      nodes: template.nodes,
      edges: template.edges,
      nodeRunStatus: {},
      nodeRunOutput: {},
      nodeRunError: {},
      past: [],
      future: [],
    });

    try {
      localStorage.setItem(
        "skein-workflow",
        JSON.stringify({ nodes: template.nodes, edges: template.edges })
      );
    } catch (e) {
      console.error(e);
    }

    showToast(`Loaded template: "${template.name}"`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-outline rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline bg-background/50">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Workflow Template Library
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Choose a prebuilt visual workflow graph to jumpstart your development.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-outline/30 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-6 py-3 border-b border-outline/50 bg-background/20">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates by name, category, or description..."
            className="w-full px-3.5 py-2 text-sm bg-background border border-outline rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted/60"
          />
        </div>

        {/* Cards Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group border border-outline hover:border-primary/60 bg-background/40 hover:bg-surface rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => handleSelectTemplate(template)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">
                    {template.category}
                  </span>
                  <span className="text-xs text-text-muted">
                    {template.nodes.length} Nodes
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                  {template.name}
                </h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-outline/30 flex items-center justify-between">
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  Ready to Load
                </span>
                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-background group-hover:bg-primary/90 transition-all flex items-center gap-1">
                  Load Template
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
