import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { 
  driveListFiles, 
  driveGetFileContent, 
  driveExtractSignals,
  driveWatchFolder,
  driveProcessChange 
} from "./tools/drive-tools";

const server = new Server(
  {
    name: "company-brain-drive",
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
        name: "drive_list_files",
        description: "List structural corporate files from Google Drive folder system.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            query: { type: "string" },
            fields: { type: "string" },
            pageToken: { type: "string" },
            orderBy: { type: "string" }
          },
          required: ["userId"]
        }
      },
      {
        name: "drive_get_file_content",
        description: "Retrieve content text of any slide, doc, sheet, or text file inside Google Drive.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            fileId: { type: "string" },
            mimeType: { type: "string" }
          },
          required: ["userId", "fileId"]
        }
      },
      {
        name: "drive_extract_signals",
        description: "Run server-side Gemini prompt extraction to secure topics, skills expertise, projects, and decisions inside a file.",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            fileId: { type: "string" },
            mimeType: { type: "string" }
          },
          required: ["userId", "fileId"]
        }
      },
      {
        name: "drive_watch_folder",
        description: "Set up Google Drive change channel watch push notifications for folder directories.",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            folderId: { type: "string" },
            channelId: { type: "string" }
          },
          required: ["userId", "folderId", "channelId"]
        }
      },
      {
        name: "drive_process_change",
        description: "Processes changed folders logs starting from an enterprise index parameter.",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            changeId: { type: "string" }
          },
          required: ["userId", "changeId"]
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
      case "drive_list_files": {
        const result = await driveListFiles(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "drive_get_file_content": {
        const result = await driveGetFileContent(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "drive_extract_signals": {
        const result = await driveExtractSignals(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "drive_watch_folder": {
        const result = await driveWatchFolder(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "drive_process_change": {
        const result = await driveProcessChange(typedArgs);
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
  console.log("Drive MCP Server connected via stdio transport.");
}).catch((err) => {
  console.error("Failed to start server", err);
});
