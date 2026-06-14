import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useStore } from "../store";
import { useWebSocketSignals } from "../lib/websocket";
import { 
  Network, Shield, UploadCloud, Info, Database, Cpu, 
  Settings, Users, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, Play, Search, Link2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as d3 from "d3";
import { GraphNode, GraphEdge } from "../types";

// Artifacts templates for fast ingestion
const INGEST_TEMPLATES = [
  {
    title: "Checkout Spanner Incident Report",
    source: "Incident Drive Files",
    text: `During peak load on Checkout Service, Elena Vance found severe lock contentions in Spanner tables.
Elena implemented a write-through cache schema that drastically reduced transaction locks.
Aria Kulkarni validated this database update for future container scale configurations.`,
    user: "elena.vance@company.com"
  },
  {
    title: "Auth Gateway Audit Notes",
    source: "Slack Auth-Audit Room",
    text: `[Authentication Security Review]
Devon Chen patched serious CORS vulnerabilities inside the central API routing gateway.
We resolved this incident by adopting GCP KMS Envelope Encryption routines on user metadata profiles.
This policy was registered as Decision KMS Ring Security, with compliance reviews required from Marcus Young.`,
    user: "devon.chen@company.com"
  }
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Enable web socket feed
  const { isConnected } = useWebSocketSignals();

  const signalsFeed = useStore((state) => state.signalsFeed);
  const clearFeed = useStore((state) => state.clearFeed);

  // Form states for manual ingestion
  const [ingestText, setIngestText] = useState("");
  const [ingestSource, setIngestSource] = useState("Developer Work Logs");
  const [ingestUser, setIngestUser] = useState("elena.vance@company.com");
  const [retentionDays, setRetentionDays] = useState(365);
  const [consentChecked, setConsentChecked] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Search filter for nodes
  const [filterQuery, setFilterQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Fetch Graph
  const { data: graphData, isLoading: isGraphLoading } = useQuery({
    queryKey: ["graph"],
    queryFn: api.getGraph,
  });

  // Fetch performance stats
  const { data: perfData } = useQuery({
    queryKey: ["performance-stats"],
    queryFn: api.getPerformanceStats,
  });

  // Ingestion mutation
  const ingestMutation = useMutation({
    mutationFn: api.ingestArtifact,
    onSuccess: (res) => {
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["graph"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["performance-stats"] });
      
      // Clear form
      setIngestText("");
    }
  });

  // D3 force-directed canvas ref
  const d3Container = useRef<SVGSVGElement | null>(null);

  // Handle D3 simulation lifecycle
  useEffect(() => {
    if (!graphData || !d3Container.current) return;

    // Clear previous elements
    d3.select(d3Container.current).selectAll("*").remove();

    const svg = d3.select(d3Container.current);
    const width = d3Container.current.clientWidth || 800;
    const height = d3Container.current.clientHeight || 450;

    // Create deep copies to prevent mutation issues with D3 simulation
    const nodes: any[] = graphData.nodes.map(n => ({ ...n }));
    const links: any[] = graphData.edges.map(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      return {
        id: e.id,
        source: sourceNode ? sourceNode.id : e.source,
        target: targetNode ? targetNode.id : e.target,
        type: e.type,
        label: e.label,
      };
    }).filter(link => 
      nodes.some(n => n.id === link.source) && 
      nodes.some(n => n.id === link.target)
    );

    // Filter nodes/links based on search queries
    let filteredNodes = nodes;
    if (typeFilter !== "All") {
      filteredNodes = nodes.filter(n => n.type === typeFilter);
    }
    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n => 
        n.label.toLowerCase().includes(query) || 
        n.description.toLowerCase().includes(query)
      );
    }

    const filteredLinkIds = new Set();
    const filteredLinks = links.filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      const keep = filteredNodes.some(n => n.id === srcId) && filteredNodes.some(n => n.id === tgtId);
      if (keep) {
        filteredLinkIds.add(l.id);
      }
      return keep;
    });

    const forceNodeMap = new Map(filteredNodes.map(n => [n.id, n]));

    // Configure simulation
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(35));

    // Links container group
    const linkGroup = svg.append("g")
      .attr("stroke", "#1e293b")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    // Link elements
    const link = linkGroup.selectAll("line")
      .data(filteredLinks)
      .enter()
      .append("line")
      .attr("id", (d: any) => `link-${d.id}`);

    // Nodes container group
    const nodeGroup = svg.append("g");

    // Drag helper
    function drag(simulation: any) {
      function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Node colors map based on enterprise theme specs
    const colorMap: Record<string, string> = {
      Person: "#38bdf8", // Blue
      Skill: "#4ade80",  // Green
      Task: "#fb7185",   // Peach/red
      Document: "#c084fc", // Slate purple
      Decision: "#facc15", // Amber
      Project: "#818cf8"  // Indigo
    };

    // Node items
    const node = nodeGroup.selectAll("g")
      .data(filteredNodes)
      .enter()
      .append("g")
      .call(drag(simulation) as any)
      .on("click", (event, d: any) => {
        setSelectedNodeId(d.id);
        if (d.type === "Person") {
          // Double-click or selection prompt can let them jump to Skills File page
        }
      });

    // Node background circle
    node.append("circle")
      .attr("r", (d: any) => d.id === selectedNodeId ? 14 : 9)
      .attr("fill", (d: any) => colorMap[d.type] || "#ffffff")
      .attr("stroke", "#0f1117")
      .attr("stroke-width", 2)
      .attr("class", "cursor-pointer hover:scale-125 transition-transform duration-200");

    // Text labels
    node.append("text")
      .attr("dy", "1.5em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.label)
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono")
      .attr("class", "pointer-events-none select-none select-none-all");

    // Dynamic tick updates
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, selectedNodeId, filterQuery, typeFilter]);

  const stats = perfData?.metrics || {
    totalSignalsDigested: 1240,
    moatBehaviorDataPoints: 210,
    averageAgentConfidence: 91.5,
    complianceChecksAccuracy: 100,
  };

  const selectedNode = graphData?.nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="cm_dashboard_root">
      
      {/* 1. TOP DENSE METRICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-#161922 border border-slate-800 p-4 rounded" id="cm_metrics_strip">
        <div className="flex flex-col space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Signals Digested</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-semibold text-emerald-400">{stats.totalSignalsDigested}</span>
            <span className="text-[9px] font-mono text-slate-500">INGESTED</span>
          </div>
        </div>

        <div className="flex flex-col space-y-1 border-l border-slate-850 pl-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Behavior Data Points</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-semibold text-sky-450">{stats.moatBehaviorDataPoints}</span>
            <span className="text-[9px] font-mono text-slate-500">NODES+EDGES</span>
          </div>
        </div>

        <div className="flex flex-col space-y-1 border-l border-slate-850 pl-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Knowledge Match Accuracy</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-semibold text-amber-400">{stats.averageAgentConfidence}%</span>
            <span className="text-[9px] font-mono text-slate-500">CONFIDENCE</span>
          </div>
        </div>

        <div className="flex flex-col space-y-1 border-l border-slate-850 pl-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Compliance Checks</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-semibold text-emerald-400">100%</span>
            <span className="text-[9px] font-mono text-slate-500">PII SHIELD</span>
          </div>
        </div>
      </div>

      {/* 2. CHANNELS STATUS / SYSTEM NOTIFIER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 border border-slate-800/80 px-4 py-2 text-xs font-mono text-slate-400 rounded">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Signals Daemon: <b className="text-emerald-400">CONNECTING...</b></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>AES-256 PII Filtration: <b className="text-emerald-400">ENFORCED</b></span>
          </div>
        </div>
        <div className="text-slate-500 text-[11px]">
          UTC Ref: <span className="text-indigo-400">2026-06-14 10:00:14</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard_grid_main">
        
        {/* LEFT 7 PANELS: GRAPH VISUALIZATION & INGESTION */}
        <div className="lg:col-span-8 space-y-5 flex flex-col">
          
          {/* A. FORCE DIRECTED NETWORK VIEW */}
          <div className="bg-[#12141c] border border-slate-800 rounded flex flex-col h-[524px] relative" id="d3_network_card">
            <div className="flex items-center justify-between border-b border-slate-850 px-4 py-3">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4 text-sky-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-300">Live Enterprise Skills Network</h3>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Filter nodes..." 
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-[11px] font-mono px-2 py-1 rounded w-36 focus:outline-none focus:border-slate-700"
                />
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-[11px] font-mono px-2 py-1 rounded text-slate-400"
                >
                  <option value="All">All Types</option>
                  <option value="Person">Person</option>
                  <option value="Skill">Skill</option>
                  <option value="Task">Task</option>
                  <option value="Document">Document</option>
                  <option value="Decision">Decision</option>
                  <option value="Project">Project</option>
                </select>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 min-h-[300px] relative">
              <svg 
                ref={d3Container} 
                className="w-full h-full block" 
              />
              {isGraphLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 font-mono text-xs">
                  COMPY_BRAIN: COMPILING GRAPHS...
                </div>
              )}
              
              {/* Legend Block */}
              <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-850 p-2.5 rounded font-mono text-[9px] text-slate-400 space-y-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                  <span>Person</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
                  <span>Skill</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#fb7185]"></span>
                  <span>Task</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c084fc]"></span>
                  <span>Document</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#facc15]"></span>
                  <span>Decision</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#818cf8]"></span>
                  <span>Project</span>
                </div>
              </div>

              {/* Dynamic Focus Inspector overlay */}
              {selectedNode && (
                <div className="absolute right-3 bottom-3 w-64 bg-slate-950/95 border border-slate-800 p-3 rounded text-[11px] font-mono space-y-2 max-h-56 overflow-y-auto shadow-2xl">
                  <div className="flex justify-between items-center text-[10px] uppercase text-sky-400 border-b border-slate-850 pb-1">
                    <span>{selectedNode.type} Node Info</span>
                    <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-slate-300">×</button>
                  </div>
                  <div className="font-semibold text-slate-200 text-xs">{selectedNode.label}</div>
                  <div className="text-slate-400 leading-relaxed">{selectedNode.description}</div>
                  {selectedNode.metadata && (
                    <div className="text-slate-500 bg-slate-900 border border-slate-850 p-1.5 rounded text-[10px] leading-snug">
                      {selectedNode.metadata}
                    </div>
                  )}
                  {selectedNode.type === "Person" && (
                    <Link
                      to={`/skills-file/${selectedNode.id}`}
                      className="inline-flex items-center text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline gap-1 pt-1 font-semibold"
                    >
                      OPEN INDIVIDUAL SKILLS FILE <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* B. INGESTION ENGINE WIDGET */}
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-4" id="ingest_console_panel">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-300">Real-time Artifact Ingestion Console</h4>
              </div>
              <div className="flex space-x-2">
                {INGEST_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIngestText(tmpl.text);
                      setIngestSource(tmpl.source);
                      setIngestUser(tmpl.user);
                    }}
                    className="border border-slate-800 hover:border-slate-700 bg-slate-950 text-[10px] px-2 py-1 text-slate-400 hover:text-slate-300 rounded"
                  >
                    Load Template {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!ingestText.trim()) return;
                ingestMutation.mutate({
                  text: ingestText,
                  source: ingestSource,
                  user: ingestUser,
                  consentChecked,
                  retentionDays
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-slate-500">Resource Source / Origin</label>
                  <input
                    type="text"
                    value={ingestSource}
                    onChange={(e) => setIngestSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-slate-700"
                    placeholder="e.g. Slack audit-trail #22"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-slate-500">Operator Address</label>
                  <input
                    type="email"
                    value={ingestUser}
                    onChange={(e) => setIngestUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-slate-700"
                    placeholder="SME email"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] uppercase text-slate-500">Rentention Period</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-800 text-xs py-1.5 px-2.5 rounded w-full focus:outline-none text-slate-250"
                    >
                      <option value={90}>90 Days (Transient)</option>
                      <option value={180}>180 Days (Midterm)</option>
                      <option value={365}>365 Days (Enforced)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-slate-500">Raw Artifact Body (Unstructured Text, Emails, Code Logs)</label>
                <textarea
                  rows={4}
                  value={ingestText}
                  onChange={(e) => setIngestText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-slate-700 font-normal leading-relaxed"
                  placeholder="Paste organizational conversations, reports, playbooks here..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/80 border border-slate-850 p-3 rounded">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="rounded border-slate-800 text-sky-500 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Enforce enterprise security scrub & sanitization algorithms</span>
                </label>

                <button
                  type="submit"
                  disabled={ingestMutation.isPending || !ingestText.trim()}
                  className="flex items-center justify-center space-x-2 bg-[#10b981] hover:bg-[#059669] text-black font-semibold px-4 py-1.5 text-xs rounded transition-all duration-150 disabled:opacity-40"
                >
                  {ingestMutation.isPending ? (
                    <>
                      <span>EXTRACTING RELATIONSHIPS...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>INGEST TO COMPANY BRAIN DB</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Ingestion results feedback display */}
            <AnimatePresence>
              {ingestMutation.data && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-950/30 border border-emerald-900/60 rounded p-3 text-xs space-y-2"
                >
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>INGESTION PROTOCOL COMPLETE: RESOLVED RELATIONSHIPS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-emerald-900/40 pt-2 text-slate-300">
                    <div>
                      Audit Code: <span className="text-emerald-400 font-mono">{ingestMutation.data.auditLog.id}</span>
                    </div>
                    <div>
                      PII Scrub Status: <span className={ingestMutation.data.auditLog.piiDetected ? "text-amber-400 font-bold" : "text-emerald-500 font-mono"}>
                        {ingestMutation.data.auditLog.piiDetected ? `Masked ${ingestMutation.data.auditLog.piiCount} entries` : "Clean, No PII"}
                      </span>
                    </div>
                    <div>
                      Graph Updates: <span className="text-emerald-400 font-mono">
                        +{ingestMutation.data.addedNodes.length} nodes, +{ingestMutation.data.addedEdges.length} edges
                      </span>
                    </div>
                    <div>
                      Total Size: <span className="text-indigo-400 font-mono">{ingestMutation.data.auditLog.byteSize} bytes</span>
                    </div>
                  </div>
                  {ingestMutation.data.maskedText && (
                    <div className="bg-slate-950 p-2 border border-slate-900 rounded font-mono text-[9px] text-slate-400 max-h-24 overflow-y-auto leading-relaxed">
                      <b className="text-[8px] uppercase tracking-wider text-slate-500 block mb-1">PII-Sanitized Payload:</b>
                      {ingestMutation.data.maskedText}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* RIGHT 5 PANELS: REAL-TIME SYSTEM TRACES TICKER */}
        <div className="lg:col-span-4 space-y-5 flex flex-col">
          
          <div className="bg-[#12141c] border border-slate-800 rounded flex flex-col h-[766px]" id="ws_ticker_panel">
            
            <div className="flex items-center justify-between border-b border-slate-850 px-4 py-3">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-300">Vigilance Center: Signal Stream</h3>
              </div>
              <button 
                onClick={clearFeed}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 underline"
              >
                Clear Stream
              </button>
            </div>

            <div className="p-3 bg-slate-950 border-b border-slate-850">
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                Continuous trace capture linked on WebSocket <code>/ws/signals</code>. Emits real-time organization knowledge state transitions.
              </p>
            </div>

            {/* Ingestion stream logs list */}
            <div className="flex-1 overflow-y-auto font-mono text-[11px] p-4 space-y-4 max-h-[590px]">
              {signalsFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-600 h-full py-16 space-y-2">
                  <Database className="w-8 h-8 text-slate-750 stroke-[1.5]" />
                  <span className="text-[10px] uppercase">Telemetry pipe listening...</span>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {signalsFeed.map((sig) => {
                    // Type-specific colors
                    const styleMap = {
                      success: { text: "text-emerald-400", border: "border-emerald-950/60 bg-emerald-950/10", tag: "SUCCESS" },
                      info: { text: "text-sky-400", border: "border-sky-950/60 bg-sky-950/10", tag: "INFO" },
                      warning: { text: "text-amber-400", border: "border-amber-950/60 bg-amber-950/10", tag: "WARNING" },
                      error: { text: "text-rose-400", border: "border-rose-950/60 bg-rose-950/10", tag: "CRITICAL" }
                    };
                    const mode = styleMap[sig.type] || styleMap.info;

                    return (
                      <motion.div
                        key={sig.id}
                        initial={{ opacity: 0, x: -10, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`p-3 border rounded ${mode.border} space-y-1.5`}
                      >
                        <div className="flex items-center justify-between text-[9px] border-b border-slate-850/40 pb-1 text-slate-500">
                          <div className="flex items-center space-x-1.5">
                            <span className={`font-semibold ${mode.text}`}>[{mode.tag}]</span>
                            <span>{sig.emitter}</span>
                          </div>
                          <span>{new Date(sig.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300 leading-snug break-all">{sig.message}</p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
