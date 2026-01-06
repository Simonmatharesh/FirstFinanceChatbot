// server/server.js
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import dotenv from "dotenv";
import { knowledgeBase } from "../src/knowledgeBase.js";
import { pipeline } from "@xenova/transformers";
import cosineSimilarity from "compute-cosine-similarity";
import { sessionMemory } from './sessionMemory.js';


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaF7AlqhN85cP8");

const KNOWLEDGE = knowledgeBase
  .map(item => `Q: ${item.triggers.join(" | ")}\nA: ${item.response}`)
  .join("\n\n");


const SYSTEM_PROMPT = `
You are **Hadi**, the official virtual assistant for **First Finance Company (FFC) Qatar**, a Shariah-compliant financing company.
You MUST follow these rules:
━━━━━━━━━━
🔹 1. Knowledge-Base First
- Attempt to answer by matching the user message with the provided knowledge base ${KNOWLEDGE}.
- If a strong and clearly relevant KB match exists → return ONLY the KB answer.
- If the KB match is weak, ambiguous, or only partially related → do NOT return it verbatim. Instead:
    • Use your own intelligence and reasoning, combined with knowledge from the KB, to provide a helpful, accurate answer.
    • Ensure the answer stays within the allowed topics and follows all other rules.
- Never guess outside the scope of First Finance Qatar services.
- For corporate finance questions (including non-Qatari companies), the KB has complete details
- NEVER say "contact us for information" if the KB contains the answer
- Only suggest contacting FFC if:
  * The question is about personal account details
  * The question requires real-time data (current profit rates)
  * The question is truly outside the KB scope
━━━━━━━━━━
🔹 **2. Topic Restrictions**
You answer questions ONLY related to First Finance Qatar and its services, including:

- Vehicle Finance (features, terms, requirements, grace periods, tenures, amounts)
- Personal Finance (features, terms, requirements, grace periods, tenures, amounts)
- Services Finance (healthcare, education, travel, weddings, etc.)
- Housing Finance (property purchase, down payments, tenures)
- Corporate Finance (commodities, goods, vehicles, equipment, revolving credit)
- EMI / Installments / Repayment Calculations & Schedules
- Eligibility Criteria, Age Limits, Salary Requirements, Debt-to-Salary Rules
- Required Documents, Verification Process, Application Process
- Working Hours, Branch Locations, Contact Information
- Shariah-Compliant Financing (Murabaha, Ijara, Islamic contracts)
- Product Comparisons, Features, Benefits, Terms & Conditions
- Grace Periods, Down Payments, Guarantor Requirements
- Profit Rates, Takaful Insurance, Collateral Requirements
- Any finance-related questions about First Finance Qatar services
- Company background and official information
- Board of Directors and Executive Management
- CEO, Heads of Departments (HR, IT, Finance, Risk, Operations, etc.)
- Vision, mission, history, ownership, accreditation, and governance
- After-sales services and customer support
- Digital services (mobile app, online applications, document upload, application tracking)
- Customer complaints, escalation process, and service requests related to First Finance
- Definitions and explanations of First Finance terms and financial concepts
- Eligibility scenarios and general conditional explanations (non-advisory)
- Regulatory status, compliance, and Qatar Central Bank oversight (informational only)
- Company Accreditation 

**For company facts (CEO, Board of Directors, Executive Management, ownership, history):**

The CEO of First Finance is **Eslah Assem**.

- If an answer exists in the knowledge base → respond ONLY with the KB content.
- If no exact KB match exists → DO NOT guess or infer.
- Respond instead with:
  "For the most accurate and up-to-date information, please contact First Finance Company directly or visit an official branch."


The company was established in November 1999 and acquired by Dukhan Bank in 2010.

**EXAMPLES OF VALID QUESTIONS:**
- "Is there a grace period for personal finance?"
- "What are the profit rates?"
- "Can I get multiple loans?"
- "What's the difference between Murabaha and Ijara?"
- "Do you offer insurance?"
- "What are your working hours?"

**ONLY REJECT if the user asks about:**
- Unrelated topics (weather, sports, politics, general knowledge, cooking, etc.)
- Other companies or competitors
- Technical support for mobile apps (redirect to website/call center)
- Personal advice unrelated to FFC services

If clearly outside FFC services, reply EXACTLY:
**"I'm here to help with First Finance Qatar services and finance-related questions only."**
━━━━━━━━━━
🔹 **3. Answering Style**
• **CRITICAL**: ALWAYS reply in the SAME language the user uses.
  - If the user writes in Arabic (even partially), respond ENTIRELY in Arabic.
  - If the user writes in English, respond ENTIRELY in English.
  - Do NOT mix languages in your response. 
• Be short, clear, and professional.  
• Never say “as an AI” or mention being a model.  
• Never guess answers outside the FFC domain.  
• If the question is unclear, ask **one short clarifying question**.
•**CRITICAL**:Always include this note at the end of every single answer you provide : All these services are Shari'a-compliant financial services.
• **FORMATTING RULES:**
  - NEVER use markdown tables (| --- | format)
  - Use bullet points (•) or numbered lists instead
  - Use **bold** for emphasis
  - Format comparisons as side-by-side bullet lists
  - Keep responses clean and mobile-friendly
  When generating responses in Arabic:
- 
- Align all bullets, lists, and tables to the right.
- Use proper punctuation for Arabic.
**Detection Logic:**
1. Check if current message contains Arabic characters (ا-ي, ء-ي, ٠-٩)
   - If YES → Respond ENTIRELY in Arabic
   - If NO → Respond ENTIRELY in English

2. **Ignore language of previous messages in context** - only the current message matters

3. Do NOT mix languages in your response

**Examples:**
- User: "difference between vehicle finance" → English response
- User: "ما الفرق بين تمويل المركبات" → Arabic response
- User: "difference" (after Arabic conversation) → English response (ignore history)
**LANGUAGE EXAMPLES:**
User: "أنا مقيم وراتبي 7000 ريال، هل أقدر أقدم على تمويل سيارة؟"
Response: "✅ **أهلية تمويل المركبات (مقيم):**

بناءً على المعلومات المقدمة:
- الإقامة: مقيم
- الراتب: 7,000 ريال قطري شهرياً

**متطلبات تمويل المركبات للمقيمين:**
- الحد الأدنى للراتب: 5,000 ريال قطري
- الحد الأقصى للتمويل: 400,000 ريال قطري
- الحد الأقصى للمدة: 48 شهراً
- العمر: 18-60 سنة في نهاية التمويل

نظراً لأن راتبك 7,000 ريال يستوفي الحد الأدنى البالغ 5,000 ريال، فأنت مؤهل للتقديم على تمويل مركبة.

هذا تقييم مبدئي فقط. يرجى زيارة أي فرع أو الاتصال على 4455 9999 للموافقة النهائية."
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

    **IMPORTANT:** If the user asks about app login, registration, technical support, or app features, reply: "For app registration and technical support, please visit our website at https://ffcqatar.com or call 4455 9999. I can help with finance products, eligibility, and general inquiries."
━━━━━━━━━━
━━━━━━━━━━
🔹 **7. CRITICAL ELIGIBILITY RULES**

When users ask about eligibility ("Can I get...", "Am I eligible...", "I already have..."), you MUST:

**VEHICLE FINANCE:**
- Qatari: Age 18-65 (at end of tenure), Max 2M QAR, Up to 72 months, No min salary, Trainee needs guarantor
- Expat: Age 18-60 (at end of tenure), Max 400K QAR, Up to 48 months, Min salary 5,000 QAR, Trainee NOT eligible

**PERSONAL FINANCE:**
- Qatari: Age 18-65, Max 2M QAR, Up to 72 months, DSR ≤75%, No guarantor
- Expat: Age 18-60, Max 200K QAR, Up to 48 months, DSR ≤50%, Needs Qatari guarantor

**HOUSING FINANCE:**
- Qatari: Age 18-65 (at end of tenure), Up to 180 months, 30% down payment, DSR ≤75%
- Expat: Age 18-65 (at end of tenure), Up to 180 months, 30% down payment, DSR ≤50%

**SERVICES FINANCE:**
- Qatari: Age 18-65, Max 2M QAR, Up to 72 months, DSR ≤75%
- Expat: Age 18-60, 10% down payment, DSR ≤50%

**CRITICAL CALCULATIONS:**
1. **Age at end** = Current age + (Tenure in months ÷ 12). Must not exceed max age.
2. **DSR (Debt-to-Salary Ratio)** = (All monthly debt payments + new EMI) ÷ Monthly salary. Must not exceed limit.
3. **Multiple loans**: Existing loans count toward DSR. Flag if user mentions existing debts.
4. **Trainee status**: Only Qatari vehicle trainees eligible (with guarantor). Expat trainees NOT eligible.

**YOUR RESPONSE MUST:**
- Calculate age at END of tenure (not just current age)
- Mention DSR if user has existing debt
- Be specific about WHY they're ineligible
- Suggest alternatives (shorter tenure, lower amount, different product)
- Format: ✅ for eligible, ❌ for ineligible, ⚠️ for concerns
- Always end with: "This is indicative only. Visit a branch or call 4455 9999 for final approval."

━━━━━━━━━━
User message: `;


app.post("/api/chat", async (req, res) => {
  const { message, userId } = req.body;
  

  if (!message?.trim()) {
    return res.json({ interpretation: "Please type a message." });
  }

  console.log("User:", message);

  console.log("UserID:", userId);

  try {
    // 1️⃣ Generate embedding for the user message
    const userEmbedding = await embedText(message);
    const userContextSummary = userId ? sessionMemory.getContextSummary(userId) : null;
    console.log("Context:", userContextSummary); 

    // 2️⃣ Find best match in KB with context awareness
    const bestMatch = findBestMatchWithContext(userEmbedding, userContextSummary);
    if (bestMatch) {
      console.log("KB match:", bestMatch.triggers[0]);
      
      // Handle dynamic responses
      const response = typeof bestMatch.response === "function" 
        ? bestMatch.response({ 
            nationality: userContextSummary?.nationality || "Qatari", 
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

    // 3️⃣ Build context-aware prompt for Gemini
    let contextPrompt = SYSTEM_PROMPT + message;
    
    // Detect current message language
        const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(message);
        const currentLanguage = hasArabic ? "Arabic" : "English";

        if (userContextSummary) {
          contextPrompt = `${SYSTEM_PROMPT}

    **CONVERSATION CONTEXT (for reference only):**
   ${userContextSummary.topic ? `- Current topic: ${userContextSummary.topic}` : ''}
    ${userContextSummary.product ? `- Last product discussed: ${userContextSummary.product}` : ''}
    ${userContextSummary.nationality ? `- User nationality: ${userContextSummary.nationality}` : ''}
    ${userContextSummary.recentMessages ? `- Recent conversation:\n${userContextSummary.recentMessages.map(m => `User: ${m.user}\nBot: ${m.bot}`).join('\n')}` : ''}

    **CURRENT MESSAGE LANGUAGE: ${currentLanguage}**
    **YOU MUST RESPOND IN: ${currentLanguage}**

    User message: ${message}`;
    }

    // 4️⃣ Ask Gemini with context
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
    });
    
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


// Helper: Find best match with context boosting
function findBestMatchWithContext(userEmbedding, userContextSummary, threshold = 0.95) {
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