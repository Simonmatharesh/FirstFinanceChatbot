// App.js
import { useState, useEffect } from "react";
import "./App.css";
import { knowledgeBase } from "./knowledgeBase";
import Fuse from "fuse.js";


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

    const lastBotMessage = container.querySelector(".message.bot:last-child");
    if (!lastBotMessage) return;

    lastBotMessage.scrollIntoView({ 
      behavior: "smooth", 
      block: "start",
      inline: "nearest" 
    });

    setTimeout(() => window.scrollBy(0, -80), 300);
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


  const matchKnowledgeBase = (text) => {
    const results = fuse.search(text);

    if (results.length === 0) return null;

    // best match
    const best = results[0];

    // avoid stupid matches
    if (best.score > 0.45) return null;

    return best.item.response;
  };


const sendMessage = (msgInput = input) => {
  if (!msgInput.trim()) return;

  const userText = msgInput.trim();
  const lowerText = userText.toLowerCase();
  const time = new Date().toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const userMessage = { role: "user", content: userText, time };

  // ——— 1. POST_CALC HANDLED FIRST — ALWAYS ———
  if (emiStep === "post_calc") {
    const kbResp = matchKnowledgeBase(userText);
    if (kbResp) {
      setMessages(p => [...p, userMessage, { role: "bot", content: kbResp, time }]);
      setInput("");
      return;
    }

    const wantsNew = lowerText.includes("new") || lowerText.includes("again") || 
                     lowerText.includes("another") || lowerText.includes("different") ||
                     lowerText.includes("جديد") || lowerText.includes("حساب جديد");

    if (wantsNew || lowerText.includes("emi") || lowerText.includes("قسط") || lowerText.includes("حساب")) {
      setEmiStep("category");
      setEmiData({ category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 });
      const resp = language === "ar" ? "هل الطلب كـ **فرد** أم **شركة**؟" : "Are you applying as **Retail** or **Corporate**?";
      setMessages(p => [...p, userMessage, { role: "bot", content: resp, time }]);
      setInput("");
      return;
    }

    setMessages(p => [...p, userMessage, { role: "bot", content: t.fallback, time }]);
    setInput("");
    return;
  }

  // ——— 2. IF WE ARE IN ANY EMI STEP EXCEPT post_calc → CONTINUE FLOW ———
  if (emiStep) {
    let botResponse = "";
    let nextStep = emiStep;

    if (emiStep === "category") {
      if (lowerText.includes("retail") || lowerText.includes("فرد")) {
        setEmiData(p => ({ ...p, category: "Retail" }));
        nextStep = "nationality";
        botResponse = language === "ar" ? "هل أنت **قطري** أم **مقيم**؟" : "Are you a **Qatari** or an **Expat**?";
      } else if (lowerText.includes("corporate") || lowerText.includes("شركة")) {
        botResponse = language === "ar" ? "تمويل الشركات عبر الفروع فقط" : "Corporate finance is available at branches only.";
        nextStep = null;
      } else {
        botResponse = language === "ar" ? "الرجاء الرد بـ **فرد** أو **شركة**" : "Please reply **Retail** or **Corporate**";
      }
    }

    else if (emiStep === "nationality") {
      if (lowerText.includes("expat") || lowerText.includes("مقيم")) {
        setEmiData(p => ({ ...p, nationality: "Expat" }));
        nextStep = "product";
      } else if (lowerText.includes("qatari") || lowerText.includes("قطري")) {
        setEmiData(p => ({ ...p, nationality: "Qatari" }));
        nextStep = "product";
      } else {
        botResponse = language === "ar" ? "الرجاء الرد **قطري** أو **مقيم**" : "Please reply **Qatari** or **Expat**";
      }
      if (nextStep === "product") {
        botResponse = language === "ar"
          ? "**اختر نوع التمويل:**\n\n• مركبة\n• شخصي\n• خدمات\n• سكن"
          : "**Select finance product:**\n\n• Vehicle\n• Personal\n• Services\n• Housing";
      }
    }

    else if (emiStep === "product") {
      const map = { vehicle: ["vehicle", "مركبة", "car"], personal: ["personal", "شخصي"], services: ["services", "خدمات"], housing: ["housing", "سكن", "home"] };
      const chosen = Object.keys(map).find(k => map[k].some(w => lowerText.includes(w)));
      if (chosen) {
        setEmiData(p => ({ ...p, product: chosen.charAt(0).toUpperCase() + chosen.slice(1) }));
        nextStep = "amount";
        botResponse = language === "ar" ? `كم مبلغ التمويل لـ ${chosen === "vehicle" ? "مركبة" : chosen === "personal" ? "شخصي" : chosen === "services" ? "خدمات" : "سكن"}؟` : `Finance amount for ${chosen}? (in QAR)`;
      } else {
        botResponse = language === "ar" ? "اختر: مركبة • شخصي • خدمات • سكن" : "Choose: Vehicle • Personal • Services • Housing";
      }
    }

    else if (emiStep === "amount") {
      const amount = parseInt(userText.replace(/[^0-9]/g, ""));
      if (isNaN(amount) || amount < 5000) {
        botResponse = language === "ar" ? "الحد الأدنى 5,000 ريال" : "Minimum 5,000 QAR";
      } else {
        setEmiData(p => ({ ...p, amount }));
        nextStep = "tenure";
        botResponse = language === "ar" ? "كم المدة؟ (مثال: 24 شهر)" : "Tenure? (e.g. 24 months)";
      }
    }

else if (emiStep === "tenure") {
  const months = parseInt(userText) || 0;

  if (months < 1 || months > 48) {
    botResponse = language === "ar"
      ? "المدة يجب أن تكون بين 1 و48 شهراً"
      : "Tenure must be between 1 and 48 months";
  } else {

    // 1. read amount before state updates
    const amount = emiData.amount;
    const tenure = months;

    // 2. update tenure in state
    setEmiData(p => ({ ...p, tenureMonths: tenure }));

    // 3. calculate EMI using correct amount
    const { total, emi } = calculateEMI(amount, tenure);

    // 4. switch to post_calc (important!)
    nextStep = "post_calc";

    // 5. ONLY ONE botResponse — keep it clean
    botResponse = language === "ar"
      ? `تفاصيل التمويل:\nمبلغ: ${amount.toLocaleString()} ريال\nمدة: ${tenure} شهر\nإجمالي: ${total.toLocaleString()} ريال\nشهري: ${emi.toFixed(2)} ريال\n\nهل تريد المزايا أو الوثائق؟`
      : `Preliminary Details:\nAmount: ${amount.toLocaleString()} QAR\nTenure: ${tenure} months\nTotal: ${total.toLocaleString()} QAR\nMonthly: ${emi.toFixed(2)} QAR\n\nNeed features or documents?`;
  }
}


    setMessages(p => [...p, userMessage, { role: "bot", content: botResponse, time }]);
    
    setEmiStep(nextStep);


    setInput("");
    return;
  }

  // ——— 3. NORMAL FLOW (no emiStep) ———
  if (lowerText.includes("emi") || lowerText.includes("calculation") || lowerText.includes("قسط") || lowerText.includes("حساب")) {
    setEmiStep("category");
    setEmiData({ category: "", nationality: "", product: "", amount: 0, tenureMonths: 0 });
    const resp = language === "ar" ? "هل الطلب كـ **فرد** أم **شركة**؟" : "Are you applying as **Retail** or **Corporate**?";
    setMessages(p => [...p, userMessage, { role: "bot", content: resp, time }]);
    setInput("");
    return;
  }

  const kb = matchKnowledgeBase(userText);
  const botResp = kb || t.fallback;
  setMessages(p => [...p, userMessage, { role: "bot", content: botResp, time }]);
  setInput("");
};



  return (
    <div className={`app-container ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="chat-box">
        {/* HEADER */}
        <div className="chat-header">
          <div className="header-top">
            <div className="header-left">
              <div className="avatar">
                <img src="https://r6.cloud.yellow.ai/minio/uploads/c0c7f15b-0186-4735-9e78-b13885813d6c.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=r6ymblob%2F20251202%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251202T112841Z&X-Amz-Expires=60&X-Amz-SignedHeaders=host&X-Amz-Signature=17d7500d5ce7a01401adc1d4940c5058219154809d27249c35655b81147c0ba8" alt="F" className="avatar-img" />
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