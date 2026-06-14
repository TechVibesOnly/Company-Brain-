import { getAuthorizedDriveClient } from "../utils/oauth";
import { getGeminiClient } from "../utils/gemini-client";
import { Type } from "@google/genai";

export async function driveListFiles(args: {
  userId: string;
  query?: string;
  fields?: string;
  pageToken?: string;
  orderBy?: string;
}) {
  const drive = await getAuthorizedDriveClient(args.userId);
  const response = await drive.files.list({
    q: args.query || "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
    fields: args.fields || "nextPageToken, files(id, name, mimeType, modifiedTime, size)",
    pageToken: args.pageToken,
    orderBy: args.orderBy || "modifiedTime desc"
  });

  return {
    files: response.data.files || [],
    nextPageToken: response.data.nextPageToken || null
  };
}

export async function driveGetFileContent(args: {
  userId: string;
  fileId: string;
  mimeType?: string;
}) {
  const drive = await getAuthorizedDriveClient(args.userId);
  
  // For binary files like Google Docs/Slides, export them as plain text
  if (args.mimeType?.startsWith("application/vnd.google-apps.")) {
    const exportMime = "text/plain";
    const res = await drive.files.export({
      fileId: args.fileId,
      mimeType: exportMime
    }, { responseType: "text" });
    return {
      content_text: res.data as string,
      metadata: { fileId: args.fileId, exported: true, mimeType: exportMime }
    };
  }

  // Otherwise list direct downloads for text media
  const response = await drive.files.get({
    fileId: args.fileId,
    alt: "media"
  }, { responseType: "text" });

  return {
    content_text: response.data as string,
    metadata: { fileId: args.fileId, exported: false }
  };
}

export async function driveExtractSignals(args: { userId: string; fileId: string; mimeType?: string }) {
  const fileData = await driveGetFileContent(args);
  const ai = getGeminiClient();

  const schema = {
    type: Type.OBJECT,
    properties: {
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      expertise_demonstrated: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            person_email: { type: Type.STRING },
            skill: { type: Type.STRING },
            evidence: { type: Type.STRING }
          },
          required: ["person_email", "skill", "evidence"]
        }
      },
      related_projects: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      key_decisions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING },
            rationale: { type: Type.STRING }
          },
          required: ["decision", "rationale"]
        }
      }
    },
    required: ["topics", "expertise_demonstrated", "related_projects", "key_decisions"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Examine the document text listed below. Extract structural organizational topics, expertise levels matching authors/commenters, linked project terms, and architectural choice summaries. Use only text evidence.
    
    Document Context:
    ${fileData.content_text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function driveWatchFolder(args: { userId: string; folderId: string; channelId: string }) {
  const drive = await getAuthorizedDriveClient(args.userId);
  const response = await drive.files.watch({
    fileId: args.folderId,
    requestBody: {
      id: args.channelId,
      type: "web_hook",
      address: `https://ais-pre-gpugpis4hbxsp4mmyfvn4y-346359161411.asia-southeast1.run.app/api/webhooks/drive?userId=${args.userId}`
    }
  });
  return response.data;
}

export async function driveProcessChange(args: { userId: string; changeId: string }) {
  const drive = await getAuthorizedDriveClient(args.userId);
  // Real implementation triggers deep changes analysis
  return { status: "processed", changeId: args.changeId };
}
