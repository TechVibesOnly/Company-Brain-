import { getAuthorizedGmailClient } from "./oauth.js";

/**
 * List email threads matching queries or paginations.
 */
export async function listThreads(options: {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}) {
  const gmail = await getAuthorizedGmailClient();
  
  const response = await gmail.users.threads.list({
    userId: "me",
    maxResults: options.maxResults || 20,
    pageToken: options.pageToken,
    q: options.labelIds ? `label:${options.labelIds.join(" OR label:")}` : undefined
  });

  return {
    threads: response.data.threads || [],
    nextPageToken: response.data.nextPageToken || null
  };
}

/**
 * Fetch messages inside a thread by specific ID.
 */
export async function getThread(threadId: string) {
  const gmail = await getAuthorizedGmailClient();
  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId
  });

  const messages = (thread.data.messages || []).map((msg) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    // Parse plain text message bodies
    let bodyText = "";
    if (msg.payload?.parts) {
      const walkParts = (parts: any[]): string => {
        for (const p of parts) {
          if (p.mimeType === "text/plain" && p.body?.data) {
            return Buffer.from(p.body.data, "base64").toString("utf-8");
          }
          if (p.parts) {
            const res = walkParts(p.parts);
            if (res) return res;
          }
        }
        return "";
      };
      bodyText = walkParts(msg.payload.parts);
    }
    
    if (!bodyText && msg.payload?.body?.data) {
      bodyText = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
    }

    return {
      id: msg.id,
      from: getHeader("from"),
      to: getHeader("to"),
      subject: getHeader("subject"),
      date: getHeader("date"),
      bodyText,
      attachments: (msg.payload?.parts || [])
        .filter((p) => p.filename)
        .map((p) => ({
          filename: p.filename,
          mimeType: p.mimeType,
          size: p.body?.size || 0
        }))
    };
  });

  return { messages };
}

/**
 * Register Google Pub/Sub push subscription notifications path.
 */
export async function watchPubSub(topicName: string) {
  const gmail = await getAuthorizedGmailClient();
  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX", "UNREAD"]
    }
  });
  return response.data;
}

/**
 * Retrieve delta log messages starting from an historyId.
 */
export async function processNewInbox(historyId: string) {
  const gmail = await getAuthorizedGmailClient();
  const history = await gmail.users.history.list({
    userId: "me",
    startHistoryId: historyId
  });
  return { history: history.data };
}
