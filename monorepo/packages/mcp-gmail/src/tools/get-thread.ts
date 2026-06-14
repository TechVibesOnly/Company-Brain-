import { getThread } from "../utils/gmail-client.js";

export const toolDefinition = {
  name: "gmail_get_thread",
  description: "Retrieve comprehensive details, headers, messages, body parts, and attachments of a thread from Gmail by thread ID.",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  inputSchema: {
    type: "object",
    properties: {
      threadId: { type: "string", description: "The unique identifier of the email thread to fetch" }
    },
    required: ["threadId"]
  }
};

export async function handler(args: any) {
  if (!args.threadId) {
    return {
      error: {
        code: "MISSING_PARAMETER",
        message: "Required parameter 'threadId' is missing.",
        suggestion: "Verify that a valid 'threadId' string is sent as an argument."
      }
    };
  }

  try {
    return await getThread(args.threadId);
  } catch (error: any) {
    return {
      error: {
        code: "GMAIL_GET_THREAD_ERROR",
        message: error.message || `Failed to fetch thread with ID: ${args.threadId}`,
        suggestion: "Check if the threadId exists and GMAIL_REFRESH_TOKEN has permissions to view it."
      }
    };
  }
}
