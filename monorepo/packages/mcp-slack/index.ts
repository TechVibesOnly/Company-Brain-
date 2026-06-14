import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { 
  slackListChannels, 
  slackGetChannelHistory, 
  slackGetThreadReplies,
  slackExtractSignals,
  slackSubscribeEvents 
} from "./tools/slack-tools";

const server = new Server(
  {
    name: "company-brain-slack",
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
        name: "slack_list_channels",
        description: "List slack public/private channels.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            types: { type: "string" },
            excludeArchived: { type: "boolean" }
          },
          required: []
        }
      },
      {
        name: "slack_get_channel_history",
        description: "Read conversation message stream inside a channel.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            channelId: { type: "string" },
            oldest: { type: "string" },
            latest: { type: "string" },
            limit: { type: "number" }
          },
          required: ["channelId"]
        }
      },
      {
        name: "slack_get_thread_replies",
        description: "Fetch replies in a distinct discussion thread.",
        readOnlyHint: true,
        inputSchema: {
          type: "object",
          properties: {
            channelId: { type: "string" },
            threadTs: { type: "string" }
          },
          required: ["channelId", "threadTs"]
        }
      },
      {
        name: "slack_extract_signals",
        description: "Consult Gemini on a Slack discussion thread to retrieve skills, decisions, barriers, and tasks.",
        inputSchema: {
          type: "object",
          properties: {
            channelId: { type: "string" },
            messageTs: { type: "string" }
          },
          required: ["channelId", "messageTs"]
        }
      },
      {
        name: "slack_subscribe_events",
        description: "Register for events updates/webhooks.",
        inputSchema: {
          type: "object",
          properties: {
            eventTypes: { type: "array", items: { type: "string" } }
          },
          required: ["eventTypes"]
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
      case "slack_list_channels": {
        const result = await slackListChannels(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "slack_get_channel_history": {
        const result = await slackGetChannelHistory(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "slack_get_thread_replies": {
        const result = await slackGetThreadReplies(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "slack_extract_signals": {
        const result = await slackExtractSignals(typedArgs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "slack_subscribe_events": {
        const result = await slackSubscribeEvents(typedArgs);
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
  console.log("Slack MCP Server connected via stdio transport.");
}).catch((err) => {
  console.error("Failed to start server", err);
});
