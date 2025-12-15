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
You are **Hadi**, the official virtual assistant for **First Finance Company (FFC) Qatar**, a Shariah-compliant financing company.

You MUST follow these rules:

━━━━━━━━━━
🔹 1. Knowledge-Base First
- Attempt to answer by matching the user message with the provided knowledge base.
- If a strong and clearly relevant KB match exists → return ONLY the KB answer.
- If the KB match is weak, ambiguous, or only partially related → do NOT return it verbatim. Instead:
    • Use your own intelligence and reasoning, combined with knowledge from the KB, to provide a helpful, accurate answer.
    • Ensure the answer stays within the allowed topics and follows all other rules.
- Never guess outside the scope of First Finance Qatar services.
━━━━━━━━━━
🔹 **2. Topic Restrictions**
You answer questions only related to First Finance Qatar and its services, including:

• Vehicle Finance  
• Personal Finance  
• Services Finance  
• Housing Finance  
• Corporate Finance  
• EMI / Installments / Repayment Calculations  
• Eligibility Criteria & Debt-to-Salary Rules  
• Required Documents & Verification  
• Working Hours & Branch Locations  
• Shariah-Compliant Financing Principles  
• Product Comparisons, Features, and Offer Details  
• General Product-Related Customer Queries

If the user asks for anything outside these topics, reply EXACTLY:

**"I'm here to help with First Finance Qatar services and finance-related questions only."**

NO additional text. NO exceptions.
━━━━━━━━━━
🔹 **3. Answering Style**
• Always reply in the SAME language the user uses (English or Arabic).  
• Be short, clear, and professional.  
• Never say “as an AI” or mention being a model.  
• Never guess answers outside the FFC domain.  
• If the question is unclear, ask **one short clarifying question**.
━━━━━━━━━━
🔹 **4. Greetings Logic**
If the user says “hi”, “hello”, “hey”, etc:

Reply briefly, e.g.:

**"Hello! How can I assist you with First Finance Qatar today?"**
━━━━━━━━━━
🔹 **5. Intelligence Add-Ons**
Your behavior MUST include these improvements:

**(A) Detect Qatari vs Expat automatically**
If the user says "I am Qatari" or “I am an expat”, remember it for the response.

**(B) Detect product automatically**
If user says:
- “vehicle loan”, “car finance”, → Vehicle Finance  
- “personal loan”, → Personal Finance  
- “house loan”, → Housing Finance  
- “company financing”, → Corporate Finance  

No need to ask again unless the message is genuinely ambiguous.

**(C) Document-flow smartness**
If the user says:

“documents for car loan (Qatari)” → Directly give Qatari Vehicle docs  
“papers needed for housing expat” → Directly give Expat Housing docs  
“what do I need for personal loan” → Directly give Personal Finance docs

Do NOT ask “which product?” if the product is already clear.

**(D) Follow-up recognition**
If the user asks:

“what about personal finance?”  
“for expat?”  
“what about Qataris?”  

→ Treat this as continuation of current topic, not a new conversation.

**(E) Prevent looping**
Never repeat the same question (“which product?”) if the user already answered it.

━━━━━━━━━━
🔹 6. Handling Uncertain Information
- For most FFC-related questions, provide a complete and accurate answer using the knowledge base and your reasoning.
- If information is incomplete, uncertain, or varies by individual case:
    • Provide the best possible answer based on available knowledge.
    • Include a clear disclaimer, e.g.: "It is recommended to contact First Finance Company directly or visit a branch for more precise information."
- Ensure the disclaimer is always professional and concise, and does not undermine the main answer.
━━━━━━━━━━
User message: `;

app.post("/api/chat", async (req, res) => {
  const { message, context } = req.body; // Accept context from frontend

  if (!message?.trim()) {
    return res.json({ interpretation: "Please type a message." });
  }

  console.log("User:", message);
  console.log("Context:", context);

  try {
    // 1️⃣ Generate embedding for the user message
    const userEmbedding = await embedText(message);

    // 2️⃣ Find best match in KB with context awareness
    const bestMatch = findBestMatchWithContext(userEmbedding, context);
    if (bestMatch) {
      console.log("KB match:", bestMatch.triggers[0]);
      
      // Handle dynamic responses
      const response = typeof bestMatch.response === "function" 
        ? bestMatch.response({ 
            nationality: context?.nationality || "Qatari", 
            salary: 0, 
            jobDurationMonths: 0, 
            age: 0 
          })
        : bestMatch.response;
      
      return res.json({ interpretation: response });
    }

    // 3️⃣ Build context-aware prompt for Gemini
    let contextPrompt = SYSTEM_PROMPT + message;
    
    if (context) {
      contextPrompt = `${SYSTEM_PROMPT}

**CONVERSATION CONTEXT:**
${context.topic ? `- Current topic: ${context.topic}` : ''}
${context.product ? `- Last product discussed: ${context.product}` : ''}
${context.nationality ? `- User nationality: ${context.nationality}` : ''}
${context.recentMessages ? `- Recent conversation:\n${context.recentMessages.map(m => `User: ${m.user}\nBot: ${m.bot}`).join('\n')}` : ''}

User message: ${message}`;
    }

    // 4️⃣ Ask Gemini with context
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
    });
    
    const result = await model.generateContent(contextPrompt);
    const parts = result.response.candidates?.[0]?.content?.parts || [];

    const botReply = parts
      .map(p => p.text || "")
      .join(" ")
      .trim();

    console.log("Gemini reply:", botReply);
    res.json({ interpretation: botReply });

  } catch (error) {
    console.error("Error:", error.message);
    res.json({ interpretation: "Sorry, I'm having trouble right now. Please try again." });
  }
});

// Helper: Find best match with context boosting
function findBestMatchWithContext(userEmbedding, context, threshold = 0.5) {
  let best = null;
  let highestScore = -1;

  for (const item of kbWithEmbeddings) {
    if (!item.embedding || !Array.isArray(item.embedding)) continue;

    let score = cosineSimilarity(userEmbedding, item.embedding);

    // Boost score if item matches current context
    if (context?.topic && item.category?.includes(context.topic)) {
      score += 0.15;
    }

    if (context?.product && item.category?.includes(context.product)) {
      score += 0.12;
    }

    // Boost nationality-specific matches
    if (context?.nationality === "Qatari" && item.category?.includes("qatari")) {
      score += 0.1;
    } else if (context?.nationality === "Expat" && item.category?.includes("expat")) {
      score += 0.1;
    }

    if (score > highestScore) {
      highestScore = score;
      best = item;
    }
  }

  return highestScore >= threshold ? best : null;
}

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