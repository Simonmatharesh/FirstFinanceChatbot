// App.js  
import { useState, useEffect, useRef } from "react";
import "./App.css";


/* ----------  CONFIG  ---------- */
const fuseOptions = { keys: ["triggers", "response"], threshold: 0.65, includeScore: true };


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



/* ----------  EMI CORE  ---------- */
const getPayableRate = (months) => 0.047 - (12 - months) * 0.00392;
const calculateEMI = (principal, months) => {
  const totalPayable = principal * (1 + getPayableRate(months));
  return { emi: Math.round((totalPayable / months) * 100) / 100, total: Math.round(totalPayable) };
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

 **Main Branch (C-Ring Road):**
- Sunday – Wednesday: **7:30 AM – 7:00 PM**
- Thursday: **7:30 AM – 2:30 PM**
- Saturday: **8:00 AM – 1:00 PM**
- Friday: **Closed**

 **Mawater Branch:**
- Sunday – Thursday: **4:30 PM – 9:30 PM**
- Saturday: **4:30 PM – 7:00 PM**
- Friday: **Closed**

 **Mobile App & Website:**
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

  // ========== PRIORITY 0: EMI FLOW ==========
  if (context.activeFlow === "EMI") {
    return handleEMIFlow(userText, time);
  }

  if (/calculate.*emi|emi.*calculation|new.*emi/i.test(lower) && !context.activeFlow) {
    updateContext({ activeFlow: "EMI", flowStep: "category", emiData: {} });
    return push('bot', "Please specify whether you want **Retail** or **Corporate** finance.");
  }

  // ========== PRIORITY 1: EXTRACT CONTEXT FIRST ==========



// ========== PRIORITY 1.6: ELIGIBILITY QUESTIONS (GEMINI-POWERED) ==========
  


  // ========== PRIORITY 4: SEMANTIC SEARCH WITH CONTEXT ==========

  // ========== PRIORITY 5: GEMINI ==========
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

// ========== FIXED FOLLOW-UP HANDLER ==========


// ==================== INTENT CLASSIFIER ====================





const [userId] = useState(() => {
  let id = localStorage.getItem('chatUserId');
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatUserId', id);
  }
  return id;
});


// ==================== SMART GEMINI QUERY ====================
async function askGemini(userText) {
  try {
    // Get conversation context
  
    
    // Send context to server
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userText,
        
        userId: userId  
      })
    });
    
    const data = await res.json();
    return data.interpretation;
  } catch (err) {
    console.error("Gemini query failed:", err);
    return null;
  }
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