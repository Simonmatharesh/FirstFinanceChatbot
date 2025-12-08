// App.js  (411 → ~260 lines, same look, works)
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { knowledgeBase } from "./knowledgeBase";
import Fuse from "fuse.js";
import { interpretUserMessage } from "./gemini";
import { sessionMemory } from './sessionMemory';
import { emiRates, eligibilityRules, requiredDocs } from './config';
import { initKB, kbWithEmbeddings } from "./kbWithEmbeddings.js";
import { embedContent } from "./embeddingAPI.js";
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
    fallback: "You can ask about EMI calculation, required documents, finance products, working hours, or contact us.",
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
    const results = fuse.search(txt);
    if (!results.length) return null;
    const best = results[0];
    if (best.score > 0.6) return null;
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
const emis = sessionMemory.get('EMIs') || [];
if (/is this for qatari|expat/i.test(lower) && context.activeFlow !== "EMI") {
  if (emis.length === 0) return push('bot', "I don't have any EMI calculated yet. Please calculate an EMI first.");

  let productMatch = emis[0]; // default to first
  const productMentioned = ["vehicle", "housing", "travel"].find(p => lower.includes(p));
  if (productMentioned) {
    const match = emis.find(e => e.product.toLowerCase() === productMentioned);
    if (match) productMatch = match;
  }

  return push('bot', `Your ${productMatch.product} EMI calculation is for ${productMatch.nationality}.`);
}


/* =====  1.  “same thing but X months”  (highest priority)  ===== */
// 1. Change months
if (/(same|change).*month|month.*to/.test(lower) && sessionMemory.has('lastEMI')) {
  const months = extractMonths(lower) || sessionMemory.get('lastEMI').months;
  const { amount, nationality, product } = sessionMemory.get('lastEMI');
  const { emi, total } = calculateEMI(amount, months);
  sessionMemory.set('lastEMI', { amount, months, nationality, product, emi, total });
  return push('bot', `Updated EMI for ${product} (${nationality}) over ${months} months: ${emi} QAR/month, Total: ${total} QAR`);
}

// 2. What was my EMI
if (/again|was.*emi|emi.*amount|monthly.*amount/.test(lower) && sessionMemory.has('lastEMI')) {
  const { emi, product } = sessionMemory.get('lastEMI');
  return push('bot', `Your monthly EMI for ${product} is **${emi.toLocaleString()} QAR**.`);
}
/* =====  3.  “I need to calculate EMI”  (but we already have one)  ===== */
if (/calculate.*emi|new.*emi/.test(lower) && sessionMemory.has('lastEMI')){
  const { product } = sessionMemory.get('lastEMI');
  return push('bot', `I have already calculated the EMI for your ${product.toLowerCase()} finance.  
If you need to change any details or perform a new calculation, please specify the details you would like to update.`);
}

/* =====  4.  ANY docs request  →  use remembered product / nationality  ===== */
if (/document|required|papers|مستندات/.test(lower)){
  const nat  = sessionMemory.get('nationality');
  const prod = sessionMemory.get('product');
  if (nat && prod){
    const docs = nat==='Qatari'
      ? `Recent salary certificate, Original ID, Bank statement (3 months), Alternative cheques, National address certificate, Price offer to FFC, Inspection report (used).`
      : `Recent salary certificate, Original ID + passport, Bank statement (3 months stamped), Alternative cheques, National address certificate, Price offer to FFC, Inspection report (used).  
Generally, your sponsorship/residence must be with the same employer that issues the salary certificate.`;
    return push('bot', `For ${prod.toLowerCase()} financing (${nat}), the required documents are:\n\n${docs}\n\nAll services are **Shariah-compliant**.`);
  }
}

/* =====  5.  “What is the rate for personal loan”  →  use remembered nationality  ===== */
if (/rate.*personal|personal.*rate|profit.*personal/.test(lower) && sessionMemory.has('nationality')){
  const nat = sessionMemory.get('nationality');
  const max = nat==='Qatari' ? 2_000_000 : 200_000;
  const ratio = nat==='Qatari' ? 75 : 50;
  return push('bot', `Personal-finance profit rate is **variable**; the maximum limit is ${max.toLocaleString()} QAR for ${nat} clients, with a debt-burden ratio of ≤ ${ratio} %.  
Would you like me to calculate a preliminary instalment?`);
}

/* ----------  end SMART REPLIES  ---------- */

    /* ----------  EMI CONTEXT  ---------- */
    if (context.activeFlow === "EMI" || /emi|calculate/i.test(userText)) {
      const strongOffTopic = /document|doc|required|list|paperwork|salary|certificate|noc|branch|location|hour|timing|contact|rate|interest|profit|fee|eligibility|criteria|apply|process|how|card|account|insurance|refinance/i.test(userText);
      if (strongOffTopic && context.activeFlow === "EMI") {
        updateContext({ activeFlow: null, flowStep: null, emiData: { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 } });
        setMessages((m) => [...m, { role: "bot", content: `Got it! I've cancelled the EMI calculation.\n\nHow can I help you with "${userText}"?`, time }]);
        return;
      }
      if (/cancel|stop|no|never ?mind|no need|forget it|don'?t want|exit|quit/i.test(userText)) return cancelEMI();

      if (!context.activeFlow) {
        updateContext({ activeFlow: "EMI", flowStep: "category", emiData: {} });
        setMessages((m) => [...m, { role: "bot", content: "Please specify whether you want **Retail** or **Corporate** finance.", time }]);
        return;
      }
      let newEmiData = { ...context.emiData };

      const nat = extractNationality(userText);
      if (nat) newEmiData.nationality = nat;

      const amt = extractAmount(userText);
      if (amt) newEmiData.amount = amt;

      const months = extractMonths(userText);
      if (months) newEmiData.tenureMonths = months;

      const ageMatch = userText.match(/\b(\d{2})\s*y/i);
      if (ageMatch) newEmiData.age = parseInt(ageMatch[1], 10);
      const { category, nationality, product, amount, tenureMonths, age } = newEmiData;

      if (category && nationality && product && amount && tenureMonths && age) {
        const { eligible, reason } = checkEligibility(newEmiData);
        push('bot', eligible
          ? "You are eligible for this finance product."
          : `Sorry, you are not eligible: ${reason}`);
      }


      // Save updated context
      updateContext({ emiData: newEmiData });
      switch (context.flowStep) {
        case "category":
          if (/retail/i.test(userText)) newEmiData.category = "Retail";
          else if (/corporate/i.test(userText)) newEmiData.category = "Corporate";
          else return setMessages((m) => [...m, { role: "bot", content: "Please enter either **Retail** or **Corporate**.", time }]);
          updateContext({ flowStep: "nationality", emiData: newEmiData });
          setMessages((m) => [...m, { role: "bot", content: "Are you a **Qatari National** or an **Expat**?", time }]);
          return;
        case "nationality":
          if (/expat/i.test(userText)) newEmiData.nationality = "Expat";
          else if (/qatari/i.test(userText)) newEmiData.nationality = "Qatari";
          else return setMessages((m) => [...m, { role: "bot", content: "Please enter either **Qatari** or **Expat**.", time }]);
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
          setMessages((m) => [...m, { role: "bot", content: `Please provide the finance amount for your ${newEmiData.product} as ${newEmiData.nationality}.`, time }]);
          return;
        }
        case "amount": {
          const amt = extractAmount(userText);
          if (!amt || amt <= 0) return setMessages((m) => [...m, { role: "bot", content: "Please enter a valid numeric amount.", time }]);
          newEmiData.amount = amt;
          updateContext({ flowStep: "tenure", emiData: newEmiData });
          setMessages((m) => [...m, { role: "bot", content: "Please specify the finance duration in months (1-48).", time }]);
          return;
        }
        case "tenure": {
          const months = extractMonths(userText);
          if (!months || months <= 0 || months > 48) return setMessages((m) => [...m, { role: "bot", content: "Please enter a valid number of months (1-48).", time }]);
          newEmiData.tenureMonths = months;
          const { emi, total } = calculateEMI(newEmiData.amount, months);

          // Save to sessionMemory
          // Save multiple EMIs
          let emis = sessionMemory.get('EMIs') || [];
          const existingIndex = emis.findIndex(e => e.product === newEmiData.product);
          if (existingIndex >= 0) {
            emis[existingIndex] = { product: newEmiData.product, nationality: newEmiData.nationality, category: newEmiData.category, amount: newEmiData.amount, months, emi, total };
          } else {
            emis.push({ product: newEmiData.product, nationality: newEmiData.nationality, category: newEmiData.category, amount: newEmiData.amount, months, emi, total });
          }
          sessionMemory.set('EMIs', emis);
          sessionMemory.set('lastEMI', { ...emis[existingIndex >= 0 ? existingIndex : emis.length - 1] });
          sessionMemory.set('nationality', emis[existingIndex >= 0 ? existingIndex : emis.length - 1].nationality);
          sessionMemory.set('product', emis[existingIndex >= 0 ? existingIndex : emis.length - 1].product);



          const today = new Date();
          const firstInstallment = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          const lastInstallment = new Date(firstInstallment);
          lastInstallment.setMonth(lastInstallment.getMonth() + months - 1);
          const formatDate = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          const reply = `
The Preliminary Finance Details for your ${newEmiData.product} finance of ${newEmiData.amount.toLocaleString()} QAR as ${newEmiData.nationality}, over ${months} months:

- Total Payable Amount: ${total.toLocaleString()} QAR
- Down Payment Amount: 0 QAR
- Monthly Preliminary Amount: ${emi.toLocaleString()} QAR
- First Installment Date: ${formatDate(firstInstallment)}
- Last Installment Date: ${formatDate(lastInstallment)}

**This is a preliminary calculation only, terms and conditions apply.**`;
          setMessages((m) => [...m, { role: "bot", content: reply, time }]);
          updateContext({ activeFlow: null, flowStep: null, emiData: { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 } });
          return;
        }
        default:
          break;
      }
    }

    /* ----------  NORMAL KB / GEMINI  ---------- */
    const kbAnswer = matchKnowledgeBase(userText);
    if (kbAnswer) {
      setMessages((m) => [...m, { role: "bot", content: kbAnswer, time }]);
      return;
    }
    // ----------- EMBEDDINGS / SEMANTIC SEARCH -----------


    let geminiText = "";
    try {
      const res = await interpretUserMessage(userText);
      if (typeof res === "string") geminiText = res.trim();
      else if (typeof res?.interpretation === "string") geminiText = res.interpretation.trim();
      else if (typeof res?.interpretation?.text === "string") geminiText = res.interpretation.text.trim();
    } catch (err) {
      console.error("Error calling Gemini:", err);
    }
    const botReply = geminiText || t.fallback;
    setMessages((m) => [...m, { role: "bot", content: botReply, time }]);
  };

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