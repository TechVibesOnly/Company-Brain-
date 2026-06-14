import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { 
  fsReadFile, 
  fsWriteFile, 
  fsListDirectory,
  fsWatchDirectory,
  fsExtractSignals 
} from "./tools/fs-tools";

const server = new Server(
  {
    name: "company-brain-filesystem",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fs_read_file",
        description: "Read local configuration files or documentation inside safe sandboxed directory.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      },
      {
        name: "fs_write_file",
        description: "Write local files or structural documentation inside safe sandboxed directory.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "fs_list_directory",
        description: "List directory contents in sandboxed workspace paths to find files.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      },
      {
        name: "fs_watch_directory",
        description: "Register persistent recursive chokidar file watchers on safe folder paths.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      },
      {
        name: "fs_extract_signals",
        description: "Read a local file and prompt server-side Gemini to distill concepts, components, engineering staff, and decisions.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      }
    ]
  };
});

// Tool call resolver
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const typedArgs = (args || {}) as any;

  try {
    switch (name) {
      case "fs_read_file": {
        const result = await fsReadFile(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "fs_write_file": {
        const result = await fsWriteFile(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "fs_list_directory": {
        const result = await fsListDirectory(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "fs_watch_directory": {
        const result = await fsWatchDirectory(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "fs_extract_signals": {
        const result = await fsExtractSignals(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: err.message || "Unknown error during tool execution." }]
    };
  }
});

// Start transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log("Filesystem MCP Server connected via stdio transport.");
}).catch((err) => {
  console.error("Failed to start server", err);
});
