-- ====================================================================
-- COMPANY BRAIN PLATFORM SCHEMA - MIGRATION VERSION 1.0 (PostgreSQL + pgvector)
-- ====================================================================

-- Enable PG Vector Extension for horizontal semantic searches
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension for secure cluster generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. CORE ENTITIES
-- --------------------------------------------------------------------

-- Persons / Employees
CREATE TABLE IF NOT EXISTS persons (
    id VARCHAR(100) PRIMARY KEY, -- standard: person_samantha, person_marcus
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    tenure_months INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Professional Skills
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(100) PRIMARY KEY, -- standard: skill_spanner_ops, skill_rust_assembly
    skill_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Historic Tasks and Incidents
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(100) PRIMARY KEY, -- standard: task_spanner_lock, task_cors_vulnerability
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL, -- e.g. SEV-1, SEV-2
    status VARCHAR(50) DEFAULT 'Resolved',
    resolved_by_person_id VARCHAR(100) REFERENCES persons(id) ON DELETE SET NULL,
    resolution_details TEXT NOT NULL,
    resolution_time_hours DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Documents and Knowledge Artifacts
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(100) PRIMARY KEY, -- standard: doc_runbook_auth, doc_encrypt_rfc
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_path TEXT,
    raw_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Architectural Decisions and Policies
CREATE TABLE IF NOT EXISTS decisions (
    id VARCHAR(100) PRIMARY KEY, -- standard: decision_token_rotation, decision_write_thru_cache
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_by_person_id VARCHAR(100) REFERENCES persons(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company Strategic Initiatives & Projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY, -- standard: project_helios, project_zephyr
    project_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 2. KNOWLEDGE GRAPH EDGES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    edge_type VARCHAR(150) NOT NULL, -- e.g., demonstrated_by, required_for, informed_by, resolved_by, associated_with
    label VARCHAR(255) NOT NULL, -- friendly human language description
    weight DOUBLE PRECISION DEFAULT 1.0, -- relevance multiplier
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique relationships
    CONSTRAINT unique_edge_rel UNIQUE (source_id, target_id, edge_type)
);

-- Indices for performance graph traversals
CREATE INDEX idx_edges_source ON graph_edges(source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_id);
CREATE INDEX idx_edges_type ON graph_edges(edge_type);

-- --------------------------------------------------------------------
-- 3. EMBEDDING ENGINES FOR VECTOR SEMANTIC SEARCH
-- --------------------------------------------------------------------

-- Universal index model: coordinates node properties and description into dimensional vector space.
-- Coordinates with 'gemini-embedding-001' which outputs 768 dimensions.
CREATE TABLE IF NOT EXISTS node_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) UNIQUE NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    semantic_content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_embeddings_vector ON node_embeddings USING hnsw (embedding vector_cosine_ops);

-- --------------------------------------------------------------------
-- 4. ENTERPRISE COMPLIANCE AUDITING & COMPLIANCE LOGS
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ingestion_audit_logs (
    id VARCHAR(100) PRIMARY KEY, -- e.g. ingest_audit_uuid
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acting_user VARCHAR(255) NOT NULL,
    source_origin VARCHAR(255) NOT NULL, -- e.g., Gmail thread id, local file path
    action VARCHAR(150) NOT NULL, -- e.g., 'API Ingestion Gateway Scan'
    pii_detected BOOLEAN DEFAULT FALSE,
    pii_count INT DEFAULT 0,
    pii_types TEXT[] DEFAULT '{}',
    byte_size BIGINT DEFAULT 0,
    retention_days INT DEFAULT 365,
    consent_checked BOOLEAN DEFAULT TRUE,
    status VARCHAR(100) NOT NULL -- 'Processed', 'Masked & Encrypted', etc.
);

CREATE INDEX idx_audit_timestamp ON ingestion_audit_logs(timestamp);
CREATE INDEX idx_audit_user ON ingestion_audit_logs(acting_user);

-- --------------------------------------------------------------------
-- 5. AUTONOMOUS AGENT DECISION TRAILING & COMPLIANCE ACTIONS
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_action_logs (
    id VARCHAR(100) PRIMARY KEY, -- e.g. agent_action_uuid
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    agent_id VARCHAR(100) NOT NULL, -- e.g., agent_onboarding, agent_resolution
    agent_name VARCHAR(150) NOT NULL,
    user_triggered VARCHAR(255) NOT NULL, -- acting employee coordinates
    task_prompt TEXT NOT NULL,
    decision_payload TEXT NOT NULL,
    confidence INT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    reasoning_path TEXT NOT NULL,
    consulted_nodes TEXT[] DEFAULT '{}', -- exact list of nodes identifiers
    rollback_path TEXT NOT NULL, -- business undo execution context
    is_rolled_back BOOLEAN DEFAULT FALSE,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    rollback_audit_id VARCHAR(100) REFERENCES ingestion_audit_logs(id)
);

CREATE INDEX idx_agent_timestamp ON agent_action_logs(timestamp);
CREATE INDEX idx_agent_id ON agent_action_logs(agent_id);
