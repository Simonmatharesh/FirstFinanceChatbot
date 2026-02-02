// server/server.js
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import dotenv from "dotenv";
import { knowledgeBase } from "./knowledgeBase.js";
import { pipeline } from "@xenova/transformers";
import cosineSimilarity from "compute-cosine-similarity";
import { sessionMemory } from './sessionMemory.js';
import rateLimit from 'express-rate-limit'; 
import helmet from 'helmet';


dotenv.config();
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env file');
  process.exit(1);
}
const app = express();




// 1. SECURITY HEADERS

app.use(helmet({
  contentSecurityPolicy: false, // Disable if causing issues, enable in production
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));


// 2. CORS CONFIGURATION (RESTRICTED)

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://ffc-hkevhugvaed6fedx.westeurope-01.azurewebsites.net'
];

app.use(cors({
  origin: (origin, callback) => {
  
    
    // Only allow no-origin in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`Blocked request from: ${origin || 'unknown'}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));


// 3. REQUEST SIZE LIMITS

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//  GLOBAL RATE LIMIT: 4 requests per minute TOTAL (all users combined)
const globalChatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 4, // ONLY 4 TOTAL requests per minute across ALL users
  keyGenerator: () => 'global', 
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.log(`🚨 GLOBAL rate limit hit! Too many users sending messages.`);
    res.status(429).json({ 
      interpretation: "Our service is currently busy. Please wait a moment and try again." 
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

//  NEW: API Usage Tracking
const apiUsage = {
  requestsToday: 0,
  lastReset: Date.now(),
  DAILY_LIMIT: 2000 // Adjust based on your Gemini quota
};

function checkDailyQuota() {
  const now = Date.now();
  // Reset counter every 24 hours
  if (now - apiUsage.lastReset > 24 * 60 * 60 * 1000) {
    console.log(`📊 Daily quota reset. Previous usage: ${apiUsage.requestsToday}`);
    apiUsage.requestsToday = 0;
    apiUsage.lastReset = now;
  }

  return apiUsage.requestsToday < apiUsage.DAILY_LIMIT;
}



const KNOWLEDGE = knowledgeBase
  .map(item => `Q: ${item.triggers.join(" | ")}\nA: ${item.response}`)
  .join("\n\n");


const SYSTEM_PROMPT = `
You are **Hadi**, the official virtual assistant for **First Finance Company (FFC) Qatar**, a Shariah-compliant financing company.
You MUST follow these rules:
━━━━━━━━━━
🔹 **1. Core Behavior**
- Answer using the provided knowledge base when available
- If KB answer is weak/partial, use reasoning + KB context for helpful response
- Stay within FFC services scope - never guess outside domain
- ALWAYS end responses with: "All these services are Shari'a-compliant financial services."
- If user asks about repayment periods generally, extract data from ALL relevant KB entries
- Never guess or approximate - if KB says "36 months", say exactly that
- Stay within FFC services scope - never guess outside domain

━━━━━━━━━━
🔹 **2. Scope (Answer ONLY these topics)**
✅ Finance Products: Vehicle, Personal, Housing, Services, Corporate
✅ Eligibility, Documents, Application Process
✅ Company Info: Board, CEO (Eslah Assem), Management, History
✅ Shariah Compliance, Contracts (Murabaha, Ijara)
✅ Contact, Branches, Working Hours, Digital Services

❌ REJECT: Other companies, weather, sports, general knowledge, unrelated topics
→ Reply: "I'm here to help with First Finance Qatar services and finance-related questions only."

━━━━━━━━━━
🔹 **3. Language & Style**
**CRITICAL:** Respond in the SAME language as user's current message
- Arabic message → Full Arabic response
- English message → Full English response  
- Never mix languages in one response
- Ignore previous conversation language - only current message matters

**Detection:** Check for Arabic characters (ا-ي, ٠-٩) in current message

**Formatting:**
- NO markdown tables (| --- |)
- Use bullet points (•) or numbered lists
- Use **bold** for emphasis
- Keep mobile-friendly
- Arabic: Right-align all content

**Tone:**
- Short, clear, professional
- Never say "as an AI"
- Ask max 1 clarifying question if needed

━━━━━━━━━━
🔹 **4. Context Awareness**
Use provided context summary to:
- Remember nationality (Qatari/Expat)
- Track current product discussion
- Recognize follow-up questions ("what about expat?")
- Never repeat questions user already answered

━━━━━━━━━━
🔹 **5. Critical Eligibility Rules**

**When users ask "Can I get..." or "Am I eligible...":**

**Vehicle Finance:**
- Qatari: Age 18-65 (at end), Max 2M QAR, 72 months, No min salary
- Expat: Age 18-60 (at end), Max 400K QAR, 48 months, Min 5K QAR

**Personal Finance:**
- Qatari: Age 18-65, Max 2M QAR, DSR ≤75%, No guarantor
- Expat: Age 18-60, Max 200K QAR, DSR ≤50%, Needs Qatari guarantor

**Key Calculations:**
1. Age at end = Current age + (Tenure ÷ 12)
2. DSR = (All monthly debts + new EMI) ÷ Monthly salary

**Response Format:**
- ✅ for eligible, ❌ for ineligible, ⚠️ for concerns
- Calculate age at END of tenure
- Explain WHY if ineligible
- Suggest alternatives
- End with: "This is indicative only. Visit branch or call 4455 9999 for final approval."

━━━━━━━━━━
🔹 **6. Uncertain Info Handling**
- For most questions: Provide complete KB-based answer
- If info incomplete/varies by case:
  → Give best answer + disclaimer: "Contact FFC at 4455 9999 or visit branch for precise information"
- App tech support: "For app issues, visit ffcqatar.com or call 4455 9999"

━━━━━━━━━━
🔹 **7. Company Facts Priority**
For CEO, Board, Management, History:
- If in KB → Use ONLY KB content
- If not in KB → "For accurate info, contact FFC directly or visit a branch"
- Never guess or infer

━━━━━━━━━━
User message: `;


app.post("/api/chat", globalChatLimiter ,async (req, res) => {
  const { message, userId } = req.body;
  

  if (!message?.trim()) {
    return res.json({ interpretation: "Please type a message." });
  }

  //  NEW: Validate userId format
  if (!userId || typeof userId !== 'string' || userId.length > 150) {
    return res.status(400).json({ interpretation: "Invalid request." });
  }

  //  NEW: Check daily API quota
  if (!checkDailyQuota()) {
    console.log('🚨 Daily API quota exceeded!');
    return res.status(503).json({ 
      interpretation: "Our service is experiencing high demand. Please try again later or contact support at 4455 9999." 
    });
  }

  //  NEW: Validate message length
  if (message.length > 1000) {
    return res.status(400).json({ 
      interpretation: "Your message is too long. Please keep it under 1000 characters." 
    });
  }

  console.log("User:", message);

  console.log("UserID:", userId);

try {
  //  Extract intent BEFORE embedding
  const intent = extractIntent(message);
  
  //  Get current context
  const existingContext = userId ? sessionMemory.getContextSummary(userId) : null;
  
  //  Update context with new intent data
    if (userId) {
      // Only update nationality if new intent has it, OR keep existing
      if (intent.nationality) {
        sessionMemory.set(userId, 'nationality', intent.nationality);
        console.log(`📌 Set nationality: ${intent.nationality}`);
      } else if (existingContext?.nationality) {
        console.log(`♻️ Keeping existing nationality: ${existingContext.nationality}`);
      }
      
      if (intent.product) {
        sessionMemory.setLastProduct(userId, intent.product);
        console.log(`📌 Set product: ${intent.product}`);
      }
      
      if (intent.topic) {
        sessionMemory.setCurrentTopic(userId, intent.topic);
        console.log(`📌 Set topic: ${intent.topic}`);
      }
    }
  
  // Get UPDATED context (includes new intent data)
    const updatedContext = userId ? sessionMemory.getContextSummary(userId) : null;
    console.log("📊 Final context:", updatedContext);

  // Generate embedding for the user message
  const userEmbedding = await embedText(message);

  // Find best match in KB with context awareness
  const bestMatch = findBestMatchWithContext(userEmbedding, updatedContext,0.88);
  if (bestMatch) {
    console.log("KB match:", bestMatch.triggers[0]);
    
    // Handle dynamic responses
    const response = typeof bestMatch.response === "function" 
      ? bestMatch.response({ 
          nationality: updatedContext?.nationality || "Qatari", 
          salary: 0, 
          jobDurationMonths: 0, 
          age: 0 
        })
      : bestMatch.response;

    if (userId) {
      sessionMemory.addToHistory(userId, message, response);
    }
    
    return res.json({ interpretation: response });
  }

  const top3Matches = findTop3Matches(userEmbedding, updatedContext);
  const kbContext = top3Matches.length > 0 
    ? `\n**RELEVANT KB ENTRIES:**\n${top3Matches.map(m => 
        `- ${typeof m.response === 'function' ? '[Dynamic Response]' : m.response.substring(0, 300)}...`
      ).join('\n')}\n`
    : '';

  // Detect current message language
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(message);
  const currentLanguage = hasArabic ? "Arabic" : "English";

  //  Build context-aware prompt for Gemini
  let contextPrompt;

  if (updatedContext && (updatedContext.nationality || updatedContext.product || updatedContext.recentMessages?.length)) {
    contextPrompt = `${SYSTEM_PROMPT}
  ${kbContext}
  **CONVERSATION CONTEXT (for reference only):**
  ${updatedContext.topic ? `- Current topic: ${updatedContext.topic}` : ''}
  ${updatedContext.product ? `- Last product discussed: ${updatedContext.product}` : ''}
  ${updatedContext.nationality ? `- User nationality: ${updatedContext.nationality}` : ''}
  ${updatedContext.recentMessages?.length ? `- Recent conversation:\n${updatedContext.recentMessages.map(m => `User: ${m.user}\nBot: ${m.bot}`).join('\n')}` : ''}

  **CURRENT MESSAGE LANGUAGE: ${currentLanguage}**
  **YOU MUST RESPOND IN: ${currentLanguage}**

  User message: ${message}`;
  } else {
    // No conversation context, but still include KB context
    contextPrompt = `${SYSTEM_PROMPT}
  ${kbContext}
  **CURRENT MESSAGE LANGUAGE: ${currentLanguage}**
  **YOU MUST RESPOND IN: ${currentLanguage}**

  User message: ${message}`;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
  });
  
  // Increment API usage counter
  apiUsage.requestsToday++;
  
  const result = await model.generateContent(contextPrompt);
  const parts = result.response.candidates?.[0]?.content?.parts || [];

  const botReply = parts
    .map(p => p.text || "")
    .join(" ")
    .trim();

  console.log("Gemini reply:", botReply);
  
  if (userId) {
    sessionMemory.addToHistory(userId, message, botReply);
  }
  
  res.json({ interpretation: botReply });

} catch (error) {
  console.error("Error:", error.message);
  res.json({ interpretation: "Sorry, I'm having trouble right now. Please try again." });
}
});

//  Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    activeSessions: sessionMemory.sessions.size,
    apiUsageToday: apiUsage.requestsToday,
    dailyLimit: apiUsage.DAILY_LIMIT,
    uptime: process.uptime()
  });
});

//  Admin stats endpoint (protect this in production!)
app.get("/api/stats", (req, res) => {
  const sessions = Array.from(sessionMemory.sessions.entries()).map(([id, session]) => ({
    userId: id.substring(0, 20) + '...', // Hide full ID
    lastActivity: new Date(session.lastActivity).toISOString(),
    messageCount: session.conversationState.conversationHistory.length
  }));

  res.json({
    totalSessions: sessionMemory.sessions.size,
    apiUsage: {
      today: apiUsage.requestsToday,
      limit: apiUsage.DAILY_LIMIT,
      percentage: ((apiUsage.requestsToday / apiUsage.DAILY_LIMIT) * 100).toFixed(1) + '%'
    },
    sessions: sessions.slice(0, 10) // Only show first 10
  });
});

// ===== ADD THIS FUNCTION AT THE TOP OF server.js =====
function extractIntent(message) {
  const lower = message.toLowerCase();
  const intent = {
    nationality: null,
    product: null,
    topic: null
  };

  // ============================================
  // NATIONALITY DETECTION - IMPROVED
  // ============================================
  
  // Method 1: "I am/I'm [something] expat/qatari"
  if (/\b(i am|i'm|im)\b.*\b(expat|expatriate|resident|foreigner)\b/i.test(lower)) {
    intent.nationality = "Expat";
  } else if (/\b(i am|i'm|im)\b.*\b(qatari|qatar national)\b/i.test(lower)) {
    intent.nationality = "Qatari";
  }
  
  // Method 2: Direct mention without "I am"
  else if (/\b(expat|expatriate|resident|foreigner)\b/i.test(lower) && 
           !/\bfor\s+(expat|qatari)\b/i.test(lower)) {
    // Only if not asking "for expat" (which is a question, not identity)
    intent.nationality = "Expat";
  } else if (/\b(qatari|qatar national)\b/i.test(lower) && 
             !/\bfor\s+(expat|qatari)\b/i.test(lower)) {
    intent.nationality = "Qatari";
  }

  // ============================================
  // PRODUCT DETECTION - UNCHANGED
  // ============================================
  
  if (/\b(vehicle|car|auto|motorcycle|marine|boat)\s*(finance|loan|financing)?/i.test(lower)) {
    intent.product = "vehicle";
    intent.topic = "vehicle_finance";
  } else if (/\bpersonal\s*(finance|loan|financing)/i.test(lower)) {
    intent.product = "personal";
    intent.topic = "personal_finance";
  } else if (/\b(housing|home|property|real estate)\s*(finance|loan|financing)?/i.test(lower)) {
    intent.product = "housing";
    intent.topic = "housing_finance";
  } else if (/\b(service|services|travel|education|wedding|healthcare)\s*(finance|loan|financing)?/i.test(lower)) {
    intent.product = "services";
    intent.topic = "services_finance";
  } else if (/\b(corporate|company|business)\s*(finance|loan|financing)?/i.test(lower)) {
    intent.product = "corporate";
    intent.topic = "corporate_finance";
  }

  // Document requests
  if (/documents?\s+(for|needed|required)/i.test(lower)) {
    if (!intent.product && /vehicle|car/i.test(lower)) {
      intent.product = "vehicle";
      intent.topic = "vehicle_finance";
    } else if (!intent.product && /personal/i.test(lower)) {
      intent.product = "personal";
      intent.topic = "personal_finance";
    } else if (!intent.product && /housing|home/i.test(lower)) {
      intent.product = "housing";
      intent.topic = "housing_finance";
    }
  }

  console.log(` Extracted intent:`, intent);
  return intent;
}

// Helper: Find best match with context boosting
function findBestMatchWithContext(userEmbedding, userContextSummary, threshold = 0.88) {
  let best = null;
  let highestScore = -1;

  for (const item of kbWithEmbeddings) {
    if (!item.embedding || !Array.isArray(item.embedding)) continue;

    let score = cosineSimilarity(userEmbedding, item.embedding);

    // Boost score if item matches current context
    if (userContextSummary?.topic && item.category?.includes(userContextSummary.topic)) {
      score += 0.15;
    }

    if (userContextSummary?.product && item.category?.includes(userContextSummary.product)) {
      score += 0.1; // Reduced from 0.12
    }

    // CRITICAL FIX: Boost nationality match, PENALIZE wrong nationality
    if (userContextSummary?.nationality) {
      const itemLower = item.category?.toLowerCase() || '';
      const contextNat = userContextSummary.nationality.toLowerCase();
      
      if (itemLower.includes(contextNat)) {
        score += 0.2; // Strong boost for correct nationality
      } else if (itemLower.includes('qatari') || itemLower.includes('expat')) {
        score -= 0.25; // Strong penalty for wrong nationality
      }
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



function findBestMatch(userEmbedding, threshold = 0.9) {
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
// Add after findBestMatchWithContext function
function findTop3Matches(userEmbedding, userContextSummary, threshold = 0.70) {
  const matches = [];

  for (const item of kbWithEmbeddings) {
    if (!item.embedding || !Array.isArray(item.embedding)) continue;

    let score = cosineSimilarity(userEmbedding, item.embedding);

    // Apply same context boosting
    if (userContextSummary?.topic && item.category?.includes(userContextSummary.topic)) {
      score += 0.15;
    }
    if (userContextSummary?.product && item.category?.includes(userContextSummary.product)) {
      score += 0.1;
    }
    if (userContextSummary?.nationality) {
      const itemLower = item.category?.toLowerCase() || '';
      const contextNat = userContextSummary.nationality.toLowerCase();
      if (itemLower.includes(contextNat)) {
        score += 0.2;
      } else if (itemLower.includes('qatari') || itemLower.includes('expat')) {
        score -= 0.25;
      }
    }

    if (score >= threshold) {
      matches.push({ ...item, score });
    }
  }

  // Return top 3, sorted by score
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

const PORT = process.env.PORT || 3001;
// start server after embeddings are ready
(async () => {
  await initEmbedder();
  await initKB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Daily API limit: ${apiUsage.DAILY_LIMIT}`);
    console.log(`GLOBAL rate limit: 4 requests/min TOTAL (all users combined)`);
    console.log(`Session cleanup: Active (every 5 min)`);
    console.log("Gemini + Knowledge Base RAG is ACTIVE");
  });
})();