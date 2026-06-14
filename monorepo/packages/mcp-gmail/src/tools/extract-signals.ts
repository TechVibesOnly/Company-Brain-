import { getThread } from "../utils/gmail-client.js";
import { getGeminiClient } from "../utils/gemini-client.js";
import { Type } from "@google/genai";

export const toolDefinition = {
  name: "gmail_extract_signals",
  description: "Runs server-side Gemini structured schema parsing to discover technical skills, corporate decisions, and project urgency from an email thread.",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  inputSchema: {
    type: "object",
    properties: {
      threadId: { type: "string", description: "The identifier of the email thread to analyze" }
    },
    required: ["threadId"]
  }
};

// Response schema configuration mapping directly to Rule 5 specifications
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    skills_demonstrated: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill_name: { type: Type.STRING, description: "Name of the professional technical or corporate skill demonstrated" },
          category: { type: Type.STRING, description: "Relevant field or domain category" },
          evidence_quote: { type: Type.STRING, description: "Direct short text quote showing evidence of the skill inside the thread" },
          confidence: { type: Type.INTEGER, description: "Confidence score percentage (0-100)" }
        },
        required: ["skill_name", "category", "evidence_quote", "confidence"]
      },
      description: "Array of skills demonstrated or evidenced in the conversation text"
    },
    decisions_made: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          decision_text: { type: Type.STRING, description: "Text outlining the specific choice, mandate, policy, or route decided on" },
          made_by_email: { type: Type.STRING, description: "Full email of the principal person or party who settled this choice" },
          rationale_inferred: { type: Type.STRING, description: "The core reason or context explaining why this choice was made" },
          confidence: { type: Type.INTEGER, description: "Confidence score percentage (0-100)" }
        },
        required: ["decision_text", "made_by_email", "rationale_inferred", "confidence"]
      },
      description: "Array of key decisions made, settled, or resolved in the thread"
    },
    task_type: { 
      type: Type.STRING, 
      description: "The primary operational task context categorizing this conversation flow" 
    },
    people_involved: {
      type: Type.ARRAY,
      items: { type: Type.STRING, description: "A participant's full email address" },
      description: "List of all emails of people involved or referenced actively in the thread"
    },
    urgency_level: {
      type: Type.STRING,
      description: "Must be exactly one of: 'low' | 'medium' | 'high' | 'critical'"
    },
    should_store_in_brain: {
      type: Type.BOOLEAN,
      description: "Whether this represents high-value organizational knowledge that should be permanently indexed"
    },
    store_reason: {
      type: Type.STRING,
      description: "The background reason advising why or why not this thread belongs inside the corporate digital memory"
    }
  },
  required: [
    "skills_demonstrated",
    "decisions_made",
    "task_type",
    "people_involved",
    "urgency_level",
    "should_store_in_brain",
    "store_reason"
  ]
};

export async function handler(args: any) {
  if (!args.threadId) {
    return {
      error: {
        code: "MISSING_PARAMETER",
        message: "Required parameter 'threadId' is missing.",
        suggestion: "Ensure a valid thread ID string is supplied for extraction."
      }
    };
  }

  try {
    const threadData = await getThread(args.threadId);
    
    // Stitch email message logs together to feed to Gemini
    const threadFormattedText = threadData.messages
      .map(
        (m) =>
          `Message ID: ${m.id}\nFrom: ${m.from}\nTo: ${m.to}\nDate: ${m.date}\nSubject: ${m.subject}\nBody:\n${m.bodyText}`
      )
      .join("\n\n---\n\n");

    const ai = getGeminiClient();

    const systemInstruction = `You are the lead entity extraction engine for Company Brain. Analyze the following enterprise conversation thread to glean professional skills, critical operational decisions, and overall urgency indices. Under no circumstances should you generate fictive records—only extract based on actual dialogue text. Ensure formatting strictly conforms to the JSON schema.`;

    const promptText = `Analyze this corporate email thread to extract demonstrated skills, decisions, participants list, urgency level, and whether it fits corporate brain ingestion.
    
    Email Conversation Logs:
    ${threadFormattedText}`;

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const outputText = geminiResponse.text || "{}";
    return JSON.parse(outputText);

  } catch (error: any) {
    return {
      error: {
        code: "GMAIL_EXTRACT_SIGNALS_ERROR",
        message: error.message || `Failed to extract AI signals for thread with ID ${args.threadId}`,
        suggestion: "Verify that GEMINI_API_KEY is configured and valid, and GMAIL_REFRESH_TOKEN has access to the target thread."
      }
    };
  }
}
