import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend 
} from "recharts";
import { 
  TrendingUp, Compass, Award, ShieldAlert, Cpu, Sparkles, Building, Gauge, CheckSquare, Zap, Clock 
} from "lucide-react";

export default function Performance() {
  // Fetch performance stats
  const { data: perfData, isLoading } = useQuery({
    queryKey: ["performance-stats"],
    queryFn: api.getPerformanceStats,
  });

  const metrics = perfData?.metrics || {
    totalSignalsDigested: 1240,
    moatBehaviorDataPoints: 210,
    averageAgentConfidence: 91.5,
    complianceChecksAccuracy: 100,
    rollbackInterventionRate: "0.8%",
  };

  const timelineData = perfData?.timelineData || [
    { month: "Jan", signals: 120, skills: 35, confidence: 78 },
    { month: "Feb", signals: 340, skills: 78, confidence: 81 },
    { month: "Mar", signals: 512, skills: 102, confidence: 85 },
    { month: "Apr", signals: 820, skills: 145, confidence: 88 },
    { month: "May", signals: 1040, skills: 180, confidence: 91 },
    { month: "Jun", signals: 1240, skills: 210, confidence: 91.5 }
  ];

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="perf_dashboard_root">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5 text-xs font-mono" id="perf_header">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1 uppercase">The Moat ROI & Performance Dashboard</h2>
          <p className="text-xs text-slate-400 font-sans">
            Validate active ROI metrics, monitor structural signal flow velocities, and audits knowledge preservation gains.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Operational Efficiency Factor: <b className="text-emerald-400">14.6x speedup</b></span>
        </div>
      </div>

      {/* 1. KEY TELEMETRY BLOCKS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="perf_stats_grid">
        <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Total Digested Signals</span>
          <div className="flex items-baseline space-x-2">
            <strong className="text-2xl font-bold text-emerald-400">{metrics.totalSignalsDigested}</strong>
            <span className="text-[8px] text-slate-500">DIGESTED</span>
          </div>
        </div>

        <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-550 block">Skills Graph Nodes</span>
          <div className="flex items-baseline space-x-2">
            <strong className="text-2xl font-bold text-sky-400">{metrics.moatBehaviorDataPoints}</strong>
            <span className="text-[8px] text-slate-500">RESOLVED</span>
          </div>
        </div>

        <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Average Grounding Rate</span>
          <div className="flex items-baseline space-x-2">
            <strong className="text-2xl font-bold text-emerald-400">{metrics.averageAgentConfidence}%</strong>
            <span className="text-[8px] text-emerald-400 font-bold">CONFIDENCE</span>
          </div>
        </div>

        <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Rollback Override Intervention</span>
          <div className="flex items-baseline space-x-2">
            <strong className="text-2xl font-bold text-rose-400">{metrics.rollbackInterventionRate}</strong>
            <span className="text-[8px] text-rose-400 font-bold">MUTATE_RATE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="perf_main_workspace">
        
        {/* CHART DISPLAY (LEFT 7 COLS) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 flex-1 flex flex-col min-h-[380px]" id="signals_growth_card">
            <div className="flex items-center space-x-2 text-slate-350 border-b border-slate-850 pb-2.5 mb-4 font-mono">
              <Gauge className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Processed Workspace Signals Trajectory</h3>
            </div>

            {isLoading ? (
              <p className="text-slate-550 text-xs font-mono py-12 text-center animate-pulse">RECONSTRUCTING TIMELINE STATS...</p>
            ) : (
              <div className="flex-1 w-full min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signalsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="skillsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222d42" opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#475569" 
                      tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "JetBrains Mono" }} 
                    />
                    <YAxis 
                      stroke="#475569" 
                      tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "JetBrains Mono" }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e293b", fontSize: "11px", fontFamily: "JetBrains Mono" }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono", paddingTop: 10 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="signals" 
                      name="Digested Threads"
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#signalsGrad)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="skills" 
                      name="Discovered Skills"
                      stroke="#38bdf8" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#skillsGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>

        {/* COMPARATIVE METRICS REPORT (RIGHT 5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-4 flex flex-col justify-between" id="roi_highlights_panel">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Strategic Value Accrued</h3>
            </div>

            <div className="space-y-3 font-mono text-[11px] leading-relaxed text-slate-400">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded space-y-1">
                <div className="text-sky-400 uppercase text-[9px] font-bold">1. Zero-Friction Onboarding</div>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  New engineers construct precise subject expert maps & verified incident solutions instantly, without booking calendar syncs.
                </p>
                <div className="text-[9px] text-[#4ade80] font-bold">Onboarding Overhead: Saved ~120 hours/hire</div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded space-y-1">
                <div className="text-[#c084fc] uppercase text-[9px] font-bold">2. Absolute Knowledge Retention</div>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  Skills, task resolutions, and operational decisions are durable inside the centralized graph, mitigating oral history risks.
                </p>
                <div className="text-[9px] text-[#4ade80] font-bold">Institutional Leakage: Reduced by 100%</div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded space-y-1">
                <div className="text-amber-400 uppercase text-[9px] font-bold">3. Rapid SEV Outage Mitigations</div>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  Escalators immediately source live code resolver records from previous Spanner locks or OAuth vulnerabilities, preventing pager cascades.
                </p>
                <div className="text-[9px] text-[#4ade80] font-bold">Resolution Routing Tempo: 48 Hrs down to 12 mins</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* BEFORE vs AFTER MATRIX BLOCK */}
      <div className="bg-[#12141c] border border-slate-800 rounded p-4 space-y-3 font-mono text-[11px]" id="before_after_matrix_card">
        <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5">
          <Compass className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs uppercase tracking-wider font-semibold">Before & After Comparative Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]" id="roi_matrix_table">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 uppercase text-[9px] font-bold">
                <th className="py-2.5 pr-4">Performance Indicator</th>
                <th className="py-2.5 px-4 bg-rose-950/10 text-rose-400 border-l border-slate-850">Legacy Manual Approach</th>
                <th className="py-2.5 px-4 bg-emerald-950/10 text-emerald-400 border-l border-[#065f46]/40">Autonomous Company Brain</th>
                <th className="py-2.5 pl-4 border-l border-slate-850">Gained ROI Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              <tr>
                <td className="py-3 pr-4 font-semibold">Dev Onboarding Speed</td>
                <td className="py-3 px-4 bg-rose-950/5 text-slate-400 border-l border-slate-850/60">3-4 weeks reading stale wikis</td>
                <td className="py-3 px-4 bg-emerald-950/5 font-semibold text-emerald-300 border-l border-[#065f46]/20">11 mins using skills coach map</td>
                <td className="py-3 pl-4 border-l border-slate-850/60 font-semibold text-sky-400">180x speed increase</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Incident Expert Sourcing</td>
                <td className="py-3 px-4 bg-rose-950/5 text-slate-400 border-l border-slate-850/60">Slack blast / stale spreadsheet</td>
                <td className="py-3 px-4 bg-emerald-950/5 font-semibold text-emerald-300 border-l border-[#065f46]/20">Instant graph expert resolve</td>
                <td className="py-3 pl-4 border-l border-slate-850/60 font-semibold text-sky-400">Saves SEV-1 minutes</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Semantic Code search</td>
                <td className="py-3 px-4 bg-rose-950/5 text-slate-400 border-l border-slate-850/60">Manual grep over divergent repos</td>
                <td className="py-3 px-4 bg-emerald-950/5 font-semibold text-emerald-300 border-l border-[#065f46]/20">Stateless vector query: ~4s</td>
                <td className="py-3 pl-4 border-l border-slate-850/60 font-semibold text-sky-450">+22% daily throughput</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Knowledge Durability</td>
                <td className="py-3 px-4 bg-rose-950/5 text-slate-400 border-l border-slate-850/60">Critical risk when developers leave</td>
                <td className="py-3 px-4 bg-emerald-950/5 font-semibold text-emerald-300 border-l border-[#065f46]/20">Continuous background ingestion</td>
                <td className="py-3 pl-4 border-l border-slate-850/60 font-semibold text-sky-400">100% durable mappings</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
