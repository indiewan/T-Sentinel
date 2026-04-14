import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MarketAnalysis {
  sentimentScore: number;
  status: "GO" | "NO-GO" | "HARD LOCK";
  reasoning: string;
  economicCalendar: Array<{
    time: string;
    event: string;
    impact: "High" | "Medium" | "Low";
    description: string;
  }>;
  techNews: Array<{
    headline: string;
    summary: string;
    sentiment: "Bullish" | "Bearish" | "Neutral";
  }>;
  shortSqueezeRisk: {
    level: "High" | "Medium" | "Low";
    warning: string;
  };
}

export async function analyzeMarket(): Promise<MarketAnalysis> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the current market conditions for NQ (Nasdaq 100) and GC (Gold) futures.
    
    Tasks:
    1. Find the daily economic calendar for today (CPI, FOMC, Jobless Claims, etc.).
    2. Analyze tech-sector news (AAPL, MSFT, NVDA, TSLA) for potential catalysts.
    3. Specifically look for "Bullish Divergence" in news: situations where bad news is being ignored by the market, indicating a likely short-covering rally (squeeze).
    4. Identify any high-impact news events (red folder) happening today.
    
    Output the analysis in JSON format with the following structure:
    {
      "sentimentScore": number (1-10),
      "status": "GO" | "NO-GO" | "HARD LOCK",
      "reasoning": "string explaining the status",
      "economicCalendar": [
        { "time": "HH:MM", "event": "string", "impact": "High" | "Medium" | "Low", "description": "string" }
      ],
      "techNews": [
        { "headline": "string", "summary": "string", "sentiment": "Bullish" | "Bearish" | "Neutral" }
      ],
      "shortSqueezeRisk": {
        "level": "High" | "Medium" | "Low",
        "warning": "string describing the risk of a short covering rally"
      }
    }
    
    Constraint: If there is a high-impact news event within 30 minutes of the current time, set status to "HARD LOCK".
    Current Time: ${new Date().toISOString()}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentimentScore: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ["GO", "NO-GO", "HARD LOCK"] },
            reasoning: { type: Type.STRING },
            economicCalendar: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  event: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  description: { type: Type.STRING }
                },
                required: ["time", "event", "impact"]
              }
            },
            techNews: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] }
                },
                required: ["headline", "summary", "sentiment"]
              }
            },
            shortSqueezeRisk: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                warning: { type: Type.STRING }
              },
              required: ["level", "warning"]
            }
          },
          required: ["sentimentScore", "status", "reasoning", "economicCalendar", "techNews", "shortSqueezeRisk"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
