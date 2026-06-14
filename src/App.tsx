import React from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  Network, Users, FileText, Cpu, Settings, LineChart, Shield, Terminal, KeyRound 
} from "lucide-react";

// Views modular import
import Dashboard from "./pages/Dashboard";
import SkillsFile from "./pages/SkillsFile";
import KnowledgeRepo from "./pages/KnowledgeRepo";
import Agents from "./pages/Agents";
import Integrations from "./pages/Integrations";
import Performance from "./pages/Performance";

// Instantiate the QueryClient for server state management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
          
          {/* 1. TOP DENSE OPERATIONS BAR */}
          <header className="bg-[#0c0d12] border-b border-slate-850 px-5 py-3 flex items-center justify-between shadow-md" id="brain_global_header">
            <div className="flex items-center space-x-3.5">
              <div className="h-7 w-7 bg-emerald-950 border border-emerald-500 rounded flex items-center justify-center">
                <Terminal className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold font-mono tracking-wider uppercase text-slate-100">Company Brain</h1>
                  <span className="bg-sky-950/60 border border-sky-900 text-[8px] font-mono text-sky-400 font-bold px-1.5 py-0.2 rounded">
                    SECURE GATE_v2.5
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono tracking-tight leading-none pt-0.5 mt-0.5">
                  Autonomous Skill-Graph & Compliance Grounding Server
                </p>
              </div>
            </div>

            {/* Operator Session status metadata block */}
            <div className="flex items-center space-x-6 text-[11px] font-mono">
              <div className="text-right hidden sm:block">
                <span className="block text-slate-500 uppercase text-[9px] tracking-wider leading-none">Security Clearance Operator</span>
                <span className="text-slate-300 font-semibold leading-relaxed">tanyarajeshsingh155@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2 bg-emerald-950/20 border border-emerald-900/30 px-3 py-1 rounded">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-400 font-bold uppercase text-[9px]">Enforced Mode</span>
              </div>
            </div>
          </header>

          {/* 2. NAVIGATION BAR & MAIN AREA SECTION */}
          <div className="flex-1 flex flex-col md:flex-row">
            
            {/* Nav Menu Sidebar / Left rail */}
            <aside className="w-full md:w-64 bg-[#0c0d12]/80 border-b md:border-b-0 md:border-r border-slate-850 p-4 space-y-4" id="brain_sidebar">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold px-2">Navigation Deck</span>
              <nav className="space-y-1" id="com_sidebar_nav">
                
                <NavLink 
                  to="/dashboard"
                  className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider border transition-all ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-emerald-400 font-bold" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/50"
                  }`}
                  id="nav_dashboard"
                >
                  <Network className="w-4 h-4 text-emerald-400" />
                  <span>Command Center</span>
                </NavLink>

                <NavLink 
                  to="/skills-file/person_elena"
                  className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider border transition-all ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-sky-400 font-bold" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/50"
                  }`}
                  id="nav_skills"
                >
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Skills Files</span>
                </NavLink>

                <NavLink 
                  to="/knowledge-repo"
                  className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider border transition-all ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-purple-400 font-bold" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/50"
                  }`}
                  id="nav_kr"
                >
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Semantic Search</span>
                </NavLink>

                <NavLink 
                  to="/agents"
                  className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider border transition-all ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-rose-450 font-bold" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/50"
                  }`}
                  id="nav_agents"
                >
                  <Cpu className="w-4 h-4 text-rose-500" />
                  <span>Agent Control</span>
                </NavLink>

                <NavLink 
                  to="/integrations"
                  className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider border transition-all ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-amber-400 font-bold" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/50"
                  }`}
                  id="nav_integrations"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Connectors Info</span>
                </NavLink>

                <NavLink 
                  to="/performance"
                  className={({ isActive }) => `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider border transition-all ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-emerald-400 font-bold" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/50"
                  }`}
                  id="nav_perf"
                >
                  <LineChart className="w-4 h-4 text-emerald-400" />
                  <span>The Moat ROI</span>
                </NavLink>

              </nav>

              <div className="pt-6 border-t border-slate-850 font-mono text-[10px] text-slate-500 space-y-2">
                <div>SYSTEM LOG LEVEL: <span className="text-emerald-400 font-semibold">VERBOSE</span></div>
                <div>SECURE ORIGIN ENFORCED</div>
              </div>
            </aside>

            {/* Main Application Content Body */}
            <main className="flex-1 bg-[#090a0f] p-5 md:p-6 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/skills-file/:person_id" element={<SkillsFile />} />
                <Route path="/knowledge-repo" element={<KnowledgeRepo />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>

          </div>

        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
