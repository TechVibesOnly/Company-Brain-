import { GraphNode, GraphEdge, IngestionAuditLog, AgentActionLog } from "../types";

export interface SkillsFile {
  person: {
    id: string;
    name: string;
    role: string;
    department: string;
    tenure: string;
    status: string;
  };
  top_skills: Array<{
    id: string;
    label: string;
    description: string;
    confidenceScore: number;
    lastDemonstrated: string;
  }>;
  expertise_map: {
    architecturalRange: string;
    incidentDominance: string;
    activityScore: number;
  };
  task_patterns: Array<{
    id: string;
    label: string;
    description: string;
    verifiedAt: string;
    complexityLevel: string;
  }>;
  collaboration_network: Array<{
    id: string;
    name: string;
    relationship: string;
  }>;
  knowledge_domains: string[];
  agent_delegation_readiness: {
    score: number;
    canReplicateAutonomously: boolean;
    maxSeverityAutothreshold: string;
  };
}

export interface AgentReadiness {
  taskType: string;
  metrics: {
    frequencyCount: number;
    provenExpertsCount: number;
    hasCompliantRunbooks: boolean;
    readinessScore: number;
    canDelegateAutonomously: boolean;
    confidenceMargin: string;
  };
  expertPersonnel: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  prerequisiteNodes: string[];
}

export interface DocumentNode {
  id: string;
  label: string;
  type: "Document";
  description: string;
  metadata?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Inactive";
  crawledCount: number;
  bytesProcessed: number;
  lastSynced: string;
}

export interface PerformanceStats {
  metrics: {
    totalSignalsDigested: number;
    moatBehaviorDataPoints: number;
    averageAgentConfidence: number;
    complianceChecksAccuracy: number;
    rollbackInterventionRate: string;
  };
  timelineData: Array<{
    month: string;
    signals: number;
    skills: number;
    confidence: number;
  }>;
}

/**
 * Clean & Typed Fetch Wrapper Utility
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Company Brain API Client Definition
 */
export const api = {
  // Graph Data
  getGraph: () => fetchJson<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/api/graph"),

  // Audit Logs & Feeds
  getAuditLogs: () => fetchJson<{ ingestionLogs: IngestionAuditLog[] }>("/api/audit-logs"),

  // Agent Executive Logs
  getAgentLogs: () => fetchJson<{ agentLogs: AgentActionLog[] }>("/api/agent-logs"),

  // Skills File for Personnel
  getSkillsFile: (personId: string) => fetchJson<{ skillsFile: SkillsFile }>(`/api/skills-file/${personId}`),

  // Evaluate Agent Delegation Suitability
  getAgentReadiness: (taskType: string) => fetchJson<AgentReadiness>(`/api/agent/readiness/${taskType}`),

  // Knowledge Documents / Records Repository
  getDocuments: () => fetchJson<{ documents: DocumentNode[] }>("/api/documents"),

  createDocument: (doc: { title: string; description: string; content?: string; authorId?: string }) =>
    fetchJson<{ success: boolean; document: DocumentNode }>("/api/documents", {
      method: "POST",
      body: JSON.stringify(doc),
    }),

  // Integrations / Connected OAuth Gateways
  getIntegrations: () => fetchJson<{ integrations: Integration[] }>("/api/integrations"),

  toggleIntegration: (id: string) =>
    fetchJson<{ success: boolean; integrations: Integration[] }>("/api/integrations/toggle", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),

  // Performance Telemetry & The Moat ROI Specs
  getPerformanceStats: () => fetchJson<PerformanceStats>("/api/performance-stats"),

  // Ingestion Inflow Engine (Submits manual files and updates nodes)
  ingestArtifact: (data: {
    text: string;
    source: string;
    user: string;
    consentChecked: boolean;
    retentionDays: number;
  }) =>
    fetchJson<{
      success: boolean;
      auditLog: IngestionAuditLog;
      addedNodes: GraphNode[];
      addedEdges: GraphEdge[];
      maskedText: string;
    }>("/api/ingest", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Agent Operations Center Runs
  runAgent: (data: { agentId: string; instruction: string; user: string }) =>
    fetchJson<{ success: boolean; log: AgentActionLog }>("/api/agent/run", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Rollback Action Override Standard
  rollbackAgentAction: (logId: string) =>
    fetchJson<{ success: boolean; log: AgentActionLog }>("/api/agent/rollback", {
      method: "POST",
      body: JSON.stringify({ logId }),
    }),

  // Server-side rate-limited Gemini vector queries
  queryAI: (prompt: string) =>
    fetchJson<{ text: string }>("/api/ai/query", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
};
