// server/server.js
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import dotenv from "dotenv";
import { knowledgeBase } from "../src/knowledgeBase.js";

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const result = await model.generateContent(SYSTEM_PROMPT + message);
    const botReply = result.response.text().trim();

    console.log("Gemini reply:", botReply);

    res.json({ interpretation: botReply });
  } catch (error) {
    console.error("Gemini error:", error.message);
    res.json({ interpretation: "Sorry, I'm having trouble right now. Please try again." });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Gemini + Knowledge Base RAG is ACTIVE");
});