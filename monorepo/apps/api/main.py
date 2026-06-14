import os
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr
from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load enterprise environmental variables
load_dotenv()

app = FastAPI(
    title="Company Brain API Gateway",
    version="1.0.0",
    description="Enterprise server-side system orchestrating semantic PostgreSQL graphs and autonomous AI agents."
)

# Enable CORS for cross-origin compliance
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =================================-------------------------
# PYDANTIC SCHEMAS (DATA CONTRACT TRANSIT SYSTEM)
# =================================-------------------------

class PersonSchema(BaseModel):
    id: str = Field(description="Unique snake_case identifier starting with person_")
    email: EmailStr
    full_name: str
    department: str
    tenure_months: int = 0

class SkillSchema(BaseModel):
    id: str = Field(description="Unique snake_case identifier starting with skill_")
    skill_name: str
    description: str
    category: str

class TaskSchema(BaseModel):
    id: str = Field(description="Unique snake_case identifier starting with task_")
    title: str
    description: str
    severity: str
    status: str = "Resolved"
    resolved_by_person_id: Optional[str] = None
    resolution_details: str
    resolution_time_hours: Optional[float] = None

class DocumentSchema(BaseModel):
    id: str = Field(description="Unique snake_case identifier starting with doc_")
    title: str
    description: str
    mime_type: Optional[str] = None
    file_path: Optional[str] = None
    raw_content: Optional[str] = None

class DecisionSchema(BaseModel):
    id: str = Field(description="Unique snake_case identifier starting with decision_")
    title: str
    description: str
    rationale: str
    created_by_person_id: Optional[str] = None

class ProjectSchema(BaseModel):
    id: str = Field(description="Unique snake_case identifier starting with project_")
    project_name: str
    description: str
    status: str = "Active"

class GraphEdgeSchema(BaseModel):
    source_id: str
    target_id: str
    edge_type: str
    label: str
    weight: float = 1.0
    metadata: Optional[Dict[str, Any]] = None

class AuditLogSchema(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    acting_user: str
    source_origin: str
    action: str
    pii_detected: bool = False
    pii_count: int = 0
    pii_types: List[str] = []
    byte_size: int = 0
    retention_days: int = 365
    consent_checked: bool = True
    status: str

class AgentActionLogSchema(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_id: str
    agent_name: str
    user_triggered: str
    task_prompt: str
    decision_payload: str
    confidence: int
    reasoning_path: str
    consulted_nodes: List[str] = []
    rollback_path: str
    is_rolled_back: bool = False
    rolled_back_at: Optional[datetime] = None

class AIChatQueryArgs(BaseModel):
    prompt: str
    user_id: str
    agent_id: Optional[str] = "general_advisor"

# =================================-------------------------
# IN-MEMORY COMPLIANCE PERSISTENCE FOR CONTAINER DEV MODE
# =================-----------------------------------------
# Allows full API sandbox coverage if PostgreSQL is coupling.

_in_memory_nodes: Dict[str, Dict[str, Any]] = {}
_in_memory_edges: List[Dict[str, Any]] = []
_in_memory_audit_logs: List[Dict[str, Any]] = []
_in_memory_agent_logs: List[Dict[str, Any]] = []

def seed_sandbox_data():
    # Seed nodes
    p1 = {"id": "person_elena", "type": "Person", "label": "Elena Vance", "email": "elena.vance@company.com", "full_name": "Elena Vance", "department": "Platform Architecture", "tenure_months": 96}
    s1 = {"id": "skill_spanner", "type": "Skill", "label": "Google Cloud Spanner", "skill_name": "Google Cloud Spanner", "description": "Horizontal DB Scaling, Lock Contention", "category": "Databases"}
    t1 = {"id": "task_spanner_lock", "type": "Task", "label": "Spanner Lock Contention Resolve", "title": "Spanner Lock Contention Resolve", "description": "SEV-1 database checkout failure", "severity": "SEV-1", "status": "Resolved", "resolved_by_person_id": p1["id"], "resolution_details": "Added write-through cache schema policies."}
    
    _in_memory_nodes[p1["id"]] = p1
    _in_memory_nodes[s1["id"]] = s1
    _in_memory_nodes[t1["id"]] = t1
    
    # Seed edges
    _in_memory_edges.append({"source_id": p1["id"], "target_id": s1["id"], "edge_type": "demonstrated_by", "label": "demonstrates expert database competence"})
    _in_memory_edges.append({"source_id": p1["id"], "target_id": t1["id"], "edge_type": "resolved_by", "label": "resolved outage ticket"})

# Seed on startup
seed_sandbox_data()

# =================================-------------------------
# API GATEWAY ROUTERS
# =================================-------------------------

@app.get("/api/health", status_code=status.HTTP_200_OK)
def get_health():
    return {"status": "operational", "timestamp": datetime.utcnow().isoformat()}

# Graph Node Registrations
@app.post("/api/nodes/person", status_code=status.HTTP_201_CREATED)
def add_person(payload: PersonSchema):
    node_repr = payload.dict()
    node_repr["type"] = "Person"
    node_repr["label"] = payload.full_name
    _in_memory_nodes[payload.id] = node_repr
    return {"status": "created", "node": node_repr}

@app.post("/api/nodes/skill", status_code=status.HTTP_201_CREATED)
def add_skill(payload: SkillSchema):
    node_repr = payload.dict()
    node_repr["type"] = "Skill"
    node_repr["label"] = payload.skill_name
    _in_memory_nodes[payload.id] = node_repr
    return {"status": "created", "node": node_repr}

@app.post("/api/nodes/task", status_code=status.HTTP_201_CREATED)
def add_task(payload: TaskSchema):
    node_repr = payload.dict()
    node_repr["type"] = "Task"
    node_repr["label"] = payload.title
    _in_memory_nodes[payload.id] = node_repr
    return {"status": "created", "node": node_repr}

# Graph Edges Registration
@app.post("/api/edges", status_code=status.HTTP_210_CREATED if hasattr(status, "HTTP_210_CREATED") else 201)
def add_edge(payload: GraphEdgeSchema):
    edge_repr = payload.dict()
    # Check node exits
    if payload.source_id not in _in_memory_nodes or payload.target_id not in _in_memory_nodes:
        raise HTTPException(status_code=400, detail="Source or Target node does not exist in graph registry.")
    _in_memory_edges.append(edge_repr)
    return {"status": "created", "edge": edge_repr}

# Fetch Entire Graph State
@app.get("/api/graph")
def get_graph_state():
    return {
        "nodes": list(_in_memory_nodes.values()),
        "edges": [
            {
                "id": f"edge_{i}",
                "source": e["source_id"],
                "target": e["target_id"],
                "type": e["edge_type"],
                "label": e["label"]
            }
            for i, e in enumerate(_in_memory_edges)
        ]
    }

# Search Semantic Query Vectors Real-Time
@app.get("/api/search")
def search_semantic_relationships(
    q: str = Query(description="Semantic query terms"),
    node_type: Optional[str] = Query(None, description="Optional filter node category")
):
    # Call server-side google-genai client internally in production:
    # api_key = os.getenv("GEMINI_API_KEY")
    # client = GoogleGenAI(api_key=api_key)
    # embedding = client.models.embed_content(model="text-embedding-004", contents=q)
    
    # Calculate local mock HNSW / Cosine similarities over sandbox indexes
    results = []
    q_lower = q.lower()
    for nid, node in _in_memory_nodes.items():
        if node_type and node.get("type") != node_type:
            continue
        # Crude lexical overlap fallback simulator representing vector similarities
        score = 0.1
        if q_lower in node.get("label", "").lower() or q_lower in node.get("description", "").lower():
            score = 0.95
        results.append({
            "node": node,
            "similarity_score": score
        })
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return {"results": results[:10]}

# Ingestion Policy Audits Logger
@app.get("/api/audit-logs")
def fetch_audit_compliance_logs():
    return {"ingestion_logs": _in_memory_audit_logs}

@app.post("/api/audit-logs", status_code=status.HTTP_201_CREATED)
def record_audit_ingress(log: AuditLogSchema):
    _in_memory_audit_logs.insert(0, log.dict())
    return {"status": "success", "log": log}

# Agent Execution Rails
@app.post("/api/agent/execute")
def trigger_agent_decision(payload: AIChatQueryArgs):
    # Formulate Agent logic path using Gemini (lazy load SDK server-side)
    # Return structured schemas tracking decision pathways, consulted logs, and rollback controls
    prompt_lower = payload.prompt.lower()
    
    decision = "Sparse corporate context graph. Please verify node associations."
    reasoning = "Traversed local sandbox index. Standard components could not map directly."
    nodes_consulted = []
    
    if "spanner" in prompt_lower or "database" in prompt_lower:
        decision = "Drafted operational runbook checklist. Assigned Primary escalations responder: Elena Vance (Platform Engineering Expert)."
        reasoning = "Mapped 'Spanner' to skill_spanner on skills node. Evaluated historical tasks: resolved_by edge pointed to Elena Vance."
        nodes_consulted = ["person_elena", "skill_spanner", "task_spanner_lock"]

    agent_log = {
        "id": f"agent_action_{datetime.utcnow().timestamp()}",
        "timestamp": datetime.utcnow().isoformat(),
        "agent_id": payload.agent_id,
        "agent_name": f"Agent {payload.agent_id.upper()}",
        "user_triggered": payload.user_id,
        "task_prompt": payload.prompt,
        "decision_payload": decision,
        "confidence": 95 if nodes_consulted else 50,
        "reasoning_path": reasoning,
        "consulted_nodes": nodes_consulted,
        "rollback_path": f"Rollback allocations assigns for user {payload.user_id}. Reset assignment priority tickets.",
        "is_rolled_back": False
    }
    
    _in_memory_agent_logs.insert(0, agent_log)
    return {"success": True, "action_log": agent_log}

@app.post("/api/agent/rollback")
def request_agent_rollback(log_id: str):
    for log in _in_memory_agent_logs:
        if log["id"] == log_id:
            log["is_rolled_back"] = True
            log["rolled_back_at"] = datetime.utcnow().isoformat()
            
            # Emit audit tracer
            _in_memory_audit_logs.insert(0, {
                "id": f"ingest_audit_rev_{datetime.utcnow().timestamp()}",
                "timestamp": datetime.utcnow(),
                "acting_user": "System Auditor",
                "source_origin": f"ActionLog ID: {log_id}",
                "action": "ROLLBACK OVERRIDE EXECUTION",
                "pii_detected": False,
                "status": f"Successfully revoked decisions made in action {log_id}"
            })
            return {"success": True, "rolled_back_log": log}
            
    raise HTTPException(status_code=404, detail="Agent Action Log ID not found.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
