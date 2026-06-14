import { watchPubSub, processNewInbox } from "../utils/gmail-client.js";

export const toolDefinition = {
  name: "gmail_watch",
  description: "Sets up Google Pub/Sub push notification subscription channel or retrieves delta change records starting from a specific historyId.",
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  inputSchema: {
    type: "object",
    properties: {
      topicName: { type: "string", description: "The GCP Pub/Sub topic string to register Gmail push notifications" },
      historyId: { type: "string", description: "Opaque enterprise database start marker for indexing incremental inbox changes" }
    }
  }
};

export async function handler(args: any) {
  try {
    if (args.topicName) {
      return await watchPubSub(args.topicName);
    } else if (args.historyId) {
      return await processNewInbox(args.historyId);
    } else {
      return {
        error: {
          code: "MISSING_ACTION_PARAMETERS",
          message: "Required parameters are missing. Please supply at least 'topicName' or 'historyId'.",
          suggestion: "Use 'topicName' to initiate pushing updates, or specify 'historyId' to retrieve incremental inbox changes details."
        }
      };
    }
  } catch (error: any) {
    return {
      error: {
        code: "GMAIL_WATCH_ERROR",
        message: error.message || "Failed to execute watch PubSub channel watch/retrieve incremental changes.",
        suggestion: "Verify GCP pub/sub IAM permissions or startHistoryId correctness."
      }
    };
  }
}
