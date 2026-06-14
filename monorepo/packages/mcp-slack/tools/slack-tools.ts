import { WebClient } from "@slack/web-api";
import { getGeminiClient } from "../utils/gemini-client";
import { Type } from "@google/genai";

function getSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN environment variable is not defined.");
  }
  return new WebClient(token);
}

export async function slackListChannels(args: {
  types?: string;
  excludeArchived?: boolean;
}) {
  const slack = getSlackClient();
  const response = await slack.conversations.list({
    types: args.types || "public_channel,private_channel",
    exclude_archived: args.excludeArchived ?? true
  });

  return {
    channels: (response.channels || []).map(c => ({
      id: c.id,
      name: c.name,
      is_channel: c.is_channel,
      num_members: c.num_members
    }))
  };
}

export async function slackGetChannelHistory(args: {
  channelId: string;
  oldest?: string;
  latest?: string;
  limit?: number;
}) {
  const slack = getSlackClient();
  const response = await slack.conversations.history({
    channel: args.channelId,
    oldest: args.oldest,
    latest: args.latest,
    limit: args.limit || 50
  });

  return {
    messages: (response.messages || []).map(m => ({
      user: m.user,
      text: m.text,
      ts: m.ts,
      thread_ts: m.thread_ts
    }))
  };
}

export async function slackGetThreadReplies(args: {
  channelId: string;
  threadTs: string;
}) {
  const slack = getSlackClient();
  const response = await slack.conversations.replies({
    channel: args.channelId,
    ts: args.threadTs
  });

  return {
    messages: (response.messages || []).map(m => ({
      user: m.user,
      text: m.text,
      ts: m.ts
    }))
  };
}

export async function slackExtractSignals(args: { channelId: string; messageTs: string }) {
  // Try retrieving replies to encapsulate full thread conversation
  const replies = await slackGetThreadReplies({ channelId: args.channelId, threadTs: args.messageTs });
  const ai = getGeminiClient();

  const conversationText = replies.messages
    .map(m => `User[${m.user}]: ${m.text}`)
    .join("\n");

  const schema = {
    type: Type.OBJECT,
    properties: {
      skills_demonstrated: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            user_id: { type: Type.STRING },
            skill: { type: Type.STRING },
            evidence: { type: Type.STRING }
          },
          required: ["user_id", "skill", "evidence"]
        }
      },
      decisions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      blockers_identified: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      people_mentioned: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      action_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            task_description: { type: Type.STRING },
            assignee: { type: Type.STRING }
          },
          required: ["task_description", "assignee"]
        }
      }
    },
    required: ["skills_demonstrated", "decisions", "blockers_identified", "people_mentioned", "action_items"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Analyze this conversational Slack thread. Distill professional skills, decisive strategies agreed upon, technical blockers, mentioned personnel IDs, and dynamic actionable checklist points. Rely strictly on text details.
    
    Slack Conversation:
    ${conversationText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function slackSubscribeEvents(args: { eventTypes: string[] }) {
  // Webhook registration simulation
  return { status: "subscribed", topics: args.eventTypes };
}
