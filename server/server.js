// server/server.js
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import dotenv from "dotenv";
import { knowledgeBase } from "../src/knowledgeBase.js";
import { pipeline } from "@xenova/transformers";
import cosineSimilarity from "compute-cosine-similarity";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// Initialize Gemini correctly (new SDK)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const KNOWLEDGE = knowledgeBase
  .map(item => `Q: ${item.triggers.join(" | ")}\nA: ${item.response}`)
  .join("\n\n");

// This prompt makes Gemini behave exactly like you want
const SYSTEM_PROMPT = `
You are Hadi, a professional and friendly virtual assistant for First Finance Qatar, a Shariah-compliant financing company.

Use this knowledge base first and only answer from it if the user question matches:

${KNOWLEDGE}

Rules:
- Only answer questions related to First Finance Qatar, vehicle, personal, or corporate finance products, EMI, Shariah-compliant financing, required documents, or working hours.
- If the question is unrelated to First Finance Qatar or finance, reply **only**: "I'm here to help with First Finance Qatar services and finance-related questions only."
- Do not provide any additional commentary, advice, or general knowledge.
- Always reply in the same language the user used (English or Arabic).
- Never say "according to my knowledge" or "as an AI".
- anything unrelated to first finance should not be answered at all just answer im only here to help wiith first finance related queries
-If the user asks a casual greeting like "hi" or "hello", reply briefly and politely. 
Only return detailed Vehicle Finance Features if the user explicitly asks for them.

User message: `;

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.json({ interpretation: "Please type a message." });
  }

  console.log("User:", message);

  try {
    // 1️⃣ Generate embedding for the user message
    const userEmbedding = await embedText(message);

    // 2️⃣ Find best match in KB
    const bestMatch = findBestMatch(userEmbedding);
    if (bestMatch) {
      console.log("KB match:", bestMatch.response);
      return res.json({ interpretation: bestMatch.response });
    }

    // 3️⃣ Fallback to Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
    });
    const result = await model.generateContent(SYSTEM_PROMPT + message);
    const botReply = result.response.text().trim();

    console.log("Gemini reply:", botReply);
    res.json({ interpretation: botReply });

  } catch (error) {
    console.error("Error:", error.message);
    res.json({ interpretation: "Sorry, I'm having trouble right now. Please try again." });
  }
});

let embedder = null;
let kbWithEmbeddings = [];

async function initEmbedder() {
  console.log("Loading local embedding model...");
embedder = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2" // Xenova-hosted model
);

  console.log("Embedding model loaded!");
}






async function embedText(texts) {
  if (!embedder) throw new Error("Embedder not initialized");

  // Normalize input to strings
  const input = Array.isArray(texts) ? texts : [texts];
  const normalized = input.map(t => (typeof t === "string" ? t : String(t ?? "")));

  const out = [];

  for (const t of normalized) {
    // Mean pooling + L2 normalize -> sentence-level vector
    const tensor = await embedder(t, { pooling: "mean", normalize: true });

    // --- KEY CHANGE ---
    // Flatten Tensor -> plain number[] using the Float32Array in `data`
    const vector = Array.from(tensor.data); // length === 384

    // Validate: ensure we really have a numeric array
    if (!Array.isArray(vector) || vector.length === 0 || !vector.every(v => typeof v === "number")) {
      console.error("Embedding is not numeric for text:", t);
      console.error("Raw embedding:", tensor);
      throw new Error("embedText(): produced non-numeric embedding");
    }

    out.push(vector);
  }

  return Array.isArray(texts) ? out : out[0];
}


async function initKB() {
  const texts = knowledgeBase.map(item => item.triggers.join(" | "));
  const embeddings = await embedText(texts);

  kbWithEmbeddings = knowledgeBase.map((item, i) => ({
    ...item,
    embedding: embeddings[i]
  }));

  console.log("Knowledge base initialized with embeddings!");
}

// Compute cosine similarity to find best match

function isNumericArray(a) {
  return Array.isArray(a) && a.length > 0 && a.every(v => typeof v === "number");
}



function findBestMatch(userEmbedding, threshold = 0.5) {
  if (!isNumericArray(userEmbedding)) {
    throw new Error("User embedding is not a numeric array");
  }

  let best = null;
  let highestScore = -1;

  for (const item of kbWithEmbeddings) {
    if (!isNumericArray(item.embedding) || item.embedding.length !== userEmbedding.length) {
      continue; // skip malformed/mismatched vectors
    }
    const score = cosineSimilarity(userEmbedding, item.embedding);
    if (Number.isFinite(score) && score > highestScore) {
      highestScore = score;
      best = item;
    }
  }

  return highestScore >= threshold ? best : null;
}

const PORT = 3001;

// ✅ Only start server after embeddings are ready
(async () => {
  await initEmbedder();
  await initKB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Gemini + Knowledge Base RAG is ACTIVE");
  });
})();