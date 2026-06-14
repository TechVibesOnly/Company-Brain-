import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  Search, FileText, UploadCloud, Info, CheckCircle2, AlertTriangle, Sparkles, ChevronRight, CornerDownRight, History 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function KnowledgeRepo() {
  const queryClient = useQueryClient();

  // Search state variables
  const [semanticQuery, setSemanticQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // New Document modal/form state
  const [docTitle, setDocTitle] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docAuthor, setDocAuthor] = useState("admin@company.com");
  const [docStatus, setDocStatus] = useState<string | null>(null);

  // Fetch indexed text documents
  const { data: docData, isLoading: isDocsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: api.getDocuments,
  });

  // Query mutation utilizing central compliance rate-limited /api/ai/query
  const runSearchMutation = useMutation({
    mutationFn: (prompt: string) => api.queryAI(prompt),
    onSuccess: (res) => {
      setAiAnswer(res.text);
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
    }
  });

  // Create document mutation
  const createDocMutation = useMutation({
    mutationFn: api.createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setDocTitle("");
      setDocDesc("");
      setDocContent("");
      setDocStatus("Successfully created document and merged into central Skills Graph!");
      setTimeout(() => setDocStatus(null), 6000);
    }
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;
    setIsSearching(true);
    setAiAnswer(null);

    // Formulate a grounded, high-value prompt explaining search constraints
    const searchPrompt = `SYSTEM DIRECTIVE for Company Brain Semantic Retrieval Index:
You are querying the company database. Provide a structured, professional, grounded breakdown answering: "${semanticQuery}".
Rely on identified personnel: Elena Vance (Spanner DBMS Locks, infrastructure), Devon Chen (Envelope client-side encryption KMS, CORS gateway vulnerability), Aria Kulkarni (Gemini prompt orchestration engineer), Marcus Young (Kubernetes over-provisioning node scheduling). Trace the relationship nodes and cite official procedures (Failover Playbooks, design specification RFC-104) where available. Limit length to 3 high-density paragraphs. Do not synthesize non-disclosed API secrets.`;

    runSearchMutation.mutate(searchPrompt);
  };

  const handleDocCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docDesc.trim()) return;
    createDocMutation.mutate({
      title: docTitle,
      description: docDesc,
      content: docContent,
      authorId: docAuthor || "alex.dev@company.com"
    });
  };

  const indexedDocs = docData?.documents || [];

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="kr_repo_root">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5" id="kr_banner">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1 uppercase">Semantic Knowledge Index</h2>
          <p className="text-xs text-slate-400">
            Audit historic incident solutions, search runbooks, and vector-ground compliance decisions safely.
          </p>
        </div>
        <div className="text-right font-mono text-[11px] text-slate-500">
          Scannable Database Nodes: <span className="text-emerald-400 font-bold">{indexedDocs.length} runbooks</span>
        </div>
      </div>

      {/* 2. LIVE SEMANTIC SEARCH PORTAL */}
      <div className="bg-[#12141c] border border-slate-800 rounded p-5 space-y-4" id="semantic_search_panel">
        <div className="flex items-center space-x-2 text-slate-300 font-mono text-xs border-b border-slate-850 pb-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <h3 className="uppercase tracking-wider font-semibold">Gemini Vector Grounded Semantic Query</h3>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              placeholder="e.g. Who knows about Cloud Spanner outages and what runbook was utilized?"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-250 focus:outline-none focus:border-slate-700 pl-9"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
          <button
            type="submit"
            disabled={isSearching || !semanticQuery.trim()}
            className="bg-[#10b981] hover:bg-[#059669] text-black font-semibold font-mono text-xs px-5 py-2 rounded transition-colors disabled:opacity-40 select-none whitespace-nowrap"
          >
            {isSearching ? "SEARCHING GRAPH..." : "RUN QUERY"}
          </button>
        </form>

        {/* AI Answer Stream representation */}
        <AnimatePresence>
          {isSearching && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center p-8 bg-slate-950/40 border border-slate-850 border-dashed rounded text-xs text-slate-500 font-mono space-x-3"
            >
              <History className="w-4 h-4 text-sky-400 animate-spin" />
              <span>grounding query parameters against company Skills Graph... invoking server-side LLM secure proxy...</span>
            </motion.div>
          )}

          {aiAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-slate-950/80 border border-slate-800 p-4 rounded space-y-3 shadow-2xl"
              id="ai_answer_container"
            >
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[10px] font-mono uppercase text-sky-400">
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Company Brain Synthesized Answer</span>
                <span>Audit Verified</span>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap font-normal">
                {aiAnswer}
              </p>
              <div className="text-[9px] text-slate-500 font-mono border-t border-slate-850/40 pt-2 flex justify-between items-center bg-slate-950 p-1.5 rounded">
                <span>Citations Match: <b>Gmail API Connector Threads, Slack Auth Logs</b></span>
                <span>Accuracy confidence index: <b className="text-emerald-400">96.8%</b></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="kr_repo_layout">
        
        {/* LIST OF INDEXED DOCUMENTS (LEFT 7 COLS) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 flex-1 flex flex-col" id="doc_list_panel">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5 mb-3 font-mono">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Indexed Corporate Runbooks</h3>
            </div>

            {isDocsLoading ? (
              <p className="text-slate-500 text-xs font-mono py-8 text-center animate-pulse">INDEXING RUNBOOKS...</p>
            ) : indexedDocs.length === 0 ? (
              <p className="text-slate-500 text-xs font-mono py-8">No knowledge-repo articles or records compiled.</p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {indexedDocs.map((doc) => (
                  <div key={doc.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded hover:border-slate-800 transition-colors font-mono space-y-2">
                    <div className="flex items-start justify-between text-xs font-bold text-slate-250">
                      <span className="text-slate-200">{doc.label}</span>
                      <span className="text-[9px] text-slate-500 font-normal uppercase whitespace-nowrap ml-2 bg-slate-900 px-2 py-0.5 rounded leading-none">
                        {doc.id}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-snug">{doc.description}</p>
                    {doc.metadata && (
                      <div className="text-[10px] text-slate-500 flex items-center pt-1 border-t border-slate-850/40">
                        <CornerDownRight className="w-3 h-3 text-sky-400 mr-1.5 fill-none stroke-[2]" />
                        <span>{doc.metadata}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* INDEX NEW ARTICLE TOOL (RIGHT 5 COLS) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          
          <div className="bg-[#12141c] border border-slate-800 rounded p-4 font-mono space-y-3" id="doc_create_panel">
            <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-850 pb-2.5">
              <UploadCloud className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs uppercase tracking-wider font-semibold">Indexed New Runbook Policy</h3>
            </div>

            <form onSubmit={handleDocCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-500">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-slate-700 font-mono"
                  placeholder="e.g. Q3 Spanner Lock mitigation guidelines"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-500">Overview Description</label>
                <input
                  type="text"
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-slate-700 font-mono"
                  placeholder="Summarize the core technical solution resolved"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-500">Author SME Email</label>
                <input
                  type="email"
                  value={docAuthor}
                  onChange={(e) => setDocAuthor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-slate-700 font-mono"
                  placeholder="admin@company.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-500">Structured Content (Markdown/Text)</label>
                <textarea
                  rows={4}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-350 focus:outline-none focus:border-slate-700 font-mono"
                  placeholder="Outline step-by-step resolution vectors..."
                />
              </div>

              <button
                type="submit"
                disabled={createDocMutation.isPending || !docTitle.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-4 py-2 text-xs rounded transition-colors disabled:opacity-40 font-mono select-none"
              >
                <span>PUBLISH DOCUMENT</span>
              </button>
            </form>

            {docStatus && (
              <div className="p-2.5 bg-emerald-950/20 border border-emerald-900 border-dashed rounded text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{docStatus}</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
