import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();

// ==========================================
// SECURITY CONFIGURATIONS & BASELINE HARDEING
// ==========================================

// Enable trust proxy so Express correctly reads X-Forwarded-For headers from standard GCP load balancers
app.set("trust proxy", 1);

// Standard security headers satisfying OWASP recommendations (adapted for preview framing limits)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  
  // Transport layer protection (HSTS)
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // Custom Content-Security-Policy:
  // Designed to support standard Google Fonts, standard self-contained SPA scripts, Google Cloud Run routing,
  // and permit framing by AI Studio systems so the live simulation interface remains fully operational.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https: referrer; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "connect-src 'self' ws: wss: https:;"
  );
  
  // Prevent mime-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  next();
});

// Tight CORS validation to protect endpoints from unauthorized cross-origin requests (CSRF baseline mitigation)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    // Whitelist active development workspace, preview domains, and local instances
    const isAllowed = 
      origin.startsWith("http://localhost:") || 
      origin.startsWith("http://127.0.0.1:") || 
      origin.includes("run.app") || 
      origin.includes("ai.studio") || 
      origin.includes("google.com");
      
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      console.warn(`CORS request blocked from origin: ${origin}`);
      return res.status(403).json({ error: "Access denied by CORS policy (Unauthorized Origin)." });
    }
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

const PORT = 3000;

// ==========================================
// GEMINI API UTILS (Lazy Initialization)
// ==========================================
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please configure it in your Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ==========================================
// TYPES
// ==========================================
interface GraphNode {
  id: string; 
  label: string; 
  type: "Person" | "Skill" | "Task" | "Document" | "Decision" | "Project";
  description: string;
  metadata?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "demonstrated_by" | "required_for" | "informed_by" | "escalated_to" | "resolved_by" | "associated_with";
  label: string;
}

interface IngestionAuditLog {
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

interface AgentActionLog {
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

// ==========================================
// IN-MEMORY DATABASE & SEED DATA
// ==========================================
let nodes: GraphNode[] = [
  // People
  { id: "person_elena", label: "Elena Vance", type: "Person", description: "Principal Infrastructure Architect. Expert in scale and reliability.", metadata: "Platform Engineering Department, 8 Years Tenure" },
  { id: "person_devon", label: "Devon Chen", type: "Person", description: "Product Cloud Security Lead. Hardens distributed gateways and authentication systems.", metadata: "Information Security, 5 Years Tenure" },
  { id: "person_aria", label: "Aria Kulkarni", type: "Person", description: "Senior Staff AI/ML Specialist. Architect for production model integration & fine-tuning pipelines.", metadata: "Advanced Tech Lab, 4 Years Tenure" },
  { id: "person_marcus", label: "Marcus Young", type: "Person", description: "Senior Developer Experience Engineer. Works on local dev tooling and automated CI pipelines.", metadata: "Developer Platform, 3 Years Tenure" },

  // Skills
  { id: "skill_spanner", label: "Google Cloud Spanner", type: "Skill", description: "Multi-region horizontal scale, lock contention debugging, schema migrations." },
  { id: "skill_oauth", label: "OAuth 2.0 Security Protocols", type: "Skill", description: "Grant types, token exchange flows, PKCE, secure cross-origin authorization." },
  { id: "skill_encryption", label: "Envelope Encryption (KMS)", type: "Skill", description: "Field-level data protection, local DEK caching, Key Ring configurations." },
  { id: "skill_autoscale", label: "Kubernetes Cluster Auto-scaling", type: "Skill", description: "Over-provisioning headroom configurations, cluster pro-portional scaling." },
  { id: "skill_gemini", label: "Gemini Model Prompt Engineering", type: "Skill", description: "Few-shot schemas, structured output parsing, multi-modal context routing." },

  // Documents
  { id: "doc_spanner_failover", label: "Q2 Spanner Failover Playbook", type: "Document", description: "Runbook outlining Spanner failovers and lock contention debugging procedures.", metadata: "Approved by Reliability Board" },
  { id: "doc_encrypt_rfc", label: "RFC-104: Field-Level Envelope Encryption", type: "Document", description: "Detailed design doc proposing database schema field securing via AES-256.", metadata: "Approved design specification" },
  { id: "doc_oauth_audit", label: "Security Identity Audit Summary", type: "Document", description: "External security firm review rating Company Brain's authorization gateways.", metadata: "Restricted Access Only" },
  { id: "doc_platform_wiki", label: "Platform Engineering Wiki Page", type: "Document", description: "Guides on localized Docker/Skaffold configs and Kubernetes scheduling limits.", metadata: "Public Inside Org" },

  // Tasks
  { id: "task_spanner_lock", label: "Spanner Lock Contention in Checkout Service", type: "Task", description: "Critical incident resolved by adding write-through caching on user profile reads.", metadata: "Severity: SEV-1, Resolved" },
  { id: "task_cors_vulnerability", label: "Remediate CORS Flaws in Auth Gateway", type: "Task", description: "Patched cross-origin weaknesses allowing unauthorized state manipulation.", metadata: "Severity: SEV-2, Resolved" },
  { id: "task_node_exhaustion", label: "Checkout Node Pool Exhaustion mitigation", type: "Task", description: "Upgraded auto-scaler rules to include a 20% over-provisioning margin.", metadata: "Severity: SEV-3, Resolved" },

  // Decisions
  { id: "decision_write_thru_cache", label: "Mandate Write-Through Cache on Key Profiles", type: "Decision", description: "Architectural choice restricting direct Spanner updates, reducing lock intervals.", metadata: "Effective Date: May 2026" },
  { id: "decision_envelope_kms", label: "Adopt KMS Envelope Encryption for Columning", type: "Decision", description: "Policy outlining local encrypting before transit to cloud SQL databases.", metadata: "Effective Date: March 2026" },
  { id: "decision_autoscale_buffer", label: "Provide 20% Headroom Buffer in Kubernetes", type: "Decision", description: "Standard sizing directive for high-throughput node pools.", metadata: "Effective Date: April 2026" },

  // Projects
  { id: "project_helios", label: "Project Helios Checkout Engine", type: "Project", description: "Rethinking the core transactional pipeline for sub-second checkouts global-wide.", metadata: "Status: Active" },
  { id: "project_warden", label: "Project Warden Security Shield", type: "Project", description: "Consolidating our identity provider systems and access control audits.", metadata: "Status: Completed" },
];

let edges: GraphEdge[] = [
  // Elena Vance connections
  { id: "edge_e1", source: "person_elena", target: "skill_spanner", type: "demonstrated_by", label: "demonstrated expert proficiency in" },
  { id: "edge_e2", source: "person_elena", target: "task_spanner_lock", type: "resolved_by", label: "resolved critical outage" },
  { id: "edge_e3", source: "task_spanner_lock", target: "doc_spanner_failover", type: "informed_by", label: "guided by runbook" },
  { id: "edge_e4", source: "task_spanner_lock", target: "decision_write_thru_cache", type: "informed_by", label: "remediated through decision" },

  // Devon Chen connections
  { id: "edge_d1", source: "person_devon", target: "skill_encryption", type: "demonstrated_by", label: "specializes in" },
  { id: "edge_d2", source: "person_devon", target: "skill_oauth", type: "demonstrated_by", label: "lead authority on" },
  { id: "edge_d3", source: "person_devon", target: "task_cors_vulnerability", type: "resolved_by", label: "remediated security vulnerability" },
  { id: "edge_d4", source: "task_cors_vulnerability", target: "doc_encrypt_rfc", type: "informed_by", label: "designed in accordance with" },
  { id: "edge_d5", source: "task_cors_vulnerability", target: "decision_envelope_kms", type: "informed_by", label: "implemented compliance rules" },
  { id: "edge_d6", source: "person_devon", target: "doc_oauth_audit", type: "associated_with", label: "commissioned and reviewed" },

  // Aria Kulkarni connections
  { id: "edge_a1", source: "person_aria", target: "skill_gemini", type: "demonstrated_by", label: "demonstrated advanced skill in" },
  { id: "edge_a2", source: "person_aria", target: "project_helios", type: "associated_with", label: "pioneered AI optimization inside" },

  // Marcus Young connections
  { id: "edge_m1", source: "person_marcus", target: "skill_autoscale", type: "demonstrated_by", label: "designed orchestration infrastructure in" },
  { id: "edge_m2", source: "person_marcus", target: "task_node_exhaustion", type: "resolved_by", label: "rectified cluster performance lock" },
  { id: "edge_m3", source: "task_node_exhaustion", target: "decision_autoscale_buffer", type: "informed_by", label: "enforced rule standard" },
  { id: "edge_m4", source: "person_marcus", target: "doc_platform_wiki", type: "associated_with", label: "authored technical spec in" },
];

let ingestionLogs: IngestionAuditLog[] = [
  {
    id: "ingest_audit_seed_1",
    timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    user: "System Ingest",
    source: "Q2_Spanner_Failover_Specs.txt",
    action: "Seed Ingestion",
    piiDetected: false,
    piiCount: 0,
    piiTypes: [],
    byteSize: 14500,
    retentionDays: 365,
    consentChecked: true,
    status: "Processed & Indexed"
  },
  {
    id: "ingest_audit_seed_2",
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    user: "devon.chen@company.com",
    source: "Incidents-AuthGateway-SlackAudit",
    action: "API Gateway Scan Ingestion",
    piiDetected: true,
    piiCount: 2,
    piiTypes: ["Email Address", "API Secret/Token"],
    byteSize: 8900,
    retentionDays: 180,
    consentChecked: true,
    status: "Masked, Encrypted & Shared"
  }
];

let agentLogs: AgentActionLog[] = [
  {
    id: "agent_action_seed_1",
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    agentId: "agent_onboarding",
    agentName: "Onboarding Advisor Advisor",
    userTriggered: "New Employee Onboarding Flow",
    taskPrompt: "Suggest the list of internal documentation and team subject matter experts for a new engineer working on Spanner Lock problems.",
    decision: "Drafted a checklist citing 'Q2 Spanner Failover Playbook' as the prime reading material, and pointed the employee directly to 'Elena Vance' as the key escalation expert and Principal Architect.",
    confidence: 96,
    reasoning: "Querying the Skills Graph returned a perfect demonstrated_by relationship between Elena Vance and Google Cloud Spanner, along with a resolved_by edge linking Elena to the Spanner Lock incident. Furthermore, the task itself was informed_by Spanner Failover documentation.",
    consultedNodes: ["person_elena", "skill_spanner", "doc_spanner_failover", "task_spanner_lock"],
    rollbackPath: "Archive generated onboarding checklist draft in Google Docs #OB-9401",
    isRolledBack: false
  }
];

// ==========================================
// SECURITY & CRYPTO SIMULATORS
// ==========================================
function scanAndObfuscatePII(text: string): { 
  masked: string; 
  piiCount: number; 
  detectedTypes: string[]; 
} {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const apiSecretRegex = /(AIzaSy[A-Za-z0-9-_]{33}|xoxb-[0-9]{11,13}-[a-zA-Z0-9]{24}|xoxp-[0-9]{11,13}-[a-zA-Z0-9]{24})/g;
  
  // Extra robust patterns for Enterprise security auditing:
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  const creditCardRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13})\b/g;
  const jwtRegex = /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
  const pemPrivateBlockRegex = /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g;

  let masked = text;
  let piiCount = 0;
  const detectedTypesSet = new Set<string>();

  // 1. Emails
  const emails = text.match(emailRegex);
  if (emails) {
    piiCount += emails.length;
    detectedTypesSet.add("Email Address");
    emails.forEach(email => {
      const parts = email.split("@");
      const local = parts[0];
      const maskedLocal = local.length > 2 ? local.substring(0, 2) + "****" : "****";
      masked = masked.replace(email, `${maskedLocal}@${parts[1]}`);
    });
  }

  // 2. Phones
  const phones = text.match(phoneRegex);
  if (phones) {
    piiCount += phones.length;
    detectedTypesSet.add("Phone Number");
    phones.forEach(phone => {
      masked = masked.replace(phone, " [AES-256 ENCRYPTED PHONE NUMBER] ");
    });
  }

  // 3. Simple Secrets / API Keys
  const secrets = text.match(apiSecretRegex);
  if (secrets) {
    piiCount += secrets.length;
    detectedTypesSet.add("API Secret/Token");
    secrets.forEach(secret => {
      masked = masked.replace(secret, " [AES-256 ENCRYPTED SECRET_KEY] ");
    });
  }

  // 4. SSNs
  const ssns = text.match(ssnRegex);
  if (ssns) {
    piiCount += ssns.length;
    detectedTypesSet.add("Social Security Number");
    ssns.forEach(ssn => {
      masked = masked.replace(ssn, " [REDACTED SSN] ");
    });
  }

  // 5. Credit Cards
  const cards = text.match(creditCardRegex);
  if (cards) {
    piiCount += cards.length;
    detectedTypesSet.add("Credit Card Number");
    cards.forEach(card => {
      // Keep last 4 digits visible for reference, obfuscating the rest
      const cleanCard = card.replace(/[-.\s]/g, "");
      const maskedCard = " [CC MASKED: ****-****-****-" + cleanCard.slice(-4) + "] ";
      masked = masked.replace(card, maskedCard);
    });
  }

  // 6. JWTs (Incorporate signatures)
  const jwts = text.match(jwtRegex);
  if (jwts) {
    piiCount += jwts.length;
    detectedTypesSet.add("JSON Web Token");
    jwts.forEach(jwt => {
      masked = masked.replace(jwt, " [ENCRYPTED JWT STATELESS TOKEN] ");
    });
  }

  // 7. Cryptographic Private PEM Blocks
  const pems = text.match(pemPrivateBlockRegex);
  if (pems) {
    piiCount += pems.length;
    detectedTypesSet.add("Private Cryptographic Key (PEM Block)");
    pems.forEach(pem => {
      masked = masked.replace(pem, " [REDACTED HIGH-SECURITY CRYPTO PRIMARY BLOCK] ");
    });
  }

  return {
    masked,
    piiCount,
    detectedTypes: Array.from(detectedTypesSet),
  };
}

// ==========================================
// API REST ENDPOINTS
// ==========================================

// Get Graph
app.get("/api/graph", (req, res) => {
  res.json({ nodes, edges });
});

// Get Audit Logs
app.get("/api/audit-logs", (req, res) => {
  res.json({ ingestionLogs });
});

// Get Agent Logs
app.get("/api/agent-logs", (req, res) => {
  res.json({ agentLogs });
});

// Rate limiting state configuration for POST /api/ai/query
const IP_RATE_LIMITS = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute
  const maxReqs = 60;
  
  if (!IP_RATE_LIMITS.has(ip)) {
    IP_RATE_LIMITS.set(ip, [now]);
    return false;
  }
  
  const timestamps = IP_RATE_LIMITS.get(ip)!.filter(t => now - t < limitWindow);
  if (timestamps.length >= maxReqs) {
    return true;
  }
  
  timestamps.push(now);
  IP_RATE_LIMITS.set(ip, timestamps);
  return false;
}

// REST: POST /api/ai/query - Exclusive rate-limited Gemini call mapping
app.post("/api/ai/query", async (req, res) => {
  const clientIp = req.ip || "127.0.0.1";
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many query requests. Limit is 60 requests per minute." });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt string is required." });
  }

  // Create audit compliance log regarding AI query escalation
  const auditId = "ingest_audit_" + Math.random().toString(36).substr(2, 9);
  ingestionLogs.unshift({
    id: auditId,
    timestamp: new Date().toISOString(),
    user: "Core Operator",
    source: "POST /api/ai/query",
    action: "Gemini Pro Direct Vector Grounded Query",
    piiDetected: false,
    piiCount: 0,
    piiTypes: [],
    byteSize: Buffer.byteLength(prompt, "utf8"),
    retentionDays: 90,
    consentChecked: true,
    status: "Audit mapped and prompt synchronized. Gemini intelligence invoked."
  });

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return res.json({ text: response.text });
  } catch (error: any) {
    console.warn("Skipping real Gemini in /api/ai/query. Falling back to structured response.", error.message);
    const simulatedText = `**[Simulated Enterprise Brain Engine Response]**

I parsed the organizational Skills Graph for: "${prompt}".

**Key Structural Insights Retrospective:**
1. **Identified Personnel Experts:** Elena Vance is the lead infrastructure authority on *Google Cloud Spanner locks*. Devon Chen is the infosec SME for *Envelope encryption (AES-256)* and *OAuth security protocols*. Aria Kulkarni is the Senior AI specialist leading prompt fine-tuning.
2. **Current Decision Bounds:** Adopt KMS envelope encryption (Adopted May 2026) and provision 20% headroom scalability.
3. **Execution Readiness:** Highly delegation ready for standard Spanner locks and auth compliance checking. For active escalations, please consult the live dashboards.`;
    return res.json({ text: simulatedText });
  }
});

// REST: GET /api/skills-file/:person_id - Synthesized skills file compiler
app.get("/api/skills-file/:person_id", (req, res) => {
  const { person_id } = req.params;
  const person = nodes.find(n => n.id === person_id && n.type === "Person");
  if (!person) {
    return res.status(404).json({ error: "Person node not found in company Skills Graph." });
  }

  const demonstratedSkills = edges
    .filter(e => e.source === person_id && e.type === "demonstrated_by")
    .map(e => nodes.find(n => n.id === e.target && n.type === "Skill"))
    .filter(Boolean);

  const resolvedTasks = edges
    .filter(e => e.source === person_id && e.type === "resolved_by")
    .map(e => nodes.find(n => n.id === e.target && n.type === "Task"))
    .filter(Boolean);

  const skillsFile = {
    person: {
      id: person.id,
      name: person.label,
      role: person.description,
      department: person.metadata || "Engineering Division",
      tenure: "4-8 Years",
      status: "Active & Verified"
    },
    top_skills: demonstratedSkills.map(s => ({
      id: s?.id,
      label: s?.label,
      description: s?.description,
      confidenceScore: 92 + Math.floor(Math.random() * 7),
      lastDemonstrated: new Date(Date.now() - (Math.random() * 15 * 3600 * 24 * 1000)).toLocaleDateString()
    })),
    expertise_map: {
      architecturalRange: demonstratedSkills.length > 2 ? "Principal Systems Architect" : "Lead Domain Authority",
      incidentDominance: resolvedTasks.length > 0 ? "Tier-3 Escalation" : "General Technical SME",
      activityScore: 94
    },
    task_patterns: resolvedTasks.map(t => ({
      id: t?.id,
      label: t?.label,
      description: t?.description,
      verifiedAt: new Date(Date.now() - (12 * 3600 * 24 * 1000)).toLocaleDateString(),
      complexityLevel: "High / Critical-Path Ops"
    })),
    collaboration_network: edges
      .filter(e => e.source === person_id || e.target === person_id)
      .map(e => {
        const otherId = e.source === person_id ? e.target : e.source;
        const otherNode = nodes.find(n => n.id === otherId && n.type === "Person");
        return otherNode ? { id: otherNode.id, name: otherNode.label, relationship: e.label } : null;
      })
      .filter(Boolean),
    knowledge_domains: demonstratedSkills.map(s => s?.label || "Distributed Computing"),
    agent_delegation_readiness: {
      score: 85 + (demonstratedSkills.length * 4),
      canReplicateAutonomously: demonstratedSkills.length >= 2,
      maxSeverityAutothreshold: demonstratedSkills.length >= 2 ? "SEV-1 / SEV-2" : "SEV-4 Backlog Only"
    }
  };

  res.json({ skillsFile });
});

// REST: GET /api/agent/readiness/:task_type - Evaluates agent delegation suitability
app.get("/api/agent/readiness/:task_type", (req, res) => {
  const { task_type } = req.params;
  const lowercaseType = task_type.toLowerCase();

  const matchingSkills = nodes.filter(n => n.type === "Skill" && n.label.toLowerCase().includes(lowercaseType));
  const matchingTasks = nodes.filter(n => n.type === "Task" && n.label.toLowerCase().includes(lowercaseType));

  const eligibleExperts: any[] = [];
  nodes.filter(n => n.type === "Person").forEach(p => {
    const hasSkill = edges.some(e => e.source === p.id && matchingSkills.some(s => s.id === e.target));
    const hasSolved = edges.some(e => e.source === p.id && matchingTasks.some(t => t.id === e.target));
    if (hasSkill || hasSolved) {
      eligibleExperts.push({ id: p.id, label: p.label, description: p.description });
    }
  });

  const frequency = matchingTasks.length || 1;
  const hasPlaybooks = nodes.some(n => n.type === "Document" && n.label.toLowerCase().includes(lowercaseType));
  const readinessScore = Math.min(100, Math.max(30, (frequency * 18) + (hasPlaybooks ? 35 : 0) + (eligibleExperts.length * 12)));

  res.json({
    taskType: task_type,
    metrics: {
      frequencyCount: frequency,
      provenExpertsCount: eligibleExperts.length,
      hasCompliantRunbooks: hasPlaybooks,
      readinessScore: readinessScore,
      canDelegateAutonomously: readinessScore >= 70,
      confidenceMargin: "±" + (10 - Math.min(8, frequency * 2)) + "%"
    },
    expertPersonnel: eligibleExperts,
    prerequisiteNodes: [
      ...matchingSkills.map(s => s.id),
      ...matchingTasks.map(t => t.id)
    ]
  });
});

// REST: GET /api/documents - Fetch knowledge files
app.get("/api/documents", (req, res) => {
  const docs = nodes.filter(n => n.type === "Document");
  res.json({ documents: docs });
});

// REST: POST /api/documents - Add custom knowledge file
app.post("/api/documents", (req, res) => {
  const { title, description, content, authorId } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required metrics." });
  }

  const docId = "doc_" + title.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const newDoc: GraphNode = {
    id: docId,
    label: title,
    type: "Document",
    description,
    metadata: `Indexed by ${authorId || "coordinator@company.com"} • AES-256 Envelope Secured`
  };

  nodes.push(newDoc);

  if (authorId) {
    edges.push({
      id: `edge_${Math.random().toString(36).substr(2, 9)}`,
      source: authorId,
      target: docId,
      type: "associated_with",
      label: "authored and reviewed company runbook"
    });
  }

  // Audits compliance logging
  const auditId = "ingest_audit_" + Math.random().toString(36).substr(2, 9);
  ingestionLogs.unshift({
    id: auditId,
    timestamp: new Date().toISOString(),
    user: authorId || "alex.dev@company.com",
    source: title,
    action: "Document Knowledge Source Ingestion",
    piiDetected: false,
    piiCount: 0,
    piiTypes: [],
    byteSize: Buffer.byteLength(content || title, "utf8"),
    retentionDays: 365,
    consentChecked: true,
    status: "Knowledge Resource indexed and mapped into live Skills Nodes"
  });

  res.json({ success: true, document: newDoc });
});

// In-Memory source connector state variables
let integrations = [
  { id: "slack", name: "Slack Corporate Workspace", type: "Chat", status: "Active", crawledCount: 1840, bytesProcessed: 724000, lastSynced: "Just now" },
  { id: "gmail", name: "Gmail Enterprise Inbox", type: "Email", status: "Active", crawledCount: 4210, bytesProcessed: 1450000, lastSynced: "12 mins ago" },
  { id: "drive", name: "Google Drive Core Repositories", type: "File", status: "Inactive", crawledCount: 0, bytesProcessed: 0, lastSynced: "Never" },
  { id: "filesystem", name: "Filesystem Folder Watcher", type: "File", status: "Active", crawledCount: 520, bytesProcessed: 320000, lastSynced: "1 hour ago" },
];

// REST: GET /api/integrations - Fetch integration statuses
app.get("/api/integrations", (req, res) => {
  res.json({ integrations });
});

// REST: POST /api/integrations/toggle - Enable/disable connectors dynamically
app.post("/api/integrations/toggle", (req, res) => {
  const { id } = req.body;
  const index = integrations.findIndex(i => i.id === id);
  if (index !== -1) {
    const prevStatus = integrations[index].status;
    integrations[index].status = prevStatus === "Active" ? "Inactive" : "Active";
    integrations[index].lastSynced = integrations[index].status === "Active" ? "Just now" : "Disabled";
    if (integrations[index].status === "Active") {
      integrations[index].crawledCount = Math.floor(Math.random() * 1500) + 120;
      integrations[index].bytesProcessed = Math.floor(Math.random() * 800000) + 50000;
    } else {
      integrations[index].crawledCount = 0;
      integrations[index].bytesProcessed = 0;
    }

    // Append and trigger Compliance log
    const auditId = "ingest_audit_" + Math.random().toString(36).substr(2, 9);
    ingestionLogs.unshift({
      id: auditId,
      timestamp: new Date().toISOString(),
      user: "System Identity Manager",
      source: `Module Connector: ${integrations[index].name}`,
      action: "Connector Status Alteration",
      piiDetected: false,
      piiCount: 0,
      piiTypes: [],
      byteSize: 150,
      retentionDays: 180,
      consentChecked: true,
      status: `SECURE INTEGRATOR: Connector '${integrations[index].name}' status updated to ${integrations[index].status}`
    });

    res.json({ success: true, integrations });
  } else {
    res.status(404).json({ error: "Integration module not found." });
  }
});

// REST: GET /api/performance-stats - Telemetry stats for Moat dashboard
app.get("/api/performance-stats", (req, res) => {
  res.json({
    metrics: {
      totalSignalsDigested: ingestionLogs.length + 1240,
      moatBehaviorDataPoints: nodes.length * 4 + edges.length * 6,
      averageAgentConfidence: 91.5,
      complianceChecksAccuracy: 100,
      rollbackInterventionRate: agentLogs.length > 0 
        ? ((agentLogs.filter(l => l.isRolledBack).length / agentLogs.length) * 100).toFixed(1) + "%" 
        : "0.0%"
    },
    timelineData: [
      { month: "Jan", signals: 120, skills: 8, confidence: 84 },
      { month: "Feb", signals: 280, skills: 15, confidence: 86 },
      { month: "Mar", signals: 540, skills: 24, confidence: 88 },
      { month: "Apr", signals: 890, skills: 32, confidence: 90 },
      { month: "May", signals: 1120, skills: 36, confidence: 91 },
      { month: "Jun", signals: ingestionLogs.length + 1240, skills: nodes.filter(n => n.type === "Skill").length, confidence: 92.5 }
    ]
  });
});

// Ingest Inflow (Uses Gemini to parse skills graph)
app.post("/api/ingest", async (req, res) => {
  try {
    const { text, source, user, consentChecked, retentionDays } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No artifact text provided." });
    }

    if (!consentChecked) {
      return res.status(400).json({ error: "Consent checkbox must be checked to enable ingestion audit logs compliance check." });
    }

    // 1. Scan and mask PII
    const { masked, piiCount, detectedTypes } = scanAndObfuscatePII(text);
    const sizeBytes = Buffer.byteLength(text, "utf8");

    // Create Audit Log entry
    const auditId = "ingest_audit_" + Math.random().toString(36).substr(2, 9);
    const newAuditLog: IngestionAuditLog = {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: user || "anonymous@company.com",
      source: source || "Manual Web Portal Paste",
      action: "Artifact Ingestion Flow",
      piiDetected: piiCount > 0,
      piiCount,
      piiTypes: detectedTypes,
      byteSize: sizeBytes,
      retentionDays: retentionDays || 365,
      consentChecked: true,
      status: "Ingested"
    };

    // 2. Call Gemini (lazy loaded) to distill the document into nodes and edges
    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      console.warn("Skipping real Gemini calls because API Key is missing. Simulating fallback.");
      // If Gemini Key is absent, do lightweight mock extraction to guarantee full-stack robustness!
      return handleSimulatedIngestion(res, newAuditLog, masked, source);
    }

    const systemInstruction = `You are the lead entity extraction engine for Company Brain. Your task is to ingest structured or unstructured texts (emails, Slack chats, transcripts) and distill them into a highly-coherent, strict Skills Graph. 
Extract:
- Person: An employee, engineer, or specialist.
- Skill: Technical skills, tools, methodologies mentioned.
- Task: Specific resolved task or incident.
- Document: File types, runbooks, or specific Wikis.
- Decision: Architectural decisions or strict mandates.
- Project: Named initiatives (e.g. Project Helios).

You MUST also extract relationships (edges) between existing or newly created nodes.
The relationships available are: 'demonstrated_by' | 'required_for' | 'informed_by' | 'escalated_to' | 'resolved_by' | 'associated_with'.

Verify that every ID is formed as a strict snake_case identifier starting with its category prefix:
e.g., person_samantha, skill_rust_assembly, task_oauth2_leak, doc_runbook_auth, decision_token_rotation, project_zephyr.

Provide output EXACTLY matching the JSON schema.`;

    const IngestionSchema = {
      type: Type.OBJECT,
      properties: {
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique snake_case identifier beginning with prefix: person_, skill_, task_, doc_, decision_, project_" },
              label: { type: Type.STRING, description: "Friendly human label, e.g., 'Sam Altman' or 'OAuth Debugging'" },
              type: { type: Type.STRING, description: "One of: 'Person' | 'Skill' | 'Task' | 'Document' | 'Decision' | 'Project'" },
              description: { type: Type.STRING, description: "Brief description of how they/it fits into the context" },
              metadata: { type: Type.STRING, description: "Optional Department, tenure, status or severity" }
            },
            required: ["id", "label", "type", "description"]
          }
        },
        edges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING, description: "ID of source node" },
              target: { type: Type.STRING, description: "ID of target node" },
              type: { type: Type.STRING, description: "Relationship edge type" },
              label: { type: Type.STRING, description: "Human description of relationship" }
            },
            required: ["source", "target", "type", "label"]
          }
        }
      },
      required: ["nodes", "edges"]
    };

    const prompt = `Distill this company artifact into skills graph elements:
Artifact Source: ${source || "Manual Ingestion Portal"}
Content:
${masked}`;

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: IngestionSchema
      }
    });

    const schemaOutput = JSON.parse(geminiResponse.text || "{}");

    const addedNodes: GraphNode[] = schemaOutput.nodes || [];
    const addedEdges: GraphEdge[] = schemaOutput.edges || [];

    // Merge into our server-side database
    addedNodes.forEach(newNode => {
      // Ensure type safety and structure
      if (["Person", "Skill", "Task", "Document", "Decision", "Project"].includes(newNode.type)) {
        const index = nodes.findIndex(n => n.id === newNode.id);
        if (index === -1) {
          nodes.push(newNode);
        } else {
          // Merge metadata
          nodes[index].description = newNode.description;
          if (newNode.metadata) nodes[index].metadata = newNode.metadata;
        }
      }
    });

    addedEdges.forEach(newEdge => {
      const edgeId = `edge_${Math.random().toString(36).substr(2, 9)}`;
      const exists = edges.some(e => e.source === newEdge.source && e.target === newEdge.target && e.type === newEdge.type);
      if (!exists) {
        edges.push({
          id: edgeId,
          source: newEdge.source,
          target: newEdge.target,
          type: newEdge.type as any,
          label: newEdge.label
        });
      }
    });

    newAuditLog.status = `Successfully Processed. Extracted ${addedNodes.length} nodes, ${addedEdges.length} edges.`;
    ingestionLogs.unshift(newAuditLog);

    res.json({
      success: true,
      auditLog: newAuditLog,
      addedNodes,
      addedEdges,
      maskedText: masked
    });

  } catch (error: any) {
    console.error("Ingestion Endpoint Error:", error);
    res.status(500).json({ error: "Failed to process ingestion pipeline due to an internal system error." });
  }
});

// Helper for offline / sandbox fallback of Ingestion
function handleSimulatedIngestion(res: any, dummyAudit: IngestionAuditLog, masked: string, source: string) {
  // Simple heuristic simulation
  const addedNodes: GraphNode[] = [];
  const addedEdges: GraphEdge[] = [];

  if (masked.toLowerCase().includes("sarah") || masked.toLowerCase().includes("engineer")) {
    const pId = "person_sarah";
    addedNodes.push({
      id: pId,
      label: "Sarah Jenkins",
      type: "Person",
      description: "Senior DevOps Specialist identified during manual artifact processing.",
      metadata: "Platform Engineering (Inferred)"
    });

    if (masked.toLowerCase().includes("spanner") || masked.toLowerCase().includes("database")) {
      const sId = "skill_spanner_ops";
      addedNodes.push({
        id: sId,
        label: "Database Performance Tuning",
        type: "Skill",
        description: "Optimizing database parameters and resolving locks."
      });
      addedEdges.push({
        id: `edge_sim_${Math.random().toString(36).substr(2, 5)}`,
        source: pId,
        target: sId,
        type: "demonstrated_by",
        label: "demonstrated skill during lock contention incident resolution"
      });
    }
  } else {
    // Standard random simulated ingestion nodes
    const mockId = `node_${Math.random().toString(36).substr(2, 5)}`;
    addedNodes.push({
      id: mockId,
      label: `Extracted Resource from ${source || "Import"}`,
      type: "Document",
      description: "Extracted historical context summarizing corporate behavioral workflows.",
    });
  }

  // Merge
  addedNodes.forEach(n => {
    if (!nodes.some(ex => ex.id === n.id)) nodes.push(n);
  });
  addedEdges.forEach(e => {
    if (!edges.some(ex => ex.source === e.source && ex.target === e.target)) edges.push(e);
  });

  dummyAudit.status = "Processed (Simulator Local Fallback)";
  ingestionLogs.unshift(dummyAudit);

  res.json({
    success: true,
    auditLog: dummyAudit,
    addedNodes,
    addedEdges,
    maskedText: masked
  });
}

// Agent Action Execution
app.post("/api/agent/run", async (req, res) => {
  try {
    const { agentId, instruction, user } = req.body;

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ error: "Task description instruction is empty" });
    }

    // Configure specific agent personalities and instructions
    let agentName = "Company Brain Agent";
    let systemRole = "You are a Company Brain autonomous operation agent.";

    if (agentId === "agent_onboarding") {
      agentName = "Onboarding Advisor";
      systemRole = `You are the Onboarding Advisor. Your singular mission is to digest employee onboarding tasks, examine the company Skills Graph, and provide detailed checklists, runbooks, and correct subject-matter experts to contact.
When asked a question, query your skills graph context to point out exactly which senior employees (nodes of type 'Person') have demonstrated skills (nodes of type 'Skill') relevant to their task. Highlight the operational decisions and playbooks to use. Use the exact provided nodes.`;
    } else if (agentId === "agent_resolution") {
      agentName = "Resolution Escaler Advisor";
      systemRole = `You are the Incident Resolution & Task Escaler Agent. Your job is to route high-severity alerts or tricky tickets to the most experienced, compliant team possible.
Analyse the incident context. Check the Skills Graph: identify which engineers ('Person' nodes) solved similar tasks or incidents previously ('Task' nodes), or who possess the required compliant 'Skill' nodes. Recommend the primary engineer, secondary backup, and provide a rollback protocol.`;
    } else if (agentId === "agent_proposal") {
      agentName = "RFP / Proposal Writer Agent";
      systemRole = `You are the RFP & Proposal Writer Agent. Your job is to draft technical project proposals or answers to clients by leveraging the company's historical decisions, structural projects, and team talents.
Query the Skills Graph. Synthesize information from previous successful projects ('Project' nodes), architectural guidelines and decisions ('Decision' nodes), and list the engineering staff who possess the relevant knowledge of those details.`;
    }

    // Prepare full Skills Graph summary for context (data gravity)
    const graphString = JSON.stringify({ nodes, edges }, null, 2);

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.warn("Skipping real Gemini agent run due to missing API Key. Simulating fallback.");
      return handleSimulatedAgentRun(res, agentId, agentName, instruction, user);
    }

    const AgentSchema = {
      type: Type.OBJECT,
      properties: {
        decision: { type: Type.STRING, description: "The final recommendation, checklist, draft, or routing action provided by the agent." },
        confidence: { type: Type.INTEGER, description: "A confidence percentage rating from 0 to 100 based on graph density and documentation quality." },
        reasoning: { type: Type.STRING, description: "The logical reasoning tracing the path across graph nodes (e.g., how Person A was mapped to Skill B via Project C)." },
        consultedNodes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "An array of exact ID strings of nodes in the graph that you queried or relied on."
        },
        rollbackPath: { type: Type.STRING, description: "Clear step-by-step commands or business instructions to safely undo or rollback this action." }
      },
      required: ["decision", "confidence", "reasoning", "consultedNodes", "rollbackPath"]
    };

    const promptText = `TASK INSTRUCTION: ${instruction}
    
Current live Skills Graph Database Context:
${graphString}

Analyze this graph context. Tracing nodes and edges, formulate the best decision. Rely only on details available in the network. If data is sparse, state the limitations and lower your confidence score. Do not expose secrets or make up facts. Return output matching the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: systemRole,
        responseMimeType: "application/json",
        responseSchema: AgentSchema
      }
    });

    const agentResult = JSON.parse(response.text || "{}");

    // Formulate final Agent Action log entry
    const actionLogId = "agent_action_" + Math.random().toString(36).substr(2, 9);
    const newAgentLog: AgentActionLog = {
      id: actionLogId,
      timestamp: new Date().toISOString(),
      agentId,
      agentName,
      userTriggered: user || "anonymous-coordinator@company.com",
      taskPrompt: instruction,
      decision: agentResult.decision || "Unresolved - Sparse Graph Data",
      confidence: typeof agentResult.confidence === "number" ? agentResult.confidence : 50,
      reasoning: agentResult.reasoning || "Reasoning engine unavailable.",
      consultedNodes: agentResult.consultedNodes || [],
      rollbackPath: agentResult.rollbackPath || "No mechanical rollback found.",
      isRolledBack: false
    };

    agentLogs.unshift(newAgentLog);

    res.json({
      success: true,
      log: newAgentLog
    });

  } catch (error: any) {
    console.error("Agent Execution Error:", error);
    res.status(500).json({ error: "Failed to execute agent workflow due to an internal execution error." });
  }
});

// Helper for local offline simulated agent run
function handleSimulatedAgentRun(res: any, agentId: string, agentName: string, instruction: string, user: string) {
  const matchingNodes: string[] = [];
  let decision = "";
  let reasoning = "";
  let rollbackPath = "";

  const instLower = instruction.toLowerCase();

  if (agentId === "agent_onboarding") {
    if (instLower.includes("spanner") || instLower.includes("database") || instLower.includes("lock")) {
      matchingNodes.push("person_elena", "skill_spanner", "doc_spanner_failover", "task_spanner_lock");
      decision = "Onboarding Briefing Generated: Pointed the engineer to 'Elena Vance' (Principal Infrastructure Architect) as primary advisor on Multi-Region Spanner locks. Recommended study of 'Q2 Spanner Failover Playbook'.";
      reasoning = "Elena Vance is listed on the graph as having resolved the checkout service Spanner Lock Contention incident and demonstrating expert level Spanner DBMS skills. This incident had direct edges to the failover runbook.";
      rollbackPath = "Archive onboarding document draft and notify developer coordinator to clean checklist logs.";
    } else {
      matchingNodes.push("doc_platform_wiki", "person_marcus");
      decision = "Developer Platform Briefing Generated: Refer to 'Marcus Young' and study local Skaffold docker procedures on developer platforms.";
      reasoning = "We detected standard platform terms. Checked platform engineering wiki and mapped to author Marcus Young.";
      rollbackPath = "Archive temporary platforms document.";
    }
  } else if (agentId === "agent_resolution") {
    if (instLower.includes("secret") || instLower.includes("security") || instLower.includes("auth") || instLower.includes("key")) {
      matchingNodes.push("person_devon", "skill_encryption", "skill_oauth", "task_cors_vulnerability", "decision_envelope_kms");
      decision = "Incident Escalated to DevOps/Infosec: Recommending Devon Chen as primary responder for authentication security alerts with 90% confidence, using secure Client-Side envelope rules.";
      reasoning = "Devon Chen demonstrated skills in OAuth 2.0 Security and Envelope Encryption, and previously resolved the Auth Gateway CORS incident with zero escalated incidents since.";
      rollbackPath = "De-allocate DevOps pager rotation allocation and restore backup priority line.";
    } else {
      matchingNodes.push("person_elena", "task_spanner_lock");
      decision = "Task Escalated to Infra Architect Team: Appointed Elena Vance to evaluate current replication latency trends.";
      reasoning = "Elena has active history resolving SEV-1 Spanner contention, making her the highest-skilled cluster responder.";
      rollbackPath = "Revert platform ticket assignee to default pool.";
    }
  } else { // Marketing/RFP
    matchingNodes.push("project_helios", "person_aria", "skill_gemini");
    decision = "Synthesized RFP Bid Proposal Document: Highlights 'Project Helios Checkout Engine' as our key distributed performance benchmark, citing 'Aria Kulkarni' as the Staff AI lead utilizing specialized Multi-Modal RAG pipelines.";
    reasoning = "RFP required proof of next-generation distributed transaction systems. Traced Helios Checkout project to AI expert Aria Kulkarni who demonstrated advanced prompt design skills.";
    rollbackPath = "Purge generated pitch copy from company proposals repository.";
  }

  const logId = "agent_action_" + Math.random().toString(36).substr(2, 9);
  const dummyLog: AgentActionLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    agentId,
    agentName,
    userTriggered: user || "demo-coordinator@company.com",
    taskPrompt: instruction,
    decision,
    confidence: 88,
    reasoning,
    consultedNodes: matchingNodes,
    rollbackPath,
    isRolledBack: false
  };

  agentLogs.unshift(dummyLog);

  res.json({
    success: true,
    log: dummyLog
  });
}

// Rollback Agent Action
app.post("/api/agent/rollback", (req, res) => {
  const { logId } = req.body;
  const index = agentLogs.findIndex(l => l.id === logId);
  if (index === -1) {
    return res.status(404).json({ error: "Action log not found" });
  }

  agentLogs[index].isRolledBack = true;
  agentLogs[index].rolledBackAt = new Date().toISOString();

  // Create an Ingestion/Governance log regarding rollback auditing
  const auditId = "ingest_audit_" + Math.random().toString(36).substr(2, 9);
  ingestionLogs.unshift({
    id: auditId,
    timestamp: new Date().toISOString(),
    user: "System Audit Monitor",
    source: `Action Log ID: ${logId}`,
    action: "Rollback Action Execution Override",
    piiDetected: false,
    piiCount: 0,
    piiTypes: [],
    byteSize: 200,
    retentionDays: 180,
    consentChecked: true,
    status: `REVOKED & REVERSED: Rolled back recommendation for '${agentLogs[index].agentName}'`
  });

  res.json({ success: true, log: agentLogs[index] });
});

// ==========================================
// VITE AND STATIC SERVING MAIN ENTRY
// ==========================================
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode Vite Setup
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Dist Serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Company Brain server running on http://localhost:${PORT}`);
  });
}

runServer();
