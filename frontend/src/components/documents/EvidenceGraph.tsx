import { useState, useMemo } from "react";
import {
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
} from "lucide-react";
import type { EvidenceGraphData, GraphNode } from "../../types/api";

interface EvidenceGraphProps {
  data: EvidenceGraphData;
  applicantName?: string | null;
  overallRisk?: number | null;
}

export function EvidenceGraph({ data, applicantName, overallRisk }: EvidenceGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Group nodes by category
  const personNode = useMemo(
    () =>
      data.nodes.find((n) => n.type === "person") || {
        id: "person-root",
        label: applicantName || "Identity Subject",
        type: "person" as const,
        status: (overallRisk && overallRisk >= 60
          ? "mismatch"
          : overallRisk && overallRisk >= 30
          ? "warning"
          : "verified") as any,
        value: `Risk: ${overallRisk ?? 0}/100`,
        confidence: 100,
      },
    [data.nodes, applicantName, overallRisk]
  );

  const documentNodes = useMemo(
    () => data.nodes.filter((n) => n.type === "document"),
    [data.nodes]
  );

  const fieldNodes = useMemo(
    () => data.nodes.filter((n) => n.type === "field"),
    [data.nodes]
  );

  const svgWidth = 840;
  const svgHeight = Math.max(380, Math.max(documentNodes.length, fieldNodes.length) * 85 + 60);

  const personPos = { x: 90, y: svgHeight / 2 };

  const docPositions = useMemo(() => {
    const spacing = svgHeight / (documentNodes.length + 1);
    return documentNodes.reduce<Record<string, { x: number; y: number }>>((acc, doc, idx) => {
      acc[doc.id] = { x: 340, y: spacing * (idx + 1) };
      return acc;
    }, {});
  }, [documentNodes, svgHeight]);

  const fieldPositions = useMemo(() => {
    const spacing = svgHeight / (fieldNodes.length + 1);
    return fieldNodes.reduce<Record<string, { x: number; y: number }>>((acc, field, idx) => {
      acc[field.id] = { x: 650, y: spacing * (idx + 1) };
      return acc;
    }, {});
  }, [fieldNodes, svgHeight]);

  // Determine active edge highlights
  const activeEdges = useMemo(() => {
    if (!hoveredNodeId && !selectedNode) return null;
    const targetId = hoveredNodeId || selectedNode?.id;
    return new Set(
      data.edges
        .filter((e) => e.source === targetId || e.target === targetId)
        .map((e) => `${e.source}->${e.target}`)
    );
  }, [hoveredNodeId, selectedNode, data.edges]);

  return (
    <div className="card overflow-hidden border border-slate-200/90  bg-slate-900/5  p-5 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80  pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
              <Layers size={14} />
            </span>
            <h3 className="text-sm font-bold text-foreground ">
              Identity Evidence Graph (Workflow Module 12)
            </h3>
            <span className="rounded-full bg-blue-50  px-2 py-0.5 text-[10px] font-bold text-blue-600  ring-1 ring-blue-500/30">
              Interactive Topology
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 ">
            Connects applicant identity to evidence scans and extracted attributes. Color-coded edges show multi-source agreement or conflict.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-600 ">
            <span className="h-2 w-2 rounded-full bg-emerald-500 " />
            <span>Consensus Match</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600 ">
            <span className="h-2 w-2 rounded-full bg-rose-500 " />
            <span>Discrepancy / Conflict</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-500 ">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Document Link</span>
          </div>
        </div>
      </div>

      {/* Main SVG Graph Container */}
      <div className="relative mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[760px] select-none"
          style={{ height: `${svgHeight}px` }}
        >
          <defs>
            <linearGradient id="grad-agree" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-conflict" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="grad-link" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
            </linearGradient>

            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Draw Edges: Person -> Documents */}
          {documentNodes.map((doc) => {
            const p1 = personPos;
            const p2 = docPositions[doc.id];
            if (!p2) return null;
            const edgeKey = `person-root->${doc.id}`;
            const isHighlighted = activeEdges ? activeEdges.has(edgeKey) : true;
            const cx1 = p1.x + (p2.x - p1.x) * 0.5;
            const cy1 = p1.y;
            const cx2 = p1.x + (p2.x - p1.x) * 0.5;
            const cy2 = p2.y;

            return (
              <path
                key={edgeKey}
                d={`M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`}
                fill="none"
                stroke="url(#grad-link)"
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeDasharray="4 3"
                opacity={isHighlighted ? 0.9 : 0.3}
                className="transition-all duration-300"
              />
            );
          })}

          {/* 2. Draw Edges: Documents -> Fields */}
          {data.edges
            .filter((e) => e.source !== "person-root")
            .map((edge) => {
              const p1 = docPositions[edge.source];
              const p2 = fieldPositions[edge.target];
              if (!p1 || !p2) return null;
              const edgeKey = `${edge.source}->${edge.target}`;
              const isConflict = edge.status === "conflict";
              const isHighlighted = activeEdges ? activeEdges.has(edgeKey) : true;

              const cx1 = p1.x + (p2.x - p1.x) * 0.45;
              const cy1 = p1.y;
              const cx2 = p1.x + (p2.x - p1.x) * 0.55;
              const cy2 = p2.y;

              return (
                <g key={edgeKey}>
                  <path
                    d={`M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke={isConflict ? "url(#grad-conflict)" : "url(#grad-agree)"}
                    strokeWidth={isHighlighted ? (isConflict ? 3 : 2.5) : isConflict ? 2 : 1}
                    opacity={isHighlighted ? 1 : 0.25}
                    filter={isConflict ? "url(#glow-rose)" : undefined}
                    className={`transition-all duration-300 ${isConflict ? "animate-pulse" : ""}`}
                  />
                  {isConflict && (
                    <circle
                      cx={(p1.x + p2.x) / 2}
                      cy={(p1.y + p2.y) / 2}
                      r={6}
                      fill="#e11d48"
                      stroke="#fff"
                      strokeWidth={1.5}
                      className="animate-ping"
                    />
                  )}
                </g>
              );
            })}

          {/* 3. Render Person Node (Root) */}
          <g
            transform={`translate(${personPos.x}, ${personPos.y})`}
            className="cursor-pointer group"
            onClick={() => setSelectedNode(personNode)}
            onMouseEnter={() => setHoveredNodeId(personNode.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            <circle
              r={36}
              className="fill-white  stroke-blue-500/80 transition-all duration-300 group-hover:stroke-blue-400 group-hover:scale-105"
              strokeWidth={3}
            />
            <foreignObject x={-28} y={-28} width={56} height={56}>
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                <User size={24} />
              </div>
            </foreignObject>
            <text
              y={52}
              textAnchor="middle"
              className="fill-slate-900  font-bold text-xs"
            >
              {personNode.label.length > 18 ? `${personNode.label.slice(0, 16)}…` : personNode.label}
            </text>
            <text
              y={67}
              textAnchor="middle"
              className="fill-slate-500  text-[10px] font-mono"
            >
              Subject Identity
            </text>
          </g>

          {/* 4. Render Document Nodes */}
          {documentNodes.map((doc) => {
            const pos = docPositions[doc.id];
            if (!pos) return null;
            const isHovered = hoveredNodeId === doc.id;
            const isSelected = selectedNode?.id === doc.id;

            return (
              <g
                key={doc.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(doc)}
                onMouseEnter={() => setHoveredNodeId(doc.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <rect
                  x={-85}
                  y={-22}
                  width={170}
                  height={44}
                  rx={10}
                  className={`transition-all duration-300 ${
                    isSelected || isHovered
                      ? "fill-blue-50  stroke-blue-500 stroke-2"
                      : "fill-white  stroke-slate-200  stroke-1 group-hover:stroke-blue-400"
                  }`}
                />
                <foreignObject x={-75} y={-14} width={28} height={28}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100  text-slate-600 ">
                    <FileText size={15} />
                  </div>
                </foreignObject>
                <text
                  x={-40}
                  y={-2}
                  className="fill-slate-900  font-bold text-xs"
                >
                  {doc.label}
                </text>
                <text
                  x={-40}
                  y={12}
                  className="fill-slate-400  text-[10px] font-medium"
                >
                  {doc.confidence ? `${Math.round(doc.confidence)}% conf.` : "Verified scan"}
                </text>
              </g>
            );
          })}

          {/* 5. Render Field Nodes */}
          {fieldNodes.map((field) => {
            const pos = fieldPositions[field.id];
            if (!pos) return null;
            const isConflict = field.status === "mismatch";
            const isHovered = hoveredNodeId === field.id;
            const isSelected = selectedNode?.id === field.id;

            return (
              <g
                key={field.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(field)}
                onMouseEnter={() => setHoveredNodeId(field.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <rect
                  x={-90}
                  y={-22}
                  width={180}
                  height={44}
                  rx={10}
                  className={`transition-all duration-300 ${
                    isConflict
                      ? "fill-rose-50/90  stroke-rose-500 stroke-2"
                      : isSelected || isHovered
                      ? "fill-emerald-50  stroke-emerald-500 stroke-2"
                      : "fill-white  stroke-slate-200  stroke-1 group-hover:stroke-emerald-400"
                  }`}
                />
                <foreignObject x={-80} y={-14} width={28} height={28}>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isConflict
                        ? "bg-rose-100  text-rose-600 "
                        : "bg-emerald-100  text-emerald-600 "
                    }`}
                  >
                    {isConflict ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                  </div>
                </foreignObject>
                <text
                  x={-45}
                  y={-2}
                  className="fill-slate-900  font-bold text-xs"
                >
                  {field.label.split(":")[0]}
                </text>
                <text
                  x={-45}
                  y={12}
                  className={`text-[10px] font-mono font-bold ${
                    isConflict ? "fill-rose-600 " : "fill-emerald-600 "
                  }`}
                >
                  {field.value && field.value.length > 16 ? `${field.value.slice(0, 14)}…` : field.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-4 rounded-xl border border-slate-200/90  bg-white  p-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50  text-blue-600 ">
                <Info size={16} />
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 ">
                  Node Details: {selectedNode.label}
                </h4>
                <p className="text-[11px] text-slate-500 capitalize">
                  Type: {selectedNode.type} · Status: {selectedNode.status}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 "
            >
              Close
            </button>
          </div>
          {selectedNode.details && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(selectedNode.details).map(([key, val]) => (
                <div key={key} className="rounded-lg bg-slate-50  p-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{key.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-800  truncate block">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
