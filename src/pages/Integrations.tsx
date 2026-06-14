import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Integration } from "../lib/api";
import { 
  Settings, KeyRound, Radio, Slack, Mail, FileCheck, FolderDot, Lock, HelpCircle, CheckCircle2, AlertTriangle, RefreshCw 
} from "lucide-react";
import { motion } from "motion/react";

export default function Integrations() {
  const queryClient = useQueryClient();

  // Selected config instructions category
  const [selectedOAuthInfo, setSelectedOAuthInfo] = useState<"gmail" | "slack" | "drive">("gmail");

  // Fetch all active integrations
  const { data: interData, isLoading: isIntegrationsLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: api.getIntegrations,
  });

  // Toggle integrations mutation
  const toggleMutation = useMutation({
    mutationFn: api.toggleIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    }
  });

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id);
  };

  const integrations = interData?.integrations || [];

  // Helper icons selector based on connector type
  const getConnectorIcon = (id: string) => {
    switch(id) {
      case "slack":
        return <Slack className="w-5 h-5 text-purple-400" />;
      case "gmail":
        return <Mail className="w-5 h-5 text-sky-400" />;
      case "drive":
        return <FolderDot className="w-5 h-5 text-amber-400" />;
      default:
        return <FileCheck className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="integrations_root">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5 text-xs font-mono" id="integrations_header">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1 uppercase">Enterprise Connected Connectors</h2>
          <p className="text-xs text-slate-400 font-sans">
            Connect corporate workspace streams to compile real-time, PII-sanitized identity mappings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-sky-400" />
          <span>OAuth 2.0 Security Protocols: <b className="text-emerald-400">ACTIVE</b></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="integrations_layout">
        
        {/* REPOSITORIES STATUS LIST (LEFT 7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 space-y-3" id="integrations_list_panel">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5 font-mono">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Active Repository Connectors</h3>
            </div>

            {isIntegrationsLoading ? (
              <p className="text-slate-500 text-xs font-mono py-8 text-center animate-pulse">RECONSTRUCTING CONNECTORS STATE...</p>
            ) : integrations.length === 0 ? (
              <p className="text-slate-500 text-xs font-mono py-8">No integration credentials registered inside secrets workspace.</p>
            ) : (
              <div className="space-y-3">
                {integrations.map((item) => {
                  const isActive = item.status === "Active";
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 border rounded font-mono space-y-3 bg-slate-950/40 relative overflow-hidden transition-all duration-150 ${
                        isActive ? "border-slate-850" : "border-slate-900 opacity-60"
                      }`}
                    >
                      {/* Active Status Badge indicator */}
                      <span className={`absolute top-0 right-0 h-1.5 w-1.5 ${isActive ? "bg-emerald-400" : "bg-slate-700"}`} />

                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                            {getConnectorIcon(item.id)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                            <span className="text-[9px] text-slate-500 uppercase">{item.type} MODULE</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggle(item.id)}
                          disabled={toggleMutation.isPending}
                          className={`text-[10px] font-bold font-mono px-3 py-1.5 rounded border transition-colors select-none ${
                            isActive 
                              ? "border-rose-950/60 text-rose-400 hover:bg-rose-950/20" 
                              : "border-emerald-950/60 text-emerald-400 hover:bg-emerald-950/20"
                          }`}
                        >
                          {isActive ? "DISABLE LINK" : "ESTABLISH LINK"}
                        </button>
                      </div>

                      {/* Crawler Specs row if active */}
                      {isActive && (
                        <div className="flex items-center justify-between text-[10px] pt-3 border-t border-slate-850/40 text-slate-400">
                          <div>
                            Crawled items: <span className="text-slate-200 font-mono">{item.crawledCount} logs</span>
                          </div>
                          <div>
                            Refracted metrics: <span className="text-indigo-400 font-mono">{(item.bytesProcessed / 1024).toFixed(1)} KB</span>
                          </div>
                          <div className="text-right">
                            Last index: <span className="text-emerald-400 font-mono">{item.lastSynced}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* SETTINGS / DIRECTORY BOUNDS WIDGET (RIGHT 5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-4 text-xs" id="oauth_credentials_panel">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5">
              <Lock className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">GCP OAuth 2.0 Identity parameters</h3>
            </div>

            <p className="text-slate-400 leading-snug font-sans text-xs">
              Configure secure environment variables under SECRETS parameters. Ensure GCP redirect callbacks are fully registered inside credentials.
            </p>

            <div className="flex border border-slate-850 bg-slate-950 p-1 rounded space-x-1">
              {["gmail", "slack", "drive"].map((infoType) => {
                const isSel = infoType === selectedOAuthInfo;
                return (
                  <button
                    key={infoType}
                    onClick={() => setSelectedOAuthInfo(infoType as any)}
                    className={`flex-1 py-1 rounded text-[9px] uppercase font-bold text-center transition-colors ${
                      isSel ? "bg-[#1f2937] text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {infoType}
                  </button>
                );
              })}
            </div>

            {/* Config metadata fields details */}
            <div className="p-3 bg-slate-950 border border-slate-850 rounded space-y-3 leading-relaxed text-[11px] text-slate-400">
              {selectedOAuthInfo === "gmail" && (
                <div className="space-y-2">
                  <div className="text-sky-400 uppercase text-[9px] font-bold">Gmail Callback Details</div>
                  <div>
                    Scopes: <code>https://www.googleapis.com/auth/gmail.readonly</code>, <code>gmail.metadata</code>
                  </div>
                  <div>
                    Proxy URL URI: <code className="break-all">https://ais-pre-gpugpis4hbxsp4mmyfvn4y-346359161411.asia-southeast1.run.app/api/auth/callback</code>
                  </div>
                  <div className="text-[10px] text-slate-500 bg-slate-900/60 p-2 border border-slate-850 rounded">
                    Requires <code>GMAIL_CLIENT_ID</code>, <code>GMAIL_CLIENT_SECRET</code>, and <code>GMAIL_REFRESH_TOKEN</code> inside variables setup.
                  </div>
                </div>
              )}

              {selectedOAuthInfo === "slack" && (
                <div className="space-y-2">
                  <div className="text-purple-400 uppercase text-[9px] font-bold">Slack Enterprise Scopes</div>
                  <div>
                    Scopes: <code>channels:read</code>, <code>groups:read</code>, <code>channels:history</code>
                  </div>
                  <div>
                    Callback URL: <code>https://slack.com/oauth/v2/authorize</code>
                  </div>
                  <div className="text-[10px] text-slate-500 bg-slate-900/60 p-2 border border-slate-850 rounded">
                    Requires <code>SLACK_BOT_TOKEN</code> and <code>SLACK_SIGNING_SECRET</code> inside workspace keys.
                  </div>
                </div>
              )}

              {selectedOAuthInfo === "drive" && (
                <div className="space-y-2">
                  <div className="text-amber-400 uppercase text-[9px] font-bold">Workspace Drive Credentials</div>
                  <div>
                    Scopes: <code>https://www.googleapis.com/auth/drive.readonly</code>, <code>drive.metadata.readonly</code>
                  </div>
                  <div className="text-[10px] text-slate-500 bg-slate-900/60 p-2 border border-slate-850 rounded">
                    Uses consolidated Google Cloud credentials, reading and parsing PDF and text design specifications directly.
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center bg-sky-950/25 border border-sky-900/30 p-2.5 rounded text-[10px] text-slate-400 leading-snug">
              <div className="flex items-center space-x-1.5 text-sky-400 font-bold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>ALL SECRETS REGISTERED SAFELY</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
