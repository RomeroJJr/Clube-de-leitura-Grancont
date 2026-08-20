import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/generate-cover", async (req, res) => {
    try {
      const { title, author } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Título é obrigatório" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Encontre a URL da imagem de capa oficial (ou a mais relevante) do livro "${title}"${author ? ` pelo autor "${author}"` : ''}. 
Por favor, retorne APENAS a URL direta da imagem (ex: terminando em .jpg ou .png). Não adicione markdown, nem texto extra, apenas a URL. 
Caso não consiga encontrar com absoluta certeza, não retorne nada.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        },
      });

      const textResponse = response.text?.trim() || "";
      const urlMatch = textResponse.match(/(https?:\/\/[^\s]+)/);

      if (urlMatch) {
        return res.json({ coverUrl: urlMatch[1] });
      } else {
        return res.json({ coverUrl: "" });
      }
    } catch (err: any) {
      console.error("Erro ao buscar capa com IA:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 4 wildcard
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
