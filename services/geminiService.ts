import { GoogleGenAI, Type } from "@google/genai";
import { ProjectAnalysis } from "../types";

// Using the mapped model name for 'gemini-2.5-flash-lite' as per instructions
const MODEL_NAME = 'gemini-flash-lite-latest';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDashboardInsights = async (projects: ProjectAnalysis[]): Promise<string> => {
  try {
    // Filter out completed projects to focus on active work
    const activeWork = projects.filter(p => p.project.status !== 'Completed' && p.project.status !== 'Archived');
    
    const prompt = `
      You are a Project Management AI Assistant. Analyze the following project health data.
      
      Rules:
      1. Identify projects that are 'Abandoned' (>10 days inactive) or 'Neglected' (>5 days inactive).
      2. Provide a concise, bulleted summary of risks.
      3. Recommend specific actions for the 3 most critical projects.
      4. Keep the tone professional but urgent where necessary.
      
      Project Data:
      ${JSON.stringify(activeWork.map(p => ({
        name: p.project.name,
        daysInactive: p.daysSinceTouch,
        status: p.project.status,
        rotLevel: p.rotLevel,
        owner: p.project.owner
      })), null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert agile project manager focused on unblocking teams and reducing project rot.",
        temperature: 0.3, // Lower temperature for more factual analysis
      }
    });

    return response.text || "No insights could be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI insights at this time. Please check your API configuration.";
  }
};