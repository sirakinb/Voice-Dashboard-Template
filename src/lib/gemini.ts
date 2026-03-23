import "server-only";

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

function getGeminiClient() {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export async function generateGeminiText(prompt: string, model: string) {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim() ?? "";
}
