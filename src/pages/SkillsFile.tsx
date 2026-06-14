import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from "recharts";
import { 
  User, Briefcase, Calendar, ShieldCheck, Cpu, ArrowLeft, BarChart2, CheckSquare, Users, Sparkles, AlertTriangle 
} from "lucide-react";
import { motion } from "motion/react";

export default function SkillsFile() {
  const { person_id } = useParams<{ person_id: string }>();
  const navigate = useNavigate();

  // Selected evaluation task category
  const [evalCategory, setEvalCategory] = useState("Spanner");

  // Fetch individual's file
  const { data: fileData, isLoading, error } = useQuery({
    queryKey: ["skills-file", person_id],
    queryFn: () => api.getSkillsFile(person_id || ""),
    enabled: !!person_id,
  });

  // Evaluate Custom task delegation suitability
  const { data: readinessData, isFetching: isEvalFetching } = useQuery({
    queryKey: ["agent-readiness", evalCategory],
    queryFn: () => api.getAgentReadiness(evalCategory),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono text-xs space-y-3">
        <Sparkles className="w-5 h-5 text-sky-400 animate-spin" />
        <span>COMPILING PERSONNEL SKILLS FILE ON CHAIN...</span>
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="bg-rose-950/20 border border-rose-800 p-6 rounded font-mono text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-slate-100">Failed to Resolve Skills File</h3>
        <p className="text-xs text-slate-400">
          The requested member `{person_id}` was not found inside the live Skills Graph Database.
        </p>
        <Link to="/dashboard" className="inline-flex items-center text-xs text-sky-400 hover:underline gap-1 pt-2 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> RETURN TO VIGILANCE COMMAND
        </Link>
      </div>
    );
  }

  const { person, top_skills, expertise_map, task_patterns, collaboration_network, knowledge_domains, agent_delegation_readiness } = fileData.skillsFile;

  // Prepare data for Radar Chart
  const radarData = top_skills.map((s) => ({
    subject: s.label.length > 20 ? s.label.substring(0, 18) + "..." : s.label,
    A: s.confidenceScore,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="skills_file_root">
      
      {/* Back CTA */}
      <div className="flex items-center justify-between">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO COMAND COMMANDER
        </Link>
        <div className="font-mono text-[11px] text-slate-500 uppercase">
          Identity Ref: <span className="text-sky-400">{person.id}</span>
        </div>
      </div>

      {/* 1. DENSE INFO HEADER PROFILE CARD */}
      <div className="bg-[#12141c] border border-slate-800 rounded p-5 relative overflow-hidden" id="skills_profile_card">
        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-slate-850/50 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center space-x-4">
            <div className="w-12 h-12 bg-slate-900 border border-slate-700 flex items-center justify-center rounded">
              <User className="w-6 h-6 text-sky-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold tracking-tight text-white">{person.name}</h2>
                <span className="bg-emerald-950/60 border border-emerald-900 text-[9px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded leading-none flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED TALENT
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl font-normal leading-relaxed">{person.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:items-center gap-x-5 gap-y-2 font-mono text-xs border-t md:border-t-0 md:border-l border-slate-850 pt-3 md:pt-0 md:pl-6 text-slate-400 min-w-[240px]">
            <div className="space-y-1">
              <span className="text-[9px] block text-slate-500 uppercase">Department</span>
              <strong className="text-slate-300 font-mono font-normal">{person.department}</strong>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] block text-slate-500 uppercase">Tenure</span>
              <strong className="text-slate-300 font-mono font-normal">{person.tenure}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="skills_main_workspace">
        
        {/* RADAR CHART BLOCK (LEFT 6 COLS) */}
        <div className="lg:col-span-6 space-y-5 flex flex-col">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 flex-1 flex flex-col relative min-h-[380px]" id="radar_chart_card">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5 mb-4">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-semibold">Skill Confidence Metrics</h3>
            </div>

            <div className="flex-1 min-h-[280px] w-full flex items-center justify-center">
              {radarData.length === 0 ? (
                <div className="text-[11px] font-mono text-slate-500">NO DEMONSTRATED SKILLS TO DISPLAY</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#222d42" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "JetBrains Mono" }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: "#475569", fontSize: 8 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Confidence Score"
                      dataKey="A"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.15}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e293b", fontSize: "11px", fontFamily: "JetBrains Mono" }}
                      itemStyle={{ color: "#38bdf8" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 text-center leading-snug max-w-sm mx-auto mt-2">
              Scores reflect cumulative graph weighting: extracted via historical runbook digests & resolved tickets.
            </div>
          </div>

          {/* COLLABORATION NETWORK PANEL */}
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono text-[11px]" id="collaboration_circle_card">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5 mb-3">
              <Users className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Active Peer Collaboration Net</h3>
            </div>

            {collaboration_network.length === 0 ? (
              <p className="text-slate-500 py-3 italic">Isolated core domain operator. No direct joint paths indexed.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {collaboration_network.map((p: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => navigate(`/skills-file/${p.id}`)}
                    className="flex justify-between items-center p-2 border border-slate-850 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 rounded cursor-pointer transition-all duration-150"
                  >
                    <span className="font-semibold text-slate-300 hover:text-sky-400 transition-colors">{p.name}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-850 px-2.2 py-0.5 rounded text-right">
                      {p.relationship}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT 6 COLS: DELEGATION CAPABILITY & DECISION HISTORIES */}
        <div className="lg:col-span-6 space-y-5 flex flex-col">
          
          {/* AI AGENT DELEGATION PROFILE */}
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-4 flex-1 flex flex-col justify-between" id="delegation_analytics_card">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">AI Delegation Autonomy Limits</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs bg-slate-950/60 p-3 border border-slate-850 rounded">
                <div>
                  <span className="text-[9px] block text-slate-500 uppercase">Autonomy Delegation Index</span>
                  <strong className="text-xl font-semibold text-emerald-400">{agent_delegation_readiness.score}% Readiness</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] block text-slate-500 uppercase">Max Threshold Allowed</span>
                  <span className="bg-emerald-950 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded font-bold text-[9px]">
                    {agent_delegation_readiness.maxSeverityAutothreshold}
                  </span>
                </div>
              </div>

              {/* Dynamic delegation analyzer sandbox widget */}
              <div className="border border-slate-850/80 p-3 rounded space-y-2.5 bg-slate-950/30">
                <div className="flex justify-between items-center text-[10px] uppercase text-slate-400 font-semibold">
                  <span>Replication Suitability sandbox</span>
                  {isEvalFetching && <span className="text-[8px] text-sky-400 animate-pulse">EVALUATING MODEL...</span>}
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={evalCategory}
                    onChange={(e) => setEvalCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs py-1.5 px-2 rounded font-mono text-slate-300 focus:outline-none w-full"
                  >
                    <option value="Spanner">Google Cloud Spanner</option>
                    <option value="OAuth">OAuth 2.0 Identity Protocol</option>
                    <option value="Encryption">Field Encryption KMS Key Rings</option>
                    <option value="Autoscale">Kubernetes Auto-scalers</option>
                    <option value="Gemini">Gemini Prompting RAG Orchestrator</option>
                  </select>
                </div>

                {readinessData && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-850/60 pt-2.5">
                    <div>
                      Category Match: <span className="text-slate-200">{readinessData.taskType}</span>
                    </div>
                    <div>
                      Readiness: <span className="text-emerald-400 font-bold">{readinessData.metrics.readinessScore}%</span>
                    </div>
                    <div>
                      Tested Frequency: <span className="text-slate-200">{readinessData.metrics.frequencyCount} incident(s)</span>
                    </div>
                    <div>
                      Autonomous Gate: <span className={readinessData.metrics.canDelegateAutonomously ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                        {readinessData.metrics.canDelegateAutonomously ? "GRANTED (Safe)" : "MANDATE ESCALATION"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-850 pt-3">
              Status Flag: <b className="text-[#38bdf8]">SYS_ACTIVE</b> • Model rules forbid deploying personnel credentials autonomously below a 70% threshold score.
            </div>
          </div>

          {/* TASK TIMELINE BLOCK */}
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono font-normal flex-1 flex flex-col" id="tasks_timeline_card">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5 mb-3">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Incident Patterns Resolved Timeline</h3>
            </div>

            {task_patterns.length === 0 ? (
              <p className="text-slate-500 py-4 italic text-xs">No individual incident footprints logged under this identifier.</p>
            ) : (
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {task_patterns.map((t: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-slate-800 pl-3 relative space-y-1">
                    <span className="absolute -left-1.5 top-0.5 w-2.5 h-2.5 bg-slate-900 border-2 border-sky-400 rounded-full" />
                    <div className="flex justify-between items-start text-[10px] text-slate-500">
                      <span>{t.verifiedAt}</span>
                      <span className="text-indigo-400 uppercase text-[9px] bg-indigo-950/50 border border-indigo-900/60 px-1.5 py-0.2 rounded font-semibold font-mono">
                        {t.complexityLevel}
                      </span>
                    </div>
                    <h4 className="text-slate-250 font-semibold text-xs leading-none pt-0.5">{t.label}</h4>
                    <p className="text-slate-400 text-[11px] leading-snug">{t.description}</p>
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
