// App.js  
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { knowledgeBase } from "./knowledgeBase";
import Fuse from "fuse.js";
import { interpretUserMessage } from "./gemini";
import { sessionMemory } from './sessionMemory';
import { emiRates, eligibilityRules, requiredDocs } from './config';
import { initKB, kbWithEmbeddings } from "./kbWithEmbeddings.js";
import { embedContent,initEmbedder} from "./embeddingAPI.js";
import { findBestMatch } from "./semanticSearch.js";

/* ----------  CONFIG  ---------- */
const fuseOptions = { keys: ["triggers", "response"], threshold: 0.35, includeScore: true };
const fuse = new Fuse(knowledgeBase, fuseOptions);

/* ----------  I18N  ---------- */
const text = {
  en: {
    greeting: "Hi, Welcome to First Finance.\n I am Hadi your virtual assistant.",
    welcome: "I'm here to help with Shariah-compliant financing.",
    placeholder: "Type your message...",
    fallback: "I am not able to get your query, please try rephrasing your query. I can help with queries regarding monthly payment calculations, required documents, finance application and other products.",
    cancelEMI: "Got it! I've cancelled the EMI calculation.\n\nHow else can I help you today?",
    faqButtons: ["EMI Calculation", "Required Documents", "Finance Products", "Work Hours"],
  },
  ar: {
    greeting: "مرحباً، أهلاً بك في فرست فاينانس. أنا هادي، مساعدك الافتراضي.",
    welcome: "أنا هنا لمساعدتك في التمويل المتوافق مع الشريعة الإسلامية.\n\nكيف يمكنني مساعدك اليوم؟",
    placeholder: "اكتب رسالتك...",
    fallback: "يمكنك السؤال عن حساب القسط، الوثائق المطلوبة، منتجات التمويل، مواعيد العمل، أو التواصل معنا.",
    cancelEMI: "تم! تم إلغاء حساب القسط.\n\nكيف يمكنني مساعدتك أيضاً؟",
    faqButtons: ["حساب القسط", "الوثائق المطلوبة", "منتجات التمويل", "مواعيد العمل"],
  },
};

/* ----------  UTILS  ---------- */
const now = (lang) =>
  new Date().toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true });

const extractAmount = (t) => {
  const m = t.match(/(\d{3,})\s*(qar)?/i);
  return m ? parseInt(m[1], 10) : null;
};
const extractMonths = (t) => {
  const m = t.match(/(\d+)\s*months?/i);
  return m ? parseInt(m[1], 10) : null;
};
const extractNationality = (t) => (/qatari/i.test(t) ? "Qatari" : "Expat");

/* ----------  EMI CORE  ---------- */
const getPayableRate = (months) => 0.047 - (12 - months) * 0.00392;
const calculateEMI = (principal, months) => {
  const totalPayable = principal * (1 + getPayableRate(months));
  return { emi: Math.round((totalPayable / months) * 100) / 100, total: Math.round(totalPayable) };
};

export const checkEligibility = ({ product, category, nationality, age, salary, jobDuration }) => {
  const rules = eligibilityRules[product]?.[category]?.[nationality];
  if (!rules) return { eligible: false, reason: "No rules found" };

  if (rules.minAge && age < rules.minAge) return { eligible: false, reason: `Minimum age is ${rules.minAge}` };
  if (rules.maxAge && age > rules.maxAge) return { eligible: false, reason: `Maximum age is ${rules.maxAge}` };
  if (rules.minSalary && salary < rules.minSalary) return { eligible: false, reason: `Minimum salary is ${rules.minSalary} QAR` };
  if (rules.traineeAllowed === false && jobDuration < 3) return { eligible: false, reason: `Minimum job duration is 3 months` };

  return { eligible: true, reason: "You meet all eligibility criteria" };
};


/* ----------  COMPONENT  ---------- */
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [context, setContext] = useState({
    activeFlow: null,
    flowStep: null,
    emiData: { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 },
  });

  
  const scrollRef = useRef(null);
  const t = text[language];
  const push = (role, content) =>
    setMessages(m => [...m, { role, content, time: now(language) }]);

  

  /* ----------  LIFE-CYCLE  ---------- */
  useEffect(() => {
    const time = now(language);
    setMessages([
      { role: "bot", content: `${t.greeting}\n`, time },
      { role: "faq", content: "", time },
    ]);
  }, [language, t.greeting]);
useEffect(() => {
  // Initialize embeddings on app load
  initKB().then(() => console.log("✅ KB embeddings ready!")).catch(err => console.error("KB init failed:", err));
}, []);



  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  /* ----------  KB EXECUTE  ---------- */
  const runKbFunction = (fn, userText) => {
    const nat = extractNationality(userText);
    const sal = extractAmount(userText) ?? 0;
    const job = extractMonths(userText)  ?? 0;
    const age = (userText.match(/\b(\d{2})\s*y/i) ? parseInt(userText.match(/\b(\d{2})\s*y/i)[1], 10) : 0) ?? 0;
    return fn({ nationality: nat, salary: sal, jobDurationMonths: job, age });
  };

const matchKnowledgeBase = (txt) => {
  // Don't match KB if we're in a follow-up conversation about docs
  const hasNationalityMemory = sessionMemory.has('nationality');
  const hasProductMemory = sessionMemory.has('product');
  const isFollowUp = /what about|how about|is this for|documents|docs/i.test(txt);
  
  if (hasNationalityMemory && hasProductMemory && isFollowUp) {
    return null; // Skip KB, let the smarter handlers above deal with it
  }

  const results = fuse.search(txt);
  if (!results.length) return null;
  
  const best = results[0];
  
  // Much stricter threshold
  if (best.score > 0.4) return null;
  
  const raw = best.item.response;
  return typeof raw === "function" ? runKbFunction(raw, txt) : raw;
};

  /* ----------  EMI FLOW  ---------- */
  const updateContext = (upd) => setContext((c) => ({ ...c, ...upd }));

  const cancelEMI = () => {
    updateContext({ activeFlow: null, flowStep: null, emiData: { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 } });
    const time = now(language);
    setMessages((m) => [...m, { role: "bot", content: t.cancelEMI, time }]);
  };

const sendMessage = async (msgInput = input) => {
  const userText = String(msgInput || "").trim();
  if (!userText) return;

  const time = now(language);
  const userMessage = { role: "user", content: userText, time };
  setMessages((m) => [...m, userMessage]);
  setInput("");

  const lower = userText.toLowerCase();

  // ========== PRIORITY 0: EMI FLOW (STRUCTURED - Keep regex) ==========
  if (context.activeFlow === "EMI") {
    return handleEMIFlow(userText, time);
  }

  // Start EMI calculation if user asks
  if (/calculate.*emi|emi.*calculation|new.*emi/i.test(lower) && !context.activeFlow) {
    updateContext({ activeFlow: "EMI", flowStep: "category", emiData: {} });
    return push('bot', "Please specify whether you want **Retail** or **Corporate** finance.");
  }

  // ========== PRIORITY 1: INTENT CLASSIFICATION (Embeddings) ==========
  // Use embeddings to understand what user REALLY wants
  const intent = await classifyIntent(userText);
  
  console.log("🎯 Detected intent:", intent);

  switch (intent.type) {
    case "DOCUMENT_REQUEST":
      return handleDocumentRequest(userText, intent);
    
    case "CLARIFICATION":
      return handleClarification(userText, intent);
    
    case "PRODUCT_SWITCH":
      return handleProductSwitch(userText, intent);
    
    case "EMI_QUERY":
      return handleEMIQuery(userText, intent);
    
    case "GENERAL_INFO":
      return handleGeneralInfo(userText, intent);
    
    case "GREETING":
      return push('bot', "Hello! How can I help you with First Finance today?");
    
    default:
      // Fall through to semantic search + Gemini
      break;
  }

  // ========== PRIORITY 2: SEMANTIC SEARCH (Knowledge Base) ==========
  try {
    await initEmbedder(); // Ensure embedder is ready
    const userEmbedding = await embedContent(userText);
    const match = findBestMatch(userEmbedding, 0.75); // Higher threshold = more accurate
    
    if (match) {
      console.log("✅ Semantic match found:", match.triggers[0]);
      const response = typeof match.response === "function" 
        ? runKbFunction(match.response, userText)
        : match.response;
      return push('bot', response);
    }
  } catch (err) {
    console.error("Embedding search failed:", err);
  }

  // ========== PRIORITY 3: GEMINI (Complex queries) ==========
  try {
    const geminiResponse = await askGemini(userText);
    if (geminiResponse && geminiResponse.length > 10) {
      return push('bot', geminiResponse);
    }
  } catch (err) {
    console.error("Gemini failed:", err);
  }

  // ========== FALLBACK ==========
  return push('bot', t.fallback);
};

// ==================== INTENT CLASSIFIER ====================
async function classifyIntent(userText) {
  const lower = userText.toLowerCase();
  
  // High-confidence patterns
  if (/hi|hello|hey|good morning|good evening|what can you (help|do)/i.test(userText)) {
    return { type: "GREETING", confidence: 1.0 };
  }
  
  if (/document|docs|required|paperwork|what.*bring|what.*need|approval/i.test(lower)) {
    return { 
      type: "DOCUMENT_REQUEST", 
      confidence: 0.9,
      entities: {
        nationality: extractNationality(userText),
        product: extractProduct(userText)
      }
    };
  }
  
  if (/is (this|it|that) (for|about)/i.test(lower)) {
    return { type: "CLARIFICATION", confidence: 0.95 };
  }
  
  if (/what about|how about/i.test(lower)) {
    return { 
      type: "PRODUCT_SWITCH", 
      confidence: 0.9,
      entities: { product: extractProduct(userText) }
    };
  }
  
  if (/emi|instalment|monthly|what.*pay|how much.*month/i.test(lower)) {
    return { type: "EMI_QUERY", confidence: 0.85 };
  }
  
  // General info queries
  if (/tell me|what.*you|about|services|options|financing|products|profit|rate|insurance|difference|can.*get|do you offer/i.test(lower)) {
    return { type: "GENERAL_INFO", confidence: 0.8 };
  }
  
  // Default to general info
  return { type: "GENERAL_INFO", confidence: 0.5 };
}

// ==================== GEMINI INTENT CLASSIFIER ====================



// ==================== SMART GEMINI QUERY ====================
async function askGemini(userText) {
  try {
    // Use your existing server endpoint
    const res = await interpretUserMessage(userText);
    return typeof res === "string" ? res : res.interpretation;
  } catch (err) {
    console.error("Gemini query failed:", err);
    return null;
  }
}

// ==================== INTENT HANDLERS ====================
function handleDocumentRequest(userText, intent) {
  let nat = intent.entities?.nationality || sessionMemory.get('nationality');
  let prod = intent.entities?.product || sessionMemory.get('product');

  const lastEMI = sessionMemory.get('lastEMI');
  if ((!nat || !prod) && lastEMI) {
    if (!nat) nat = lastEMI.nationality;
    if (!prod) prod = lastEMI.product;
  }

  if (nat && prod) {
    const docs = getDocumentList(nat, prod);
    return push('bot', docs);
  }

  const missing = [];
  if (!nat) missing.push("nationality (Qatari or Expat)");
  if (!prod) missing.push("finance product (Vehicle, Personal, Services, or Housing)");

  return push('bot', 
    `To provide the exact document list, please tell me:\n${missing.map(m => `• Your ${m}`).join('\n')}`
  );
}

function handleClarification(userText, intent) {
  const lastEMI = sessionMemory.get('lastEMI');
  const nat = sessionMemory.get('nationality');
  const prod = sessionMemory.get('product');
  
  if (lastEMI) {
    return push('bot', `The ${lastEMI.product} information I shared is for **${lastEMI.nationality}** clients.`);
  } else if (nat && prod) {
    return push('bot', `The ${prod} information I shared is for **${nat}** clients.`);
  } else {
    return push('bot', `I can provide information for both Qatari and Expat clients. Which applies to you?`);
  }
}

function handleProductSwitch(userText, intent) {
  const newProd = intent.entities?.product || extractProduct(userText);
  
  if (newProd && sessionMemory.has('nationality')) {
    sessionMemory.set('product', newProd);
    const nat = sessionMemory.get('nationality');
    const docs = getDocumentList(nat, newProd);
    return push('bot', docs);
  }
  
  return push('bot', "Which product would you like to know about? (Vehicle, Personal, Services, or Housing)");
}

function handleEMIQuery(userText, intent) {
  const lastEMI = sessionMemory.get('lastEMI');
  
  if (lastEMI) {
    return push('bot', `Your ${lastEMI.product} EMI is **${lastEMI.emi.toLocaleString()} QAR/month** over ${lastEMI.months} months.`);
  }
  
  return push('bot', "Would you like me to calculate an EMI for you? Just say 'calculate EMI' to start.");
}

async function handleGeneralInfo(userText, intent) {
  // Use Gemini for general questions
  const response = await askGemini(userText);
  if (response) {
    return push('bot', response);
  }
  return push('bot', t.fallback);
}

// ==================== HELPERS ====================
function extractProduct(text) {
  if (/vehicle|car/i.test(text)) return "Vehicle";
  if (/personal/i.test(text)) return "Personal";
  if (/service/i.test(text)) return "Services";
  if (/housing|home|property/i.test(text)) return "Housing";
  return null;
}

function getDocumentList(nationality, product) {
  const baseList = nationality === 'Qatari'
    ? `**Required Documents for ${product} Finance (Qatari):**

1. Recent salary certificate
2. Original Qatar ID
3. Bank statement (last 3 months)
4. Alternative payment cheques
5. National address certificate
6. Price offer directed to First Finance Company${product === 'Vehicle' ? '\n7. Vehicle inspection report (for used vehicles)' : ''}

All services are **Shariah-compliant**.`
    : `**Required Documents for ${product} Finance (Expat):**

1. Recent salary certificate
2. Original Qatar ID + Passport
3. Bank statement (last 3 months, bank stamped)
4. Alternative payment cheques
5. National address certificate
6. Price offer directed to First Finance Company${product === 'Vehicle' ? '\n7. Vehicle inspection report (for used vehicles)' : ''}

**Note:** Your sponsorship/residence must typically be with the same employer issuing the salary certificate.

All services are **Shariah-compliant**.`;

  return baseList;
}
function handleEMIFlow(userText, time) {
  // Check for cancel/stop commands
  if (/cancel|stop|no|never ?mind|no need|forget it|don'?t want|exit|quit/i.test(userText)) {
    return cancelEMI();
  }

  let newEmiData = { ...context.emiData };
  
  switch (context.flowStep) {
    case "category":
      if (/retail/i.test(userText)) newEmiData.category = "Retail";
      else if (/corporate/i.test(userText)) newEmiData.category = "Corporate";
      else return setMessages((m) => [...m, { role: "bot", content: "Please enter either **Retail** or **Corporate**.", time }]);
      updateContext({ flowStep: "nationality", emiData: newEmiData });
      setMessages((m) => [...m, { role: "bot", content: "Are you a **Qatari National** or an **Expat**?", time }]);
      return;
      
    case "nationality":
      if (/expat|expatriate/i.test(userText)) {
        newEmiData.nationality = "Expat";
      } else if (/qatar|qatari/i.test(userText)) {
        newEmiData.nationality = "Qatari";
      } else {
        return setMessages((m) => [...m, { role: "bot", content: "Please enter either **Qatari** or **Expat**.", time }]);
      }
      updateContext({ flowStep: "product", emiData: newEmiData });
      const products = newEmiData.category === "Retail" ? ["Vehicle", "Personal", "Services", "Housing"] : ["Corporate Vehicle", "Corporate Equipment", "Corporate Services"];
      setMessages((m) => [...m, { role: "bot", content: `Please select a finance product:\n${products.join(", ")}`, time }]);
      return;
      
    case "product": {
      const productsList = newEmiData.category === "Retail" ? ["Vehicle", "Personal", "Services", "Housing"] : ["Corporate Vehicle", "Corporate Equipment", "Corporate Services"];
      const selectedProduct = productsList.find((p) => p.toLowerCase() === userText.toLowerCase());
      if (!selectedProduct) return setMessages((m) => [...m, { role: "bot", content: `Please select a valid product:\n${productsList.join(", ")}`, time }]);
      newEmiData.product = selectedProduct;
      updateContext({ flowStep: "amount", emiData: newEmiData });
      setMessages((m) => [...m, { role: "bot", content: `Please provide the finance amount (in QAR) for your ${newEmiData.product}.`, time }]);
      return;
    }
    
    case "amount": {
      const amt = extractAmount(userText);
      if (!amt || amt <= 0) return setMessages((m) => [...m, { role: "bot", content: "Please enter a valid numeric amount (e.g., 20000).", time }]);
      newEmiData.amount = amt;
      updateContext({ flowStep: "tenure", emiData: newEmiData });
      setMessages((m) => [...m, { role: "bot", content: "Please specify the finance duration in months (e.g., 12, 24, 36, or 48).", time }]);
      return;
    }
    
    case "tenure": {
      let months = null;
      const monthMatch = userText.match(/(\d+)\s*months?/i);
      if (monthMatch) {
        months = parseInt(monthMatch[1], 10);
      } else {
        const numMatch = userText.match(/^\d+$/);
        if (numMatch) {
          months = parseInt(numMatch[0], 10);
        }
      }
      
      if (!months || months <= 0 || months > 48) {
        return setMessages((m) => [...m, { role: "bot", content: "Please enter a valid number of months between 1 and 48 (e.g., 12, 24, 36, or 48).", time }]);
      }
      
      newEmiData.tenureMonths = months;
      const { emi, total } = calculateEMI(newEmiData.amount, months);

      const emiRecord = {
        product: newEmiData.product,
        nationality: newEmiData.nationality,
        category: newEmiData.category,
        amount: newEmiData.amount,
        months,
        emi,
        total
      };
      
      let emis = sessionMemory.get('EMIs') || [];
      const existingIndex = emis.findIndex(e => e.product === newEmiData.product);
      
      if (existingIndex >= 0) {
        emis[existingIndex] = emiRecord;
      } else {
        emis.push(emiRecord);
      }
      
      sessionMemory.set('EMIs', emis);
      sessionMemory.set('lastEMI', emiRecord);
      sessionMemory.set('nationality', emiRecord.nationality);
      sessionMemory.set('product', emiRecord.product);

      const today = new Date();
      const firstInstallment = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastInstallment = new Date(firstInstallment);
      lastInstallment.setMonth(lastInstallment.getMonth() + months - 1);
      const formatDate = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      
      const reply = `**Preliminary Finance Details for ${newEmiData.product}**

Finance Amount: ${newEmiData.amount.toLocaleString()} QAR
Nationality: ${newEmiData.nationality}
Duration: ${months} months

- Total Payable Amount: ${total.toLocaleString()} QAR
- Down Payment: 0 QAR
- Monthly Instalment: **${emi.toLocaleString()} QAR**
- First Instalment: ${formatDate(firstInstallment)}
- Last Instalment: ${formatDate(lastInstallment)}

*This is a preliminary calculation only. Terms and conditions apply.*`;
      
      setMessages((m) => [...m, { role: "bot", content: reply, time }]);
      updateContext({ activeFlow: null, flowStep: null, emiData: { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 } });
      return;
    }
    
    default:
      break;
  }
}

  /* ----------  RENDER  ---------- */
  return (
    <div className={`app-container ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="chat-box">
        {/* HEADER */}
        <div className="chat-header">
          <div className="header-top">
            <div className="header-left">
              <div className="avatar">
                <img src="https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/75e38749934537.56086db928f2d.jpg" alt="F" className="avatar-img" />
              </div>
              <div className="header-title">
                <h1>First Finance</h1>
                <div className="header-status">{t.welcome}</div>
              </div>
            </div>
            <button className="lang-toggle" onClick={() => setLanguage((l) => (l === "en" ? "ar" : "en"))}>
              {language === "en" ? "العربية" : "English"}
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="messages">
          {messages.map((msg, i) =>
            msg.role === "faq" ? (
              <div key={i} className="faq-buttons-wrapper">
                {t.faqButtons.map((faq) => (
                  <button key={faq} className="faq-button-single" onClick={() => sendMessage(faq)}>
                    {faq}
                  </button>
                ))}
                <a href="https://wa.me/97444559988" target="_blank" rel="noopener noreferrer" className="faq-button-single agent-btn" style={{ textDecoration: "none" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: language === "ar" ? "0" : "8px", marginLeft: language === "ar" ? "8px" : "0", flexShrink: 0 }}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.263c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                  {language === "ar" ? "تواصل مع موظف" : "Speak to our team"}
                </a>
              </div>
            ) : (
              <div key={i} className={`message ${msg.role} animate-in`}>
                <div
                  className="message-content"
                  dangerouslySetInnerHTML={{
                    __html: String(msg.content || "")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br>"),
                  }}
                />
                <div className="message-time">{msg.time}</div>
              </div>
            )
          )}
          <div ref={scrollRef} />
        </div>

        {/* INPUT */}
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={t.placeholder}
          />
          <button className="send-button" onClick={() => sendMessage()} disabled={!input.trim()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="white" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}