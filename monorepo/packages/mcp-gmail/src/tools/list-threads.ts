import { listThreads } from "../utils/gmail-client.js";

export const toolDefinition = {
  name: "gmail_list_threads",
  description: "List email threads matching optional Gmail query options. Includes pagination support.",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  inputSchema: {
    type: "object",
    properties: {
      maxResults: { type: "number", description: "Maximum threads to fetch (default: 20)" },
      pageToken: { type: "string", description: "Optional page Token for retrieving next batch" },
      labelIds: { type: "array", items: { type: "string" }, description: "Optional list of label IDs to filter" }
    }
  }
};

export async function handler(args: any) {
  try {
    return await listThreads({
      maxResults: args.maxResults,
      pageToken: args.pageToken,
      labelIds: args.labelIds
    });
  } catch (error: any) {
    return {
      error: {
        code: "GMAIL_LIST_THREADS_ERROR",
        message: error.message || "Failed to list Gmail threads.",
        suggestion: "Ensure GMAIL_REFRESH_TOKEN is fully configured and authorized."
      }
    };
  }
}
