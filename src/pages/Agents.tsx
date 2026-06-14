import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  Cpu, Play, RotateCcw, ShieldAlert, Sparkles, CheckCircle2, Info, ArrowRight, CornerDownRight, ThumbsUp, AlertTriangle, AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  gradient: string;
  badgeClass: string;
  description: string;
  sampleQueries: string[];
}

const CONFIGURED_AGENTS: AgentConfig[] = [
  {
    id: "agent_onboarding",
    name: "Onboarding Advisor",
    role: "Onboarding Coach",
    gradient: "from-purple-500 to-indigo-600",
    badgeClass: "border-purple-500/20 text-purple-400 bg-purple-950/10",
    description: "Digests general employee onboarding goals, examines the company Skills Graph, and provides detailed checklists, playbooks, and subject matter experts to query.",
    sampleQueries: [
      "Suggest a list of internal documentation and team subject-matter experts for a new engineer working on Spanner Lock problems.",
      "What are the primary files and engineering contacts I should study first for Project Helios?"
    ]
  },
  {
    id: "agent_resolution",
    name: "Incident Escalator",
    role: "SecOps Router",
    gradient: "from-rose-500 to-red-600",
    badgeClass: "border-rose-500/20 text-rose-400 bg-rose-950/10",
    description: "Resolves ongoing operational outages by identifying which engineers have historically resolved identical issues, allocating emergency responders, and formulating rollbacks.",
    sampleQueries: [
      "Analyze context and suggest the most experienced security expert to route high-severity alerts regarding CORS or encryption keys.",
      "A SEV-1 lock timeout popped up in client Spanner replicas. Identify which engineer has active experience resolving similar issues and which runbook to follow."
    ]
  },
  {
    id: "agent_proposal",
    name: "RFP / Proposal Writer",
    role: "Sales & Strategic Copilot",
    gradient: "from-amber-500 to-orange-600",
    badgeClass: "border-amber-500/20 text-amber-400 bg-amber-950/10",
    description: "Synthesizes institutional technical bids, security questionnaires, and RFPs by matching criteria to the company's past solutions, compliance policies, and actual staff.",
    sampleQueries: [
      "Draft a 2-paragraph technical proposal showcasing how we manage secure data encryption for institutional clients, referencing our architectural policies.",
      "Write a project outline detailing how we implement scalable backend routing with AI integration, highlighting our active initiatives and skilled experts."
    ]
  }
];

export default function Agents() {
  const queryClient = useQueryClient();

  // Selected agent state
  const [selectedAgentId, setSelectedAgentId] = useState("agent_onboarding");
  const [agentPrompt, setAgentPrompt] = useState(CONFIGURED_AGENTS[0].sampleQueries[0]);
  const [runnerUser, setRunnerUser] = useState("lead.architect@company.com");
  const [isRunning, setIsRunning] = useState(false);

  // Fetch past execution logs
  const { data: agentData, isLoading: isLogsLoading } = useQuery({
    queryKey: ["agent-logs"],
    queryFn: api.getAgentLogs,
  });

  // Run Agent mutation
  const runMutation = useMutation({
    mutationFn: api.runAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-logs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setIsRunning(false);
    },
    onError: () => {
      setIsRunning(false);
    }
  });

  // Rollback Action mutation
  const rollbackMutation = useMutation({
    mutationFn: api.rollbackAgentAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-logs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    }
  });

  const activeAgent = CONFIGURED_AGENTS.find(a => a.id === selectedAgentId) || CONFIGURED_AGENTS[0];

  const handleRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt.trim()) return;
    setIsRunning(true);
    runMutation.mutate({
      agentId: selectedAgentId,
      instruction: agentPrompt,
      user: runnerUser || "coordinator@company.com"
    });
  };

  const handleRollback = (logId: string) => {
    rollbackMutation.mutate(logId);
  };

  const pastLogs = agentData?.agentLogs || [];

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="agent_control_root">
      
      {/* HEADER CARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5" id="agent_header">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1 uppercase">Agent Control Room</h2>
          <p className="text-xs text-slate-400">
            Provision agents, run context-grounded reasoning, and verify rollback logs.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500">Autonomous status:</span>
          <span className="text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded">ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="agent_workspace_layout">
        
        {/* AGENTS CONFIGURATION PANEL (LEFT 5 COLS) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          
          {/* I. SELECT AGENT BAR */}
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 space-y-3" id="agent_select_panel">
            <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-300 border-b border-slate-850 pb-2">
              Select Operating Routine
            </h3>
            <div className="space-y-2">
              {CONFIGURED_AGENTS.map((agent) => {
                const isSelected = agent.id === selectedAgentId;
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      setAgentPrompt(agent.sampleQueries[0]);
                    }}
                    className={`w-full text-left p-3 rounded border transition-all duration-150 font-mono text-xs flex justify-between items-center ${
                      isSelected 
                        ? "bg-slate-950 border-slate-700 font-bold" 
                        : "bg-slate-950/40 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-slate-200">{agent.name}</span>
                      <span className="text-[9px] text-slate-500 block">{agent.role}</span>
                    </div>
                    {isSelected && (
                      <span className="bg-sky-950 border border-sky-900 text-sky-400 px-1.5 py-0.2 rounded font-bold text-[8px] uppercase">
                        ACTIVE CODE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* II. CURRENT PROMPT CONSOLE */}
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 flex-1 flex flex-col justify-between" id="agent_console">
            <div className="font-mono text-[11px] text-slate-400 leading-relaxed space-y-3">
              <div className="border-b border-slate-850 pb-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Core Persona Guidelines</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{activeAgent.description}</p>
              
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sample Queries / Directives</span>
                <div className="space-y-1.5">
                  {activeAgent.sampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setAgentPrompt(query)}
                      className="w-full text-left p-2 border border-slate-850 hover:border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-[10px] rounded leading-snug font-normal text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleRunSubmit} className="space-y-3 pt-4 border-t border-slate-850 mt-4">
              <div className="space-y-1 font-mono">
                <label className="text-[9px] uppercase text-slate-500">Executing User Operator</label>
                <input
                  type="email"
                  value={runnerUser}
                  onChange={(e) => setRunnerUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-slate-700"
                  required
                />
              </div>

              <div className="space-y-1 font-mono">
                <label className="text-[9px] uppercase text-slate-500">Execution Prompt Instruction</label>
                <textarea
                  rows={3}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono leading-relaxed"
                  placeholder="Summarize or instruct task objectives..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRunning || !agentPrompt.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold font-mono text-xs py-2 rounded transition-colors disabled:opacity-40 select-none"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? "DIALECTING SUB-AGENTS..." : "COMMENCE AGENT RUN"}</span>
              </button>
            </form>
          </div>

        </div>

        {/* TRACES LOGS TIMELINE (RIGHT 7 COLS) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 flex-1 flex flex-col" id="agent_traces_panel">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5 mb-3 font-mono">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Active Agent Execution Traces</h3>
            </div>

            {isLogsLoading ? (
              <p className="text-slate-500 text-xs font-mono py-8 text-center animate-pulse">RECOMPILING CONSOLE HISTORIES...</p>
            ) : pastLogs.length === 0 ? (
              <p className="text-slate-500 text-xs font-mono py-8">No agent runtime transactions have been compiled yet.</p>
            ) : (
              <div className="space-y-4 max-h-[660px] overflow-y-auto pr-1">
                {pastLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 bg-slate-950/60 border rounded font-mono space-y-3 relative overflow-hidden ${
                      log.isRolledBack ? "border-rose-950 opacity-60" : "border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between text-[10px] text-slate-500 border-b border-slate-850 pb-1.5 flex-wrap gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-indigo-400 font-semibold uppercase">[{log.agentName}]</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">ID: {log.id}</span>
                    </div>

                    {/* Strikethrough cover if system is revoked / rolled back */}
                    {log.isRolledBack && (
                      <div className="absolute top-2 right-2 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded text-[8px] font-bold text-rose-400 uppercase select-none tracking-wider">
                        SECURE REVOKED / ROLLBACK ACTIVE
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 block">Prompt Instructed:</span>
                      <p className="text-slate-350 text-xs font-semibold leading-snug">{log.taskPrompt}</p>
                    </div>

                    <div className="space-y-1 p-2.5 bg-slate-950 border border-slate-850 rounded">
                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">Grounded Decision Output:</span>
                      <p className={`text-xs text-slate-250 leading-relaxed font-normal whitespace-pre-wrap ${log.isRolledBack ? "line-through text-slate-500" : ""}`}>
                        {log.decision}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-normal">
                      <div>
                        Trigged Operator: <span className="text-slate-300">{log.userTriggered}</span>
                      </div>
                      <div>
                        Model Confidence Grade: <span className="text-emerald-400 font-bold font-mono">{log.confidence}%</span>
                      </div>
                    </div>

                    <div className="space-y-1 font-mono text-[10px]">
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 block">Consulted Graph Nodes:</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {log.consultedNodes.map((nodeId, i) => (
                          <span key={i} className="bg-slate-900 border border-slate-850 text-slate-400 text-[9px] px-2 py-0.5 rounded">
                            {nodeId}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-sky-950/20 border border-sky-900/40 p-2 rounded text-[10px] leading-snug text-slate-400">
                      <div className="font-semibold text-sky-450 border-b border-sky-950/40 pb-0.5 mb-1 text-[8px]">MODEL REASONING CHAIN</div>
                      {log.reasoning}
                    </div>

                    {!log.isRolledBack && (
                      <div className="flex justify-end pt-1 border-t border-slate-850/40">
                        <button
                          onClick={() => handleRollback(log.id)}
                          disabled={rollbackMutation.isPending}
                          className="flex items-center space-x-1 border border-rose-900/60 bg-rose-950/20 hover:bg-rose-950 text-rose-400 hover:text-rose-350 font-bold text-[9px] px-2.5 py-1 rounded transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>REVOKE & ROLLBACK STATE</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
