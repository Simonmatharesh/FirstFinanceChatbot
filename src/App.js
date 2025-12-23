// App.js  
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { knowledgeBase } from "./knowledgeBase";
import Fuse from "fuse.js";

import { sessionMemory } from './sessionMemory';
import { emiRates, eligibilityRules, requiredDocs } from './config';
import { initKB, kbWithEmbeddings } from "./kbWithEmbeddings.js";
import { embedContent,initEmbedder} from "./embeddingAPI.js";
import { findBestMatch, isFollowUp, extractProduct, extractNationality } from "./semanticSearch.js";

/* ----------  CONFIG  ---------- */
const fuseOptions = { keys: ["triggers", "response"], threshold: 0.65, includeScore: true };
const fuse = new Fuse(knowledgeBase, fuseOptions);


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
const extractAge = (text) => {
  const match = text.match(/\b(\d{2})\s*(?:years?|yo|y\.?o\.?)\b/i);
  return match ? parseInt(match[1], 10) : null;
};

const extractSalary = (text) => {
  const match = text.match(/salary.*?(\d{3,})/i) || text.match(/(\d{4,})\s*(?:qar|riyals?)/i);
  return match ? parseInt(match[1].replace(/\D/g, ""), 10) : null;
};

const extractTenureYears = (text) => {
  const match = text.match(/(\d+)\s*years?/i);
  return match ? parseInt(match[1], 10) * 12 : null;
};


/* ----------  EMI CORE  ---------- */
const getPayableRate = (months) => 0.047 - (12 - months) * 0.00392;
const calculateEMI = (principal, months) => {
  const totalPayable = principal * (1 + getPayableRate(months));
  return { emi: Math.round((totalPayable / months) * 100) / 100, total: Math.round(totalPayable) };
};


export const checkEligibility = ({ product, nationality, age = 0, tenureMonths = 0, salary = 0, isTrainee = false ,userText = ""}) => {
  
  product = product?.toLowerCase() || "personal";
  const natKey = nationality === "Expat" ? "Expat" : "Qatari";  // Matches config exactly

  const rules = eligibilityRules[product]?.[natKey];
  if (!rules) {
    return { eligible: false, reasons: ["This product is not available for your nationality profile."] };
  }

  const reasons = [];


  if (age > 0 && age < 18) {
    reasons.push(`Minimum age requirement is 18 years (you mentioned ${age} years).`);
  }

  if (rules.maxAgeEnd && age > 0 && tenureMonths > 0) {
      const years = Math.ceil(tenureMonths / 12); 
      const ageAtEnd = age + years;
      if (ageAtEnd > rules.maxAgeEnd) {
          reasons.push(
              `Age at the end of the finance period must not exceed ${rules.maxAgeEnd} years (you would be ${ageAtEnd} years old).`
          );
      }
  }




  if (rules.minSalary && salary > 0 && salary < rules.minSalary) {
    reasons.push(`Minimum salary requirement is ${rules.minSalary.toLocaleString()} QAR (you mentioned ${salary.toLocaleString()} QAR).`);
  }

  
  if (isTrainee || /trainee/i.test(userText)) {
    if (product === "vehicle") {
      if (natKey === "Expat" && rules.trainee?.allowed === false) {
        reasons.push(`Trainees are not eligible for vehicle finance as an expat.`);
      } else if (natKey === "Qatari" && rules.trainee?.allowed === true) {
        reasons.push(`Trainees may be eligible with: ${rules.trainee.conditions}.`);
      }
    }
  }

  
  if (product === "personal" && natKey === "Expat" && rules.guarantorRequired) {
    reasons.push(`A Qatari guarantor is required for expats.`);
  }

  
  if (product === "services" && natKey === "Expat" && rules.downPaymentRequired) {
    reasons.push(`A minimum ${rules.minDownPaymentPercent}% down payment is required for expats.`);
  }

  if (reasons.length > 0) {
    return { eligible: false, reasons };
  }

  return { eligible: true, reason: "You appear to meet the basic eligibility criteria based on the information provided." };
};

const compareProducts = (products, nationality, salary = 0, tenureMonths = 0) => {
  const comparisons = products.map(prod => {
    const elig = checkEligibility({ product: prod, nationality, salary, tenureMonths });
    const rules = eligibilityRules[prod.toLowerCase()]?.Retail?.[nationality.toLowerCase()];
    return {
      product: prod,
      eligible: elig.eligible,
      pros: [
        `Max Amount: ${rules?.maxAmount.toLocaleString()} QAR`,
        `Tenure: Up to ${rules?.maxPeriodMonths} months`,
        `DSR Limit: ${rules?.maxDebtRatio * 100}%`,
        rules?.guarantorRequired ? '' : 'No guarantor needed',
        rules?.downPaymentPercent ? `Down Payment: ${rules.downPaymentPercent}%` : 'No down payment'
      ].filter(Boolean),
      cons: elig.reasons || (elig.eligible ? [] : ['Ineligible based on profile'])
    };
  });

  let response = '**Loan Comparison**\n\n';
  comparisons.forEach(c => {
    response += `### ${c.product}\n${c.eligible ? '✅ Eligible' : '❌ Ineligible'}\n**Pros:**\n${c.pros.map(p => `- ${p}`).join('\n')}\n**Cons:**\n${c.cons.map(con => `- ${con}`).join('\n') || 'None major'}\n\n`;
  });

  
  const best = comparisons.reduce((prev, curr) => curr.pros.length > prev.pros.length ? curr : prev);
  response += `**Recommended:** ${best.product} (higher limits/flexibility for your profile).`;

  return response;
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
  // Find the last bot message element
  const messagesContainer = document.querySelector('.messages');
  if (!messagesContainer) return;

  const botMessages = messagesContainer.querySelectorAll('.message.bot');
  const lastBotMessage = botMessages[botMessages.length - 1];

  if (lastBotMessage) {
    lastBotMessage.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    
    
    window.scrollBy(0, -20); 
  }
}, [messages]);

  /* ----------  KB EXECUTE  ---------- */
  const runKbFunction = (fn, userText) => {
    const nat = extractNationality(userText);
    const sal = extractAmount(userText) ?? 0;
    const job = extractMonths(userText)  ?? 0;
    const age = (userText.match(/\b(\d{2})\s*y/i) ? parseInt(userText.match(/\b(\d{2})\s*y/i)[1], 10) : 0) ?? 0;
    return fn({ nationality: nat, salary: sal, jobDurationMonths: job, age });
  };

  
const [kbReady, setKbReady] = useState(false);


useEffect(() => {
  initKB().then(() => {
    console.log("✅ KB embeddings ready!");
    setKbReady(true);
  }).catch(err => console.error("KB init failed:", err));
}, []);

const matchKnowledgeBase = (txt) => {
  
  const hasNationalityMemory = sessionMemory.has('nationality');
  const hasProductMemory = sessionMemory.has('product');
  const isFollowUp = /what about|how about|is this for|documents|docs/i.test(txt);
  
  if (hasNationalityMemory && hasProductMemory && isFollowUp) {
    return null; 
  }

  const results = fuse.search(txt);
  if (!results.length) return null;
  
  const best = results[0];
  
  
  if (best.score > 0.7) return null;
  
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
    // ========== PRIORITY -1: FAQ BUTTON SHORTCUTS ==========
  if (lower === "work hours" || lower === "working hours" || lower === "مواعيد العمل") {
    return push('bot', `**Branch Working Hours**

🏢 **Main Branch (C-Ring Road):**
- Sunday – Wednesday: **7:30 AM – 7:00 PM**
- Thursday: **7:30 AM – 2:30 PM**
- Saturday: **8:00 AM – 1:00 PM**
- Friday: **Closed**

🏢 **Mawater Branch:**
- Sunday – Thursday: **4:30 PM – 9:30 PM**
- Saturday: **4:30 PM – 7:00 PM**
- Friday: **Closed**

📱 **Mobile App & Website:**
Available **24/7** for your convenience!
All services are Shari'a-compliant financial services`);
  }

  //================Priority -0.5 Finance products shortcut =========
    if (lower === "finance products" || lower === "products") {
    return push('bot', `First Finance offers a range of Shari'a-compliant financial products for both retail and corporate customers. Here are the details:

**Retail Finance Products:**
-Personal Finance
-Vehicle Finance (new car, used car, marine, or motorcycle)
-Services Finance (includes healthcare services, travel and tourism, education, events, weddings, and furniture)
-Real Estate/Housing Finance

**Corporate Finance Products:**
-Commodities Finance
-Goods Finance
-Vehicle and Equipment Financing or Fleet Financing (Wholesale)
-Corporate Revolving Credit Product (Revolving Credit Limit)

All services provided by First Finance Company are Shari'a-compliant financial services.`);
  }
  //priority
  if (lower =="23062004"){
    return push('bot',
      '10/12/2003')
  }

  // ========== PRIORITY 0: EMI FLOW ==========
  if (context.activeFlow === "EMI") {
    return handleEMIFlow(userText, time);
  }

  if (/calculate.*emi|emi.*calculation|new.*emi/i.test(lower) && !context.activeFlow) {
    updateContext({ activeFlow: "EMI", flowStep: "category", emiData: {} });
    return push('bot', "Please specify whether you want **Retail** or **Corporate** finance.");
  }

  // ========== PRIORITY 1: EXTRACT CONTEXT FIRST ==========
  const detectedProduct = extractProduct(userText);
  const detectedNationality = extractNationality(userText);

  // Update session memory BEFORE follow-up check
  if (detectedProduct) {
    sessionMemory.setLastProduct(detectedProduct);
    console.log("📦 Product detected:", detectedProduct);
  }
  if (detectedNationality) {
    sessionMemory.set('nationality', detectedNationality);
    console.log("🏳️ Nationality detected:", detectedNationality);
  }

  // ========== PRIORITY 1.5: ELIGIBILITY QUESTIONS ==========
  if (/maximum|max|minimum|min|how much.*can|what.*age|age.*limit|what's.*age|whats.*age/i.test(lower)) {
    console.log("📊 Specific info question detected");
    
    const product = detectedProduct || sessionMemory.getLastProduct() || sessionMemory.get('product');
    const nationality = detectedNationality || sessionMemory.get('nationality');
    
    // Age questions
    if (/age.*limit|maximum.*age|max.*age|what.*age|age.*requirement/i.test(lower)) {
      if (!product) {
        return push('bot', `**Age Requirements:**\n\n**Qatari:**\n• Vehicle: 18-65 years\n• Personal: 18-65 years\n• Housing: 18-65 years\n• Services: 18-65 years\n\n**Expat:**\n• Vehicle: 18-60 years\n• Personal: 18-60 years\n• Housing: 18-65 years\n• Services: 18-60 years\n\nWhich product are you asking about?`);
      }
      
      const ages = {
        vehicle: { Qatari: "18-65 years", Expat: "18-60 years" },
        personal: { Qatari: "18-65 years", Expat: "18-60 years" },
        housing: { Qatari: "18-65 years", Expat: "18-65 years" },
        services: { Qatari: "18-65 years", Expat: "18-60 years" }
      };
      
      const prodLower = product.toLowerCase();
      if (nationality) {
        return push('bot', `**Maximum age for ${product.charAt(0).toUpperCase() + product.slice(1)} Finance (${nationality}):** ${ages[prodLower]?.[nationality]}\n\nAll services are 100% Shariah-compliant.`);
      } else {
        return push('bot', `**Age Requirements for ${product.charAt(0).toUpperCase() + product.slice(1)} Finance:**\n\n• Qatari: ${ages[prodLower]?.Qatari}\n• Expat: ${ages[prodLower]?.Expat}\n\nAre you Qatari or Expat?`);
      }
    }
    
    // Maximum amount questions
    if (/maximum|max.*amount|max.*finance|how much.*get|finance.*limit/i.test(lower)) {
      if (!product) {
        return push('bot', `**Maximum Finance Amounts:**\n\n**Qatari:**\n• Vehicle: 2,000,000 QAR\n• Personal: 2,000,000 QAR\n• Housing: Based on property value\n• Services: 2,000,000 QAR\n\n**Expat:**\n• Vehicle: 400,000 QAR\n• Personal: 200,000 QAR\n• Housing: Based on property value\n• Services: Varies\n\nWhich product interests you?`);
      }
      
      const amounts = {
        vehicle: { Qatari: "2,000,000 QAR", Expat: "400,000 QAR" },
        personal: { Qatari: "2,000,000 QAR", Expat: "200,000 QAR" },
        
        services: { Qatari: "2,000,000 QAR", Expat: "Varies by service" }
      };
      
      const prodLower = product.toLowerCase();
      if (nationality) {
        return push('bot', `**Maximum ${product.charAt(0).toUpperCase() + product.slice(1)} Finance for ${nationality}:** ${amounts[prodLower]?.[nationality]}\n\nAll services are 100% Shariah-compliant.`);
      } else {
        return push('bot', `**Maximum ${product.charAt(0).toUpperCase() + product.slice(1)} Finance:**\n\n• Qatari: ${amounts[prodLower]?.Qatari}\n• Expat: ${amounts[prodLower]?.Expat}\n\nAre you Qatari or Expat?`);
      }
    }
  }

// ========== PRIORITY 1.6: ELIGIBILITY QUESTIONS (GEMINI-POWERED) ==========
  const eligibilityKeywords = /can i (get|apply)|am i eligible|do i qualify|can.*apply for|eligible for|qualify for|options for|already have/i;
  const hasEligibilityIntent = eligibilityKeywords.test(lower);

  if (hasEligibilityIntent) {
    console.log("🎯 Complex eligibility question - routing to Gemini");
    
    // Let Gemini handle ALL eligibility questions
    try {
      const geminiResponse = await askGemini(userText);
      if (geminiResponse && geminiResponse.length > 10) {
        sessionMemory.addToHistory(userText, geminiResponse);
        
        // Update session memory with detected entities
        if (detectedNationality) sessionMemory.set('nationality', detectedNationality);
        if (detectedProduct) sessionMemory.setLastProduct(detectedProduct);
        
        return push('bot', geminiResponse);
      }
    } catch (err) {
      console.error("Gemini eligibility failed:", err);
    }

    
    return push('bot', `I'd be happy to check your eligibility! Please call our team at **4455 9999** for a detailed assessment. They can review your complete financial profile and provide accurate guidance.\n\nAll our services are 100% Shariah-compliant.`);
  }
  
 

// ========== PRIORITY 2: FOLLOW-UP DETECTION ==========
  const isFollowUpMsg = isFollowUp(userText);
  const currentContext = sessionMemory.getContextSummary();

  console.log("🔍 Current context:", currentContext);
  console.log("❓ Is follow-up?", isFollowUpMsg);

  // SPECIAL CASE: Single word nationality response
  if (/^(qatari|expat|expatriate)$/i.test(userText.trim())) {
    console.log("🏳️ Single-word nationality detected as follow-up");
    
    const nat = /expat|expatriate/i.test(userText) ? "Expat" : "Qatari";
    sessionMemory.set('nationality', nat);
    
    const lastProduct = sessionMemory.getLastProduct() || sessionMemory.get('product');
    
    if (lastProduct) {
      // Find KB entry for this product + nationality
      const category = `${lastProduct}_finance_${nat.toLowerCase()}`;
      const kbEntry = knowledgeBase.find(k => k.category === category);
      
      if (kbEntry) {
        const response = typeof kbEntry.response === "function"
          ? kbEntry.response({ nationality: nat, salary: 0, jobDurationMonths: 0, age: 0 })
          : kbEntry.response;
        
        sessionMemory.setCurrentTopic(category);
        sessionMemory.addToHistory(userText, response, category);
        return push('bot', response);
      }
    }
  }

  // Handle follow-up if we have product OR topic in context
  if (isFollowUpMsg && (currentContext.product || currentContext.topic)) {
    console.log("🔄 Follow-up detected!");
    return handleFollowUpQuestion(userText, currentContext);
  }



  // ========== PRIORITY 4: SEMANTIC SEARCH WITH CONTEXT ==========
  try {
    await initEmbedder();
    const userEmbedding = await embedContent(userText);
    
    const contextSummary = {
      topic: sessionMemory.getCurrentTopic(),
      product: sessionMemory.getLastProduct(),
      nationality: sessionMemory.get('nationality')
    };

    const match = findBestMatch(userEmbedding, kbWithEmbeddings, contextSummary, 0.55);
    
    if (match) {
      console.log("✅ KB match:", match.triggers[0], "Score:", match.score);
      
      // Update topic tracking
      if (match.category) {
        sessionMemory.setCurrentTopic(match.category);
      }

      const response = typeof match.response === "function" 
        ? runKbFunction(match.response, userText)
        : match.response;
      
      // Track conversation
      sessionMemory.addToHistory(userText, response, match.category);
      
      return push('bot', response);
    }
  } catch (err) {
    console.error("Embedding search failed:", err);
  }

  // ========== PRIORITY 5: GEMINI ==========
  try {
    const geminiResponse = await askGemini(userText);
    if (geminiResponse && geminiResponse.length > 10) {
      sessionMemory.addToHistory(userText, geminiResponse);
      return push('bot', geminiResponse);
    }
  } catch (err) {
    console.error("Gemini failed:", err);
  }

  // ========== FALLBACK ==========
  return push('bot', t.fallback);
};

// ========== FIXED FOLLOW-UP HANDLER ==========
function handleFollowUpQuestion(userText, context) {
  const { topic, product, nationality } = context;
  const newNationality = extractNationality(userText);
  const newProduct = extractProduct(userText);

  console.log("📋 Follow-up handler called with:", { 
    currentProduct: product, 
    currentNationality: nationality,
    currentTopic: topic,
    newNationality, 
    newProduct,
    userText
  });

  // Case 1: User asks about different nationality for SAME product
  // Example: User was discussing vehicle finance (expat), now asks "what about qatari"
  if (newNationality && product && !newProduct) {
    console.log(`🔀 Switching nationality from ${nationality} to ${newNationality} for ${product}`);
    
    sessionMemory.set('nationality', newNationality);
    
    // Try to find specific nationality version first
    const specificCategory = `${product}_finance_${newNationality.toLowerCase()}`;
    console.log("🔍 Looking for category:", specificCategory);
    
    let kbEntry = knowledgeBase.find(item => item.category === specificCategory);
    
    // If not found, look for any entry with this product that has nationality in triggers
    if (!kbEntry) {
      console.log("⚠️ Specific category not found, searching broader...");
      kbEntry = knowledgeBase.find(item => 
        item.category.includes(product.toLowerCase()) &&
        item.category.includes(newNationality.toLowerCase())
      );
    }

    // Last resort: find the product entry and call its response function
    if (!kbEntry) {
      console.log("⚠️ Still not found, using product category...");
      kbEntry = knowledgeBase.find(item => 
        item.category === `${product.toLowerCase()}_finance` ||
        item.category.startsWith(`${product.toLowerCase()}_finance`)
      );
    }

    if (kbEntry) {
      console.log("✅ Found KB entry:", kbEntry.category);
      
      const response = typeof kbEntry.response === "function"
        ? kbEntry.response({ 
            nationality: newNationality, 
            salary: 0, 
            jobDurationMonths: 0, 
            age: 0 
          })
        : kbEntry.response;
      
      sessionMemory.addToHistory(userText, response, kbEntry.category);
      sessionMemory.setCurrentTopic(kbEntry.category);
      return push('bot', response);
    }
    
    console.error("❌ No KB entry found for:", { product, newNationality });
  }

  // Case 2: User switches to different product (keeps nationality)
  if (newProduct && newProduct !== product) {
    console.log(`🔀 Switching product from ${product} to ${newProduct}`);
    
    sessionMemory.setLastProduct(newProduct);
    const useNationality = nationality || "Qatari";
    
    const specificCategory = `${newProduct}_finance_${useNationality.toLowerCase()}`;
    console.log("🔍 Looking for category:", specificCategory);
    
    let kbEntry = knowledgeBase.find(item => item.category === specificCategory);
    
    if (!kbEntry) {
      kbEntry = knowledgeBase.find(item => 
        item.category.includes(newProduct.toLowerCase()) &&
        item.category.includes(useNationality.toLowerCase())
      );
    }

    if (!kbEntry) {
      kbEntry = knowledgeBase.find(item => 
        item.category === `${newProduct.toLowerCase()}_finance`
      );
    }

    if (kbEntry) {
      console.log("✅ Found KB entry:", kbEntry.category);
      
      const response = typeof kbEntry.response === "function"
        ? kbEntry.response({ 
            nationality: useNationality, 
            salary: 0, 
            jobDurationMonths: 0, 
            age: 0 
          })
        : kbEntry.response;
      
      sessionMemory.addToHistory(userText, response, kbEntry.category);
      sessionMemory.setCurrentTopic(kbEntry.category);
      return push('bot', response);
    }
  }

  // Fallback: use Gemini with context
  console.log("⚠️ Follow-up handler couldn't resolve, falling back to Gemini");
  
  askGemini(userText).then(response => {
    if (response) {
      sessionMemory.addToHistory(userText, response);
      push('bot', response);
    } else {
      push('bot', "Could you please be more specific? What would you like to know?");
    }
  }).catch(err => {
    console.error("Gemini fallback failed:", err);
    push('bot', "Could you please be more specific? What would you like to know?");
  });
}

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






// ==================== SMART GEMINI QUERY ====================
async function askGemini(userText) {
  try {
    // Get conversation context
    const contextSummary = sessionMemory.getContextSummary();
    
    // Send context to server
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userText,
        context: contextSummary  // ✅ Send context to Gemini
      })
    });
    
    const data = await res.json();
    return data.interpretation;
  } catch (err) {
    console.error("Gemini query failed:", err);
    return null;
  }
}

// ==================== INTENT HANDLERS ====================


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
    
    return push('bot');
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
  const lower = text.toLowerCase();
  
  // Don't extract product from questions ABOUT products
  if (/is (personal|vehicle|housing|service)|same as|difference|what.*personal|tell me about/i.test(lower)) {
    return null;
  }
  
  if (/vehicle|car/i.test(lower)) return "vehicle";
  if (/personal/i.test(lower)) return "personal";
  if (/service/i.test(lower)) return "services";
  if (/housing|home|property/i.test(lower)) return "housing";
  
  return null;
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
    <div className={`app-container ${language === "ar"}`} dir={language === "ar"}>
      <div className="chat-box">
        {/* HEADER */}
        <div className="chat-header">
          <div className="header-top">
            <div className="header-left">
              <div className="avatar">
                <img src="https://r6.cloud.yellow.ai/minio/uploads/c0c7f15b-0186-4735-9e78-b13885813d6c.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=r6ymblob%2F20251223%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251223T081402Z&X-Amz-Expires=60&X-Amz-SignedHeaders=host&X-Amz-Signature=53f517bf20a0ace645b88942cc87e082349fd4b103436d6321bf2b4a727269a1" alt="F" className="avatar-img" />
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
                <a href="https://wa.me/97444559999" target="_blank" rel="noopener noreferrer" className="faq-button-single agent-btn" style={{ textDecoration: "none" }}>
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