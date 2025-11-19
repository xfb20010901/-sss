import { GoogleGenAI, Type } from "@google/genai";
import { MissionData } from '../types';

// Initialize Gemini Client
// Note: In a real production app, never expose API keys on client side.
// This is for the demo sandbox environment where process.env.API_KEY is safe.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelId = 'gemini-2.5-flash';

export const generateMissionBriefing = async (): Promise<MissionData> => {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: "Generate a short, intense cyberpunk mission briefing for a fighter pilot. Return JSON with title, description (max 20 words), and objective.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            objective: { type: Type.STRING }
          },
          required: ["title", "description", "objective"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text) as MissionData;
  } catch (error) {
    console.error("Gemini Mission Error:", error);
    return {
      title: "PROTOCOL_OFFLINE",
      description: "Network connection unstable. Proceed with caution.",
      objective: "Survive the void."
    };
  }
};

export const generateBossTaunt = async (playerScore: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `You are a sentient AI boss in a cyberpunk shooter game. The player has reached score ${playerScore}. Generate a short, menacing, glitchy taunt (max 10 words).`,
      config: {
        maxOutputTokens: 30,
        temperature: 1.2
      }
    });
    return response.text || "SYSTEM ERROR: TERMINATE HUMAN.";
  } catch (error) {
    return "I SEE YOU.";
  }
};