/**
 * Chamadas à API Gemini (Google AI) — mesma convenção que /api/ai/icp-analysis.
 */
export const GEMINI_MODEL = 'gemini-2.5-flash';

type GeminiPart = { text?: string };
type GeminiContent = { parts?: GeminiPart[] };
type GeminiCandidate = { content?: GeminiContent };
type GeminiResponse = { candidates?: GeminiCandidate[] };

export async function geminiGenerateText(params: {
  apiKey: string;
  systemInstruction: string;
  userContent: string;
  maxOutputTokens?: number;
  responseMimeType?: 'text/plain' | 'application/json';
  temperature?: number;
}): Promise<string> {
  const {
    apiKey,
    systemInstruction,
    userContent,
    maxOutputTokens = 8192,
    responseMimeType = 'text/plain',
    temperature = 0.4,
  } = params;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Gemini API: ${res.status}`);
  }
  const data = (await res.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
