import { Handle, Position, NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import {
  NODE_DEFINITIONS,
  UINodeDefinition,
} from "../constants/nodeDefinitions";

// Helper to get port color by dataType
export const getDataTypeColor = (dataType: string): string => {
  switch (dataType) {
    case "string":
      return "bg-running border-running text-running";
    case "number":
      return "bg-success border-success text-success";
    case "boolean":
      return "bg-purple-500 border-purple-500 text-purple-400";
    case "object":
      return "bg-primary border-primary text-primary";
    case "array":
      return "bg-warning border-warning text-warning";
    default:
      return "bg-text-muted border-text-muted text-text-muted";
  }
};

export default function CustomNode({ id, type, selected, data }: NodeProps) {
  const nodeDef = NODE_DEFINITIONS[type || ""] as UINodeDefinition;
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);

  // Live status subscriptions from Zustand store
  const runStatus = useWorkflowStore(
    (state) => state.nodeRunStatus[id] || "idle",
  );
  const runOutput = useWorkflowStore((state) => state.nodeRunOutput[id]);
  const runError = useWorkflowStore((state) => state.nodeRunError[id]);

  if (!nodeDef) {
    return (
      <div className="p-4 bg-red-950/20 border border-error text-error rounded-lg">
        Unknown Node Type: {type}
      </div>
    );
  }

  const {
    inputs = [],
    outputs = [],
    category,
    label,
    configFields = [],
  } = nodeDef;
  const config = (data?.config as Record<string, any>) || {};

  const handleConfigChange = (key: string, value: any) => {
    updateNodeConfig(id, key, value);
  };

  // Color categories for headers
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case "trigger":
        return "text-success bg-success/10 border-success/20";
      case "action":
        return "text-primary bg-primary/10 border-primary/20";
      case "logic":
        return "text-running bg-running/10 border-running/20";
      case "ai":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      default:
        return "text-warning bg-warning/10 border-warning/20";
    }
  };

  // Live status classes
  const getStatusBorderClass = () => {
    if (runStatus === "running") {
      return "border-running shadow-[0_0_15px_rgba(91,141,239,0.35)] animate-pulse";
    }
    if (runStatus === "success") {
      return "border-success shadow-[0_0_15px_rgba(61,220,151,0.25)]";
    }
    if (runStatus === "error") {
      return "border-error shadow-[0_0_15px_rgba(255,107,107,0.25)]";
    }
    if (runStatus === "skipped") {
      return "border-outline opacity-40";
    }
    return selected
      ? "border-primary ring-1 ring-primary/40"
      : "border-outline hover:border-text-muted/40";
  };

  const getStatusBadge = () => {
    switch (runStatus) {
      case "running":
        return (
          <span className="text-[9px] font-bold text-running animate-pulse">
            ● RUNNING
          </span>
        );
      case "success":
        return (
          <span className="text-[9px] font-bold text-success">✓ SUCCESS</span>
        );
      case "error":
        return <span className="text-[9px] font-bold text-error">⚠ ERROR</span>;
      case "skipped":
        return (
          <span className="text-[9px] font-bold text-text-muted">
            ◌ SKIPPED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-w-[260px] max-w-[320px] bg-surface border rounded-xl shadow-2xl transition-all relative ${getStatusBorderClass()}`}
    >
      {/* Delete Button (visible when node is hovered or selected) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteNode(id);
        }}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-950/80 border border-error text-error hover:bg-error hover:text-background flex items-center justify-center text-xs opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity z-50 select-none cursor-pointer"
        style={{ opacity: selected ? 1 : undefined }}
        title="Delete Node"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Node Header */}
      <div className="p-3.5 border-b border-outline flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span
            className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${getCategoryStyles(category)}`}
          >
            {category}
          </span>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <span className="text-[10px] font-mono text-text-muted">
              ID: {id.split("-").pop()}
            </span>
          </div>
        </div>
        <h3 className="font-sans text-sm font-bold text-text-primary mt-1">
          {label}
        </h3>
      </div>

      {/* Node Inputs & Outputs Ports container */}
      {(inputs.length > 0 || outputs.length > 0) && (
        <div className="px-3.5 py-2.5 bg-background/30 flex flex-col gap-2">
          {/* Inputs Section */}
          {inputs.map((port) => {
            const colorClass = getDataTypeColor(port.dataType);
            return (
              <div
                key={port.id}
                className="flex items-center gap-2 relative py-0.5 justify-start"
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={port.id}
                  style={{
                    left: "-20px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "transparent",
                    border: "3px solid transparent",
                  }}
                  className={`!left-[-19px] !w-3 !h-3 !rounded-full !border-[3px] !border-background ${colorClass.split(" ")[0]} hover:scale-125 transition-transform`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full ${colorClass.split(" ")[0]} shrink-0`}
                />
                <span className="text-xs font-medium text-text-primary">
                  {port.label}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  ({port.dataType})
                </span>
              </div>
            );
          })}

          {/* Outputs Section */}
          {outputs.map((port) => {
            const colorClass = getDataTypeColor(port.dataType);
            return (
              <div
                key={port.id}
                className="flex items-center gap-2 relative py-0.5 justify-end"
              >
                <span className="text-[10px] font-mono text-text-muted">
                  ({port.dataType})
                </span>
                <span className="text-xs font-medium text-text-primary">
                  {port.label}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${colorClass.split(" ")[0]} shrink-0`}
                />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.id}
                  style={{
                    right: "-20px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "transparent",
                    border: "3px solid transparent",
                  }}
                  className={`!right-[-19px] !w-3 !h-3 !rounded-full !border-[3px] !border-background ${colorClass.split(" ")[0]} hover:scale-125 transition-transform`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Node Configurations Section */}
      {configFields.length > 0 && (
        <div className="p-3.5 border-t border-outline flex flex-col gap-3 drag-nodrag">
          {configFields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                {field.label}
              </label>

              {field.type === "select" ? (
                <select
                  value={config[field.name] ?? field.defaultValue}
                  onChange={(e) =>
                    handleConfigChange(field.name, e.target.value)
                  }
                  onKeyDown={(e) => e.stopPropagation()} // Stop backspace deletion trigger while editing
                  className="w-full bg-background border border-outline rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary font-sans"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={config[field.name] ?? field.defaultValue}
                  onChange={(e) =>
                    handleConfigChange(field.name, e.target.value)
                  }
                  onKeyDown={(e) => e.stopPropagation()} // Stop backspace deletion trigger while editing
                  rows={3}
                  className="w-full bg-background border border-outline rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary font-mono custom-scrollbar"
                />
              ) : field.type === "number" ? (
                <input
                  type="number"
                  value={config[field.name] ?? field.defaultValue}
                  onChange={(e) =>
                    handleConfigChange(field.name, Number(e.target.value))
                  }
                  onKeyDown={(e) => e.stopPropagation()} // Stop backspace deletion trigger while editing
                  className="w-full bg-background border border-outline rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                />
              ) : (
                <input
                  type="text"
                  value={config[field.name] ?? field.defaultValue}
                  onChange={(e) =>
                    handleConfigChange(field.name, e.target.value)
                  }
                  onKeyDown={(e) => e.stopPropagation()} // Stop backspace deletion trigger while editing
                  className="w-full bg-background border border-outline rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary font-sans"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Node Inline Run Output */}
      {runOutput !== undefined && (
        <div className="p-3 border-t border-outline bg-background/40 font-mono text-[10px] text-text-muted rounded-b-xl max-h-[120px] overflow-y-auto custom-scrollbar break-all">
          <div className="text-[9px] uppercase tracking-wider text-success/60 mb-1 font-bold">
            Output
          </div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(runOutput, null, 2)}
          </pre>
        </div>
      )}

      {/* Node Inline Run Error */}
      {runError !== undefined && (
        <div className="p-3 border-t border-outline bg-red-950/20 font-mono text-[10px] text-error rounded-b-xl break-all">
          <div className="text-[9px] uppercase tracking-wider text-error/60 mb-1 font-bold">
            Error
          </div>
          <div>{runError}</div>
        </div>
      )}
    </div>
  );
}
