import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Log loaded keys for debugging (obfuscated values)
  console.log(`[ViteConfig] Loaded env keys: ${Object.keys(env).filter(k => k.includes("GEMINI") || k.includes("VITE")).join(", ")}`);

  const localApiProxy: Plugin = {
    name: "local-api-proxy",
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        console.log(`[Proxy] Request received: ${req.method} ${req.url}`);
        
        // Handle connection test
        if (req.url === "/api/test-connection" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => body += chunk);
          req.on("end", async () => {
            try {
              const { customApiKey } = JSON.parse(body || "{}");
              const apiKey = (customApiKey || env.GEMINI_API_KEY || "").trim();
              
              if (!apiKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "No API key provided" }));
                return;
              }

              const response = await globalThis.fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash?key=${apiKey}`,
                { method: "GET" }
              );

              const data = await response.json() as any;
              res.setHeader("Content-Type", "application/json");
              res.statusCode = response.status;
              res.end(JSON.stringify(data));
            } catch (error: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }

        if ((req.url === "/api/process-document" || req.url?.startsWith("/api/process-document")) && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              if (!body) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Empty request body" }));
                return;
              }
              const { imageBase64, mimeType, customApiKey } = JSON.parse(body);
                
                console.log(`[Proxy] customApiKey from body: ${customApiKey ? (customApiKey.substring(0, 10) + "...") : "none"}`);
                console.log(`[Proxy] env.GEMINI_API_KEY: ${env.GEMINI_API_KEY ? (env.GEMINI_API_KEY.substring(0, 10) + "...") : "none"}`);

                // Key selection logic: prioritize custom key if valid, fallback to env
                let apiKey = (typeof customApiKey === 'string' && customApiKey.length > 10) 
                  ? customApiKey.trim() 
                  : (env.GEMINI_API_KEY || "").trim();

              const maskedKey = apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 10);
              console.log(`[Proxy] Final Key Used: ${maskedKey} (Len: ${apiKey.length}). Model: gemini-2.5-flash`);

              // Try both methods: Query parameter (standard) and Header (backup)
              const url = new URL(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`);
              url.searchParams.set("key", apiKey);
              
              const response = await globalThis.fetch(
                url.toString(),
                {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                  },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            text: `You are an expert OCR and document extraction assistant. Your task is to extract ALL text content from the provided document image with maximum accuracy. 

Instructions:
1. Extract every word, number, and character visible in the document.
2. Preserve the original formatting as much as possible (paragraphs, lists, tables).
3. **CRITICAL: FOR TABLES, you MUST extract ALL data from every row and column.** 
   - Represent tables using standard Markdown table format.
   - Ensure that even long text within table cells is fully extracted and placed in the correct cell.
   - Do NOT skip any rows or truncate cell content.
   - If a table spans multiple pages, continue the Markdown table seamlessly.
4. For lists, use proper bullet points or numbered lists.
5. Preserve headers and subheaders hierarchy.
6. If text is blurry or unclear, provide your best interpretation with [unclear] notation.
7. Do NOT add any commentary or explanation - only output the extracted text.
8. Maintain the document's logical reading order (left to right, top to bottom).
9. For documents with multiple pages, clearly mark page breaks with "==Start of OCR for page X==" and "==End of OCR for page X==".`,
                          },
                          {
                            inlineData: {
                              mimeType: mimeType || "image/png",
                              data: imageBase64,
                            },
                          },
                        ],
                      },
                    ],
                    generationConfig: {
                      maxOutputTokens: 8000,
                    },
                  }),
                }
              );

              const data = await response.json() as any;
              res.setHeader("Content-Type", "application/json");
              
              if (!response.ok) {
                res.statusCode = response.status;
                res.end(JSON.stringify(data));
                return;
              }

              const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              res.end(JSON.stringify({ text: extractedText }));
            } catch (error: any) {
              console.error("Local Proxy Error:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: error.message || "Internal Server Error" }));
            }
          });
          return;
        }
        next();
      });
    },
  };

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      localApiProxy,
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
