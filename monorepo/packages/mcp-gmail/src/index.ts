import express from "express";
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

// Import tool definitions and handlers
import { toolDefinition as listThreadsDef, handler as listThreadsHandler } from "./tools/list-threads.js";
import { toolDefinition as getThreadDef, handler as getThreadHandler } from "./tools/get-thread.js";
import { toolDefinition as extractSignalsDef, handler as extractSignalsHandler } from "./tools/extract-signals.js";
import { toolDefinition as watchDef, handler as watchHandler } from "./tools/watch.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize official Model Context Protocol server metadata
const mcpServer = new Server(
  {
    name: "company-brain-gmail",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Map of tool handles
const toolsMap: Record<string, { definition: any; handler: (args: any) => Promise<any> }> = {
  [listThreadsDef.name]: { definition: listThreadsDef, handler: listThreadsHandler },
  [getThreadDef.name]: { definition: getThreadDef, handler: getThreadHandler },
  [extractSignalsDef.name]: { definition: extractSignalsDef, handler: extractSignalsHandler },
  [watchDef.name]: { definition: watchDef, handler: watchHandler }
};

// 1. Declare tool definitions via MCP Request Handler
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(toolsMap).map(t => t.definition)
  };
});

// 2. Resolve tool calls dynamically via MCP Request Handler
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolEntry = toolsMap[name];

  if (!toolEntry) {
    throw new Error(`Tool not found: ${name}`);
  }

  try {
    const result = await toolEntry.handler(args || {});
    
    // Check if the result represents an error response
    if (result && result.error) {
      return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          error: {
            code: "TOOL_EXECUTION_FATAL",
            message: error.message || "Unknown error during tool execution.",
            suggestion: "Please check service logs or verify environment variables configuration."
          }
        }) 
      }]
    };
  }
});

// Active sse transports tracker
const activeTransports: SSEServerTransport[] = [];

// ==========================================
// MCP SSE HTTP TRANSPORT ENDPOINTS
// ==========================================

/**
 * Establishment endpoint for streamable HTTP Server-Sent Events context session.
 */
app.get("/sse", async (req, res) => {
  console.log("Establishing standard Server-Sent Events (SSE) session context...");
  
  // SSEServerTransport writes SSE header protocols to res
  const transport = new SSEServerTransport("/messages", res);
  activeTransports.push(transport);

  await mcpServer.connect(transport);

  req.on("close", () => {
    console.log(`Closing SSE session. Session ID: ${transport.sessionId}`);
    const index = activeTransports.indexOf(transport);
    if (index !== -1) {
      activeTransports.splice(index, 1);
    }
  });
});

/**
 * Post message channel utilized by MCP client once SSE is connected.
 */
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = activeTransports.find(t => t.sessionId === sessionId);

  if (transport) {
    await transport.handleMessage(req, res);
  } else {
    res.status(404).json({
      error: {
        code: "SESSION_NOT_FOUND",
        message: "No active SSE transport session identified with current sessionId.",
        suggestion: "Please initiate an SSE connection on GET /sse first."
      }
    });
  }
});

// ==========================================
// PURE STATELESS HTTP REST ENDPOINTS (JSON)
// ==========================================

/**
 * Direct tool execution REST portal.
 * Invokes standard tool handlers statelessly on HTTP body POST trigger without needing SSE sessions.
 * Matches rule-based error structures on all parameters.
 */
app.post("/api/tool/:name", async (req, res) => {
  const toolName = req.params.name;
  const toolEntry = toolsMap[toolName];

  if (!toolEntry) {
    return res.status(404).json({
      error: {
        code: "TOOL_NOT_FOUND",
        message: `Requested tool '${toolName}' is not supported by the Gmail MCP service.`,
        suggestion: "Verify the tool pathname or fetch available tools list."
      }
    });
  }

  try {
    const rawArgs = req.body || {};
    // Extract parameters from nested objects if encapsulated inside 'arguments' key
    const args = rawArgs.arguments || rawArgs;

    const result = await toolEntry.handler(args);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: "HTTP_TOOL_INVOCATION_FAILED",
        message: error.message || "An unexpected error occurred during direct HTTP rest execution.",
        suggestion: "Ensure that GMAIL_REFRESH_TOKEN and necessary credentials are correct."
      }
    });
  }
});

/**
 * Fetch list of tools available along with their declarations metadata statelessly.
 */
app.get("/api/tools", (req, res) => {
  const tools = Object.values(toolsMap).map(t => t.definition);
  return res.json({ tools });
});

/**
 * Health check routing.
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", activeSessions: activeTransports.length });
});

// Server boot listener binding strictly to port 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`====================================================`);
  console.log(`Gmail MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`- SSE Endpoint  : GET  /sse`);
  console.log(`- Messages Post : POST /messages?sessionId=<session_id>`);
  console.log(`- REST API Portal: POST /api/tool/<tool_name>`);
  console.log(`====================================================`);
});
