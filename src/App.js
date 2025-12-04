// App.js
import { useState, useEffect } from "react";
import "./App.css";
import { knowledgeBase } from "./knowledgeBase";
import Fuse from "fuse.js";
import { interpretUserMessage } from "./gemini";



export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [emiStep, setEmiStep] = useState(null); // "category" | "nationality" | "product" | "amount" | "tenure"
  const [emiData, setEmiData] = useState({
    category: "",
    nationality: "",
    product: "",
    amount: 0,
    tenureMonths: 0,
  });
  const [language, setLanguage] = useState("en");
  const fuseOptions = {
  keys: ["triggers", "response"],
  threshold: 0.35,          // 0 = exact match | 1 = anything matches
  includeScore: true,
};
const parseEMIData = (text) => {
  const data = { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 };

  if (/retail/i.test(text)) data.category = "Retail";
  else if (/corporate/i.test(text)) data.category = "Corporate";

  if (/expat/i.test(text)) data.nationality = "Expat";
  else if (/qatari/i.test(text)) data.nationality = "Qatari";

  if (/vehicle/i.test(text)) data.product = "Vehicle";
  // match amounts like "20000", "QAR 20000", etc.
  const amtMatch = text.match(/(\d{3,})\s*(qar)?/i);
  if (amtMatch) data.amount = parseInt(amtMatch[1], 10);

  // match tenure like "6 months"
  const tenureMatch = text.match(/(\d+)\s*(months|month)/i);
  if (tenureMatch) data.tenureMonths = parseInt(tenureMatch[1], 10);

  return data;
};


const fuse = new Fuse(knowledgeBase, fuseOptions);


  const text = {
    en: {
      greeting: "Hi, Welcome to First Finance.\n I am Hadi your virtual assistant.",
      welcome: "I'm here to help with Shariah-compliant financing.",
      faqButtons: ["EMI Calculation", "Required Documents", "Finance Products", "Work Hours"],
      placeholder: "Type your message...",
      fallback: "You can ask about EMI calculation, required documents, finance products, working hours, or contact us.",
      cancelEMI: "Got it! I've cancelled the EMI calculation.\n\nHow else can I help you today?",
    },
    ar: {
      greeting: "مرحباً، أهلاً بك في فرست فاينانس. أنا هادي، مساعدك الافتراضي.",
      welcome: "أنا هنا لمساعدتك في التمويل المتوافق مع الشريعة الإسلامية.\n\nكيف يمكنني مساعدتك اليوم؟",
      faqButtons: ["حساب القسط", "الوثائق المطلوبة", "منتجات التمويل", "مواعيد العمل"],
      placeholder: "اكتب رسالتك...",
      fallback: "يمكنك السؤال عن حساب القسط، الوثائق المطلوبة، منتجات التمويل، مواعيد العمل، أو التواصل معنا.",
      cancelEMI: "تم! تم إلغاء حساب القسط.\n\nكيف يمكنني مساعدتك أيضاً؟",
    },
  };
  const t = text[language];
  

  useEffect(() => {
  const container = document.querySelector(".messages");
  if (!container) return;

  // Get last message
  const lastMessage = container.querySelector(".message:last-child");
  if (!lastMessage) return;

  // Scroll behavior
  if (lastMessage.classList.contains("bot")) {
    // If it's a bot message, scroll to top of message
    lastMessage.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    // If it's a user message, scroll to bottom
    lastMessage.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}, [messages]);

  // Welcome message
  useEffect(() => {
    const time = new Date().toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    setMessages([
      { role: "bot", content: `${t.greeting}\n`, time },
      { role: "faq", time },
    ]);
  }, [language]); // Only language is needed — t is derived from it

  const faqList = t.faqButtons;

// Calculate payable% based on your discovered linear pattern
const getPayableRate = (months) => {
  const base = 0.0470;          // 4.70 for 12 months
  const drop = 0.00392;         // ≈0.392% decrease per month earlier
  return base - (12 - months) * drop;
};

const calculateEMI = (principal, months) => {
  const profitRate = getPayableRate(months); 
  const totalPayable = principal * (1 + profitRate);
  const emi = totalPayable / months;

  return {
    emi: Math.round(emi * 100) / 100,
    total: Math.round(totalPayable),
    profitPercent: profitRate * 100,
  };
};


// Knowledge base matching with Fuse.js
const matchKnowledgeBase = (text) => {
  const results = fuse.search(text);
  if (!results.length) return null;

  const best = results[0];
  // Only return KB answer if confidence is high enough
  // Lower score = better match; Fuse score ranges 0 → exact, 1 → no match
  if (best.score > 0.6) return null;  
  return best.item.response;
};

// Main sendMessage function
const sendMessage = async (msgInput = input) => {
  const userText = String(msgInput || "").trim();
  if (!userText) return;

  const time = new Date().toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const userMessage = { role: "user", content: userText, time };
  setMessages(p => [...p, userMessage]);
  setInput("");

  let newEmiData = { ...emiData };

  // ===== EMI FLOW =====
  // ===== EMI FLOW =====
if (emiStep || /emi|calculate/i.test(userText)) {
  // Handle cancel
  if (/cancel/i.test(userText)) {
    setEmiStep(null);
    setEmiData({ category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 });
    setMessages(p => [...p, { role: "bot", content: t.cancelEMI, time }]);
    return;
  }

  // Start EMI if not already started
  if (!emiStep) {
    setEmiStep("category");
    setMessages(p => [...p, { role: "bot", content: "Please specify whether you want **Retail** or **Corporate** finance.", time }]);
    return;
  }

  let newEmiData = { ...emiData };

  switch (emiStep) {
    case "category":
      if (/retail/i.test(userText)) newEmiData.category = "Retail";
      else if (/corporate/i.test(userText)) newEmiData.category = "Corporate";
      else {
        setMessages(p => [...p, { role: "bot", content: "Please enter either **Retail** or **Corporate**.", time }]);
        return; // stay in category step
      }
      setEmiStep("nationality");
      setMessages(p => [...p, { role: "bot", content: "Are you a **Qatari National** or an **Expat**?", time }]);
      break;

    case "nationality":
      if (/expat/i.test(userText)) newEmiData.nationality = "Expat";
      else if (/qatari/i.test(userText)) newEmiData.nationality = "Qatari";
      else {
        setMessages(p => [...p, { role: "bot", content: "Please enter either **Qatari** or **Expat**.", time }]);
        return; // stay in nationality step
      }
      setEmiStep("product");
      const products = newEmiData.category === "Retail"
        ? ["Vehicle", "Personal", "Services", "Housing"]
        : ["Corporate Vehicle", "Corporate Equipment", "Corporate Services"];
      setMessages(p => [...p, { role: "bot", content: `Please select a finance product:\n${products.join(", ")}`, time }]);
      break;

    case "product":
      const productsList = newEmiData.category === "Retail"
        ? ["Vehicle", "Personal", "Services", "Housing"]
        : ["Corporate Vehicle", "Corporate Equipment", "Corporate Services"];
      
      const selectedProduct = productsList.find(p => p.toLowerCase() === userText.toLowerCase());
      if (!selectedProduct) {
        setMessages(p => [...p, { role: "bot", content: `Please select a valid product:\n${productsList.join(", ")}`, time }]);
        return; // stay in product step
      }
      newEmiData.product = selectedProduct;
      setEmiStep("amount");
      setMessages(p => [...p, { role: "bot", content: `Please provide the finance amount for your ${newEmiData.product} as ${newEmiData.nationality}.`, time }]);
      break;

    case "amount":
      const amt = parseInt(userText.replace(/[^\d]/g, ""), 10);
      if (!amt || amt <= 0) {
        setMessages(p => [...p, { role: "bot", content: "Please enter a valid numeric amount.", time }]);
        return; // stay in amount step
      }
      newEmiData.amount = amt;
      setEmiStep("tenure");
      setMessages(p => [...p, { role: "bot", content: "Please specify the finance duration in months (1-48).", time }]);
      break;

    case "tenure":
      const months = parseInt(userText.replace(/[^\d]/g, ""), 10);
      if (!months || months <= 0 || months > 48) {
        setMessages(p => [...p, { role: "bot", content: "Please enter a valid number of months (1-48).", time }]);
        return; // stay in tenure step
      }
      newEmiData.tenureMonths = months;

      const { emi, total } = calculateEMI(newEmiData.amount, newEmiData.tenureMonths);
      const today = new Date();
      const firstInstallment = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastInstallment = new Date(firstInstallment);
      lastInstallment.setMonth(lastInstallment.getMonth() + newEmiData.tenureMonths - 1);

      const formatDate = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      const reply = `
The Preliminary Finance Details for your ${newEmiData.product} finance of ${newEmiData.amount.toFixed(2)} QAR as ${newEmiData.nationality}, over ${newEmiData.tenureMonths} months:

- Total Payable Amount: ${total.toFixed(2)} QAR
- Down Payment Amount: 0 QAR
- Monthly Preliminary Amount: ${emi.toFixed(2)} QAR
- First Installment Date: ${formatDate(firstInstallment)}
- Last Installment Date: ${formatDate(lastInstallment)}

**This is a preliminary calculation only, terms and conditions apply.**
`;

      setMessages(p => [...p, { role: "bot", content: reply, time }]);
      setEmiStep(null);
      newEmiData = { category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 };
      break;
  }

  setEmiData(newEmiData);
  return; // stop here, don’t process KB/Gemini for EMI flow
}

  // ===== NORMAL FLOW (KB + Gemini) =====
  const kbAnswer = matchKnowledgeBase(userText);

  let geminiText = "";
  try {
    const res = await interpretUserMessage(userText);
    if (typeof res === "string") geminiText = res.trim();
    else if (typeof res?.interpretation === "string") geminiText = res.interpretation.trim();
    else if (typeof res?.interpretation?.text === "string") geminiText = res.interpretation.text.trim();
  } catch (err) {
    console.error("Error calling Gemini:", err);
  }

  const botReply = kbAnswer || geminiText || t.fallback;
  setMessages(p => [...p, { role: "bot", content: botReply, time }]);
};






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
                <div className="header-status">How can I help you today?</div>
              </div>
            </div>
            <button className="lang-toggle" onClick={() => setLanguage(l => l === "en" ? "ar" : "en")}>
              {language === "en" ? "العربية" : "English"}
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="messages">
          {messages.map((msg, i) =>
            msg.role === "faq" ? (
              <div key={i} className="faq-buttons-wrapper">
                {faqList.map((faq) => (
                  <button key={faq} className="faq-button-single" onClick={() => sendMessage(faq)}>
                    {faq}
                  </button>
                  
                ))}
                {/* Chat with an Agent – WhatsApp icon, no underline, no green dot */}
                <a
                  href="https://wa.me/97444559988"          // ← your real number
                  target="_blank"
                  rel="noopener noreferrer"
                  className="faq-button-single agent-btn"
                  style={{ textDecoration: "none" }}       // removes underline
                >
                  {/* Official WhatsApp icon – pure white */}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ marginRight: language === "ar" ? "0" : "8px", marginLeft: language === "ar" ? "8px" : "0", flexShrink: 0 }}
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.263c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>

                  {language === "ar" ? "تواصل مع موظف" : "Speak to our team"}
                </a>
              </div>
            ) : (
              <div key={i} className={`message ${msg.role} animate-in`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div
                  className="message-content"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br>"),
                  }}
                />
                <div className="message-time">{msg.time}</div>
              </div>
            )
          )}
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
          <button className="send-button" onClick={sendMessage} disabled={!input.trim()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="white" />
            </svg>
          </button>
        </div>
        
      </div>
    </div>
  );
}