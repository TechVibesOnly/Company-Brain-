import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required by the Filesystem MCP service.");
    }

    const proxyUrl = process.env.GEMINI_PROXY_URL;

    aiClient = new GoogleGenAI({
      apiKey,
      ...(proxyUrl ? { baseUrl: proxyUrl } : {}),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
