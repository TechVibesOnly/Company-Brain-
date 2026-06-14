import * as fs from "fs/promises";
import * as pathResolve from "path";
import chokidar from "chokidar";
import { getGeminiClient } from "../utils/gemini-client";
import { Type } from "@google/genai";

// Restrict filesystem operations in a real enterprise security architecture to authorized roots
const AUTHORIZED_ROOT = process.env.FS_AUTHORIZED_ROOT || "/var/company-brain/shared";

function resolveSafePath(userPath: string): string {
  const resolved = pathResolve.resolve(AUTHORIZED_ROOT, userPath);
  if (!resolved.startsWith(AUTHORIZED_ROOT)) {
    throw new Error("Access Denied: Attempted to escape authorized filesystem sandbox.");
  }
  return resolved;
}

export async function fsReadFile(args: { path: string }) {
  const safePath = resolveSafePath(args.path);
  const content = await fs.readFile(safePath, "utf-8");
  return { content };
}

export async function fsWriteFile(args: { path: string; content: string }) {
  const safePath = resolveSafePath(args.path);
  await fs.mkdir(pathResolve.dirname(safePath), { recursive: true });
  await fs.writeFile(safePath, args.content, "utf-8");
  return { status: "success", writtenBytes: Buffer.byteLength(args.content, "utf-8") };
}

export async function fsListDirectory(args: { path: string }) {
  const safePath = resolveSafePath(args.path);
  const entries = await fs.readdir(safePath, { withFileTypes: true });
  
  const files = entries.map(ent => ({
    name: ent.name,
    isFile: ent.isFile(),
    isDirectory: ent.isDirectory()
  }));

  return { files };
}

export async function fsWatchDirectory(args: { path: string }) {
  const safePath = resolveSafePath(args.path);
  
  // Create passive chokidar file watcher
  const watcher = chokidar.watch(safePath, {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on("all", (event, filepath) => {
    console.log(`[Filesystem Monitor Event]: ${event} observed on ${filepath}`);
    // In production, emit to Redis / Webhooks message brokers to stream signals updates!
  });

  return { status: "watching", watchedPath: safePath };
}

export async function fsExtractSignals(args: { path: string }) {
  const { content } = await fsReadFile(args);
  const ai = getGeminiClient();

  const schema = {
    type: Type.OBJECT,
    properties: {
      concepts: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      system_components: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      decisions_documented: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            decision_title: { type: Type.STRING },
            context: { type: Type.STRING }
          },
          required: ["decision_title", "context"]
        }
      },
      engineering_specialists: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["concepts", "system_components", "decisions_documented", "engineering_specialists"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Analyze this corporate document file contents to extract organizational technical concepts, systems configurations, architect decisions, and highlighted engineering staff names/references:
    
    Document Body:
    ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}");
}
