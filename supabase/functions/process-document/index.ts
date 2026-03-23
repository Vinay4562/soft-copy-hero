// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, customApiKey } = await req.json();
    
    console.log("Processing request. customApiKey provided:", !!customApiKey);

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // @ts-ignore
    const systemApiKey = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_API_KEY = customApiKey || systemApiKey;
    
    if (!GEMINI_API_KEY) {
      console.error("No API key available (system or custom)");
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Using API Key starting with:", GEMINI_API_KEY.substring(0, 6));

    // Use Google Gemini API directly
    // Using v1 version and gemini-1.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
        return new Response(
          JSON.stringify({ error: "API limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 403 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to process document with Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
