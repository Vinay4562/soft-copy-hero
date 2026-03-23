import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS is handled by Vercel's deployment automatically for the same-origin.
  // If needed for cross-origin, headers can be added here.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType, customApiKey } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const GEMINI_API_KEY = customApiKey || process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    // Call Google Gemini API directly using Node.js fetch (Node 18+)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an expert OCR and document extraction assistant. Your task is to extract ALL text content from the provided document image with maximum accuracy. 

Instructions:
1. Extract every word, number, and character visible in the document
2. Preserve the original formatting as much as possible (paragraphs, lists, tables)
3. For tables, represent them using markdown table format
4. For lists, use proper bullet points or numbered lists
5. Preserve headers and subheaders hierarchy
6. If text is blurry or unclear, provide your best interpretation with [unclear] notation
7. Do NOT add any commentary or explanation - only output the extracted text
8. Maintain the document's logical reading order (left to right, top to bottom)`
              },
              {
                inlineData: {
                  mimeType: mimeType || 'image/png',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 8000,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", response.status, errorData);
      
      if (response.status === 429) {
        return res.status(429).json({ error: "API limit reached" });
      }
      if (response.status === 403 || response.status === 401) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      return res.status(500).json({ error: "Failed to process document with Gemini" });
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({ text: extractedText });
  } catch (error) {
    console.error("Vercel Function error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
