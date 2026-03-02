// ──────────────────────────────────────────────────────
// B-Roll Service — Gemini-powered keyword suggestions
// Reads transcript + topic → suggests relevant B-Roll search terms
// ──────────────────────────────────────────────────────

import { GoogleGenAI, Type, Schema } from "@google/genai";

export interface BRollSuggestion {
    keyword: string;
    startTime: number;
    endTime: number;
    reason: string;
    type: 'video' | 'image';
}

export interface BRollClip {
    id: string;
    keyword: string;
    startTime: number;
    endTime: number;
    sourceUrl: string;     // Download / streaming URL
    thumbnailUrl: string;
    type: 'video' | 'image';
    credit: string;
    pexelsId?: number;
}

/**
 * Uses Gemini to analyze the transcript and suggest B-Roll keywords
 * tied to specific time ranges in the video.
 */
export async function suggestBRollKeywords(
    srtText: string,
    topicContext: string,
    apiKey: string
): Promise<BRollSuggestion[]> {
    if (!apiKey) throw new Error("API Key is required for B-Roll suggestions");

    const ai = new GoogleGenAI({ apiKey });

    const suggestionSchema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                keyword: { type: Type.STRING, description: "Search keyword for stock footage (2-4 words, specific and visual)" },
                startTime: { type: Type.NUMBER, description: "Start time in seconds when this B-Roll should appear" },
                endTime: { type: Type.NUMBER, description: "End time in seconds when this B-Roll should end" },
                reason: { type: Type.STRING, description: "Brief reason why this B-Roll enhances the video" },
                type: { type: Type.STRING, enum: ['video', 'image'], description: "Whether to search for video clips or still images" },
            },
            required: ["keyword", "startTime", "endTime", "reason", "type"],
        },
    };

    const prompt = `You are a professional video editor analyzing a transcript for a short-form video (Reel/TikTok).

TOPIC: ${topicContext || "General Content"}

TRANSCRIPT (SRT format):
${srtText}

TASK: Suggest 4-8 B-Roll clips (stock footage or images) that would make this video more engaging and visually dynamic.

RULES:
1. Each suggestion must have a specific, searchable keyword (e.g., "rocket launch flames", "cyberpunk city night", "hands typing keyboard", "stock market chart green")
2. Keywords must be visually concrete — things you can actually find on stock footage sites
3. Time ranges should align with the transcript — insert B-Roll when the speaker mentions related concepts
4. Each B-Roll clip should be 2-5 seconds long
5. Prefer "video" type for action/movement scenes, "image" type for concepts/data
6. Avoid generic keywords like "technology" or "business" — be specific
7. Don't overlap time ranges`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestionSchema,
            },
        });

        const suggestions = JSON.parse(response.text || "[]");
        return suggestions as BRollSuggestion[];
    } catch (error: any) {
        console.error("B-Roll suggestion error:", error);
        throw new Error(`Failed to generate B-Roll suggestions: ${error.message}`);
    }
}
