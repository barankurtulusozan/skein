import { useState, DragEvent } from "react";
import {
  NODE_DEFINITIONS,
  UINodeDefinition,
} from "../constants/nodeDefinitions";

export default function Sidebar() {
  const [search, setSearch] = useState("");

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Group node definitions by category
  const categories: Record<
    string,
    { label: string; color: string; items: UINodeDefinition[] }
  > = {
    trigger: {
      label: "Triggers",
      color: "border-success/30 text-success",
      items: [],
    },
    action: {
      label: "Actions",
      color: "border-primary/30 text-primary",
      items: [],
    },
    logic: {
      label: "Logic",
      color: "border-running/30 text-running",
      items: [],
    },
    ai: {
      label: "AI & Agents",
      color: "border-purple-500/30 text-purple-400",
      items: [],
    },
    output: {
      label: "Outputs",
      color: "border-warning/30 text-warning",
      items: [],
    },
  };

  Object.values(NODE_DEFINITIONS).forEach((node) => {
    if (
      node.label.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase())
    ) {
      categories[node.category]?.items.push(node);
    }
  });

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] fixed top-16 left-0 bg-surface border-r border-outline flex flex-col z-40 overflow-hidden">
      {/* Search Input */}
      <div className="p-4 border-b border-outline">
        <label className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2 block">
          Add Nodes
        </label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full bg-background border border-outline rounded-lg py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all font-sans"
          />
          <svg
            className="w-4 h-4 text-text-muted absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Nodes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {Object.entries(categories).map(([key, cat]) => {
          if (cat.items.length === 0) return null;
          return (
            <div key={key} className="space-y-2">
              <h3
                className={`text-xs font-mono uppercase tracking-widest font-semibold ${cat.color.split(" ")[1]}`}
              >
                {cat.label}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {cat.items.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    className="p-3 bg-background border border-outline rounded-lg cursor-grab hover:border-primary/50 hover:bg-surface/50 active:cursor-grabbing transition-all select-none group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {node.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-surface rounded text-text-muted border border-outline">
                        {node.type}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      {node.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
