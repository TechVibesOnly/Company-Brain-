export type NodeType = "Person" | "Skill" | "Task" | "Document" | "Decision" | "Project";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  metadata?: string;
  // Visual position properties used for network graphs representation
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface IngestionAuditLog {
  id: string;
  timestamp: string;
  user: string;
  source: string;
  action: string;
  piiDetected: boolean;
  piiTypes: string[];
  piiCount: number;
  byteSize: number;
  retentionDays: number;
  consentChecked: boolean;
  status: string;
}

export interface AgentActionLog {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  userTriggered: string;
  taskPrompt: string;
  decision: string;
  confidence: number;
  reasoning: string;
  consultedNodes: string[];
  rollbackPath: string;
  isRolledBack: boolean;
  rolledBackAt?: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  exampleQueries: string[];
  iconName: string;
}
