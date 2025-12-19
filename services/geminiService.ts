
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "../types";

export const processMeetingAudio = async (
  base64Audio: string, 
  mimeType: string,
  userTranscript?: string
): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = userTranscript 
    ? `Analyze the following transcript. Provide a concise summary, key points, action items (tasks and owners), and follow-ups.
       
       Transcript: ${userTranscript}`
    : `Transcribe this audio file accurately. Then, provide:
       1. A concise executive summary of the discussion.
       2. A list of key discussion points.
       3. A structured list of action items, identifying the specific task and the responsible owner for each.
       4. Any deadlines or follow-up steps mentioned.
       
       Make sure the 'transcript' field in the JSON contains the full verbatim transcription of the audio.`;

  const audioPart = {
    inlineData: {
      data: base64Audio,
      mimeType: mimeType,
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: userTranscript ? prompt : { parts: [audioPart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          actionItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                owner: { type: Type.STRING }
              },
              required: ["task", "owner"]
            }
          },
          followUps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          transcript: { type: Type.STRING, description: "The full verbatim transcription of the meeting." }
        },
        required: ["summary", "keyPoints", "actionItems", "followUps", "transcript"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as GeminiResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("The AI response could not be parsed. This usually happens with very short or silent audio files.");
  }
};
