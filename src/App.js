// App.js  
import { useState, useEffect, useRef } from "react";
import "./App.css";


/* ----------  CONFIG  ---------- */



const text = {
  en: {
    greeting: "Hi, Welcome to First Finance.\n I am Hadi your virtual assistant.",
    welcome: "Shariah-compliant financing.",
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

  const [isLoading, setIsLoading] = useState(false);
  const [showFeedbackSurvey, setShowFeedbackSurvey] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [hasShownSurvey, setHasShownSurvey] = useState(false);

  
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

  if (lastBotMessage && typeof lastBotMessage.scrollIntoView === 'function') {
    lastBotMessage.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    
    window.scrollBy(0, -20); 
  }
}, [messages]);




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



setIsLoading(true);  // ← START LOADING

try {
  const geminiResponse = await askGemini(userText);
  
  setIsLoading(false);  // ← STOP LOADING (got response)
  
  if (geminiResponse && geminiResponse.length > 10) {
    return push('bot', geminiResponse);
  }
} catch (err) {
  console.error("Gemini failed:", err);
  setIsLoading(false);  // ← STOP LOADING (on error)
}

setIsLoading(false);  // ← STOP LOADING (fallback)
return push('bot', t.fallback);
};



const [userId] = useState(() => {
  let id = localStorage.getItem('chatUserId');
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatUserId', id);
  }
  return id;
});


const handleCloseChatClick = () => {
  // Check if user had meaningful conversation (3+ messages)
  const userMessages = messages.filter(m => m.role === 'user');
  
  console.log('Close clicked. User messages:', userMessages.length, 'Has shown survey:', hasShownSurvey);
  
  if (userMessages.length >= 1 && !hasShownSurvey) {
    // Show survey FIRST, then mark as shown
    setShowFeedbackSurvey(true);
    setHasShownSurvey(true);
    console.log('Showing feedback survey');
  } else {
    // Just minimize/close
    setChatMinimized(true);
    console.log('Minimizing chat');
  }
};

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
 <div
  className={`app-container ${language === "ar" ? "rtl" : ""}`}
  dir={language === "ar" ? "rtl" : "ltr"}
>

    
    {chatMinimized ? (
      <button
        onClick={() => setChatMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00b368, #00925e)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(0, 179, 104, 0.4)',
          zIndex: 1000
        }}
      >
      
      </button>
    ) : (
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
    
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button className="lang-toggle" onClick={() => setLanguage((l) => (l === "en" ? "ar" : "en"))}>
        {language === "en" ? "العربية" : "English"}
      </button>
      
      <button
        onClick={handleCloseChatClick}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'white',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          fontWeight: 'bold'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
      >
        ×
      </button>
    </div>
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
          
          {/* ⭐ NEW: Loading indicator - ONLY shows when isLoading is true */}
          {isLoading && (
            <div className="message bot animate-in">
              <div className="typing-indicator">
                <div className="dot-elastic"></div>
              </div>
            </div>
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
)}


    {showFeedbackSurvey && (
      <FeedbackSurvey
        language={language}
        onClose={() => {
          setShowFeedbackSurvey(false);
          setChatMinimized(true);
        }}
      />
    )}
  </div>
);
}

function FeedbackSurvey({ language, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({
    satisfaction: null,
    knowledge: null,
    helpfulness: null,
    resolved: null,
    suggestions: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const questions = {
    1: {
      en: "How satisfied were you with Hadi's overall assistance?",
      ar: "ما مدى رضاك عن المساعدة الشاملة التي قدمها هادي؟",
      key: 'satisfaction',
      scale: [
        { value: 5, labelEn: 'Very Satisfied', labelAr: 'راضٍ جداً', color: '#00b368' },
        { value: 4, labelEn: 'Satisfied', labelAr: 'راضٍ', color: '#4ade80' },
        { value: 3, labelEn: 'Neutral', labelAr: 'محايد', color: '#fbbf24' },
        { value: 2, labelEn: 'Dissatisfied', labelAr: 'غير راضٍ', color: '#fb923c' },
        { value: 1, labelEn: 'Very Dissatisfied', labelAr: 'غير راضٍ إطلاقاً', color: '#ef4444' }
      ]
    },
    2: {
      en: "How satisfied were you with Hadi's knowledge of First Finance products?",
      ar: "ما مدى رضاك عن معرفة هادي بمنتجات فرست فاينانس؟",
      key: 'knowledge',
      scale: [
        { value: 5, labelEn: 'Very Satisfied', labelAr: 'راضٍ جداً', color: '#00b368' },
        { value: 4, labelEn: 'Satisfied', labelAr: 'راضٍ', color: '#4ade80' },
        { value: 3, labelEn: 'Neutral', labelAr: 'محايد', color: '#fbbf24' },
        { value: 2, labelEn: 'Dissatisfied', labelAr: 'غير راضٍ', color: '#fb923c' },
        { value: 1, labelEn: 'Very Dissatisfied', labelAr: 'غير راضٍ إطلاقاً', color: '#ef4444' }
      ]
    },
    3: {
      en: "How satisfied were you with Hadi's helpfulness and friendliness?",
      ar: "ما مدى رضاك عن مدى المساعدة والود؟",
      key: 'helpfulness',
      scale: [
        { value: 5, labelEn: 'Very Satisfied', labelAr: 'راضٍ جداً', color: '#00b368' },
        { value: 4, labelEn: 'Satisfied', labelAr: 'راضٍ', color: '#4ade80' },
        { value: 3, labelEn: 'Neutral', labelAr: 'محايد', color: '#fbbf24' },
        { value: 2, labelEn: 'Dissatisfied', labelAr: 'غير راضٍ', color: '#fb923c' },
        { value: 1, labelEn: 'Very Dissatisfied', labelAr: 'غير راضٍ إطلاقاً', color: '#ef4444' }
      ]
    },
    4: {
      en: "Was your question or issue resolved?",
      ar: "هل تم حل سؤالك أو مشكلتك؟",
      key: 'resolved',
      scale: [
        { value: 'yes', labelEn: 'Yes', labelAr: 'نعم', color: '#00b368' },
        { value: 'no', labelEn: 'No', labelAr: 'لا', color: '#ef4444' }
      ]
    }
  };

  const totalSteps = Object.keys(questions).length + 1;

  const handleAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setTimeout(() => {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }, 300);
  };

  const handleSubmit = () => {
    console.log('Feedback submitted:', answers);
    setSubmitted(true);
    setTimeout(() => onClose(), 2000);
  };

  const canSubmit = answers.satisfaction && answers.knowledge && answers.helpfulness && answers.resolved;

  if (submitted) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 99999, padding: '20px', animation: 'fadeIn 0.3s ease'
      }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '50px 40px',
          maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center', animation: 'slideUp 0.4s ease'
        }}>
          <div style={{ 
            width: '80px', height: '80px', margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #00b368, #00925e)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', animation: 'scaleIn 0.5s ease'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
            {language === 'ar' ? 'شكراً لك!' : 'Thank You!'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.5' }}>
            {language === 'ar' ? 'تم استلام ملاحظاتك' : 'Your feedback has been received'}
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const isSuggestionStep = currentStep === totalSteps;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 99999, padding: '20px', animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '36px',
        maxWidth: '540px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative', animation: 'slideUp 0.4s ease'
      }}>
        {/* Progress Bar */}
        <div style={{
          width: '100%', height: '4px', background: '#e5e7eb',
          borderRadius: '10px', marginBottom: '28px', overflow: 'hidden'
        }}>
          <div style={{
            width: `${(currentStep / totalSteps) * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #00b368, #00925e)',
            borderRadius: '10px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        {/* Step Counter */}
        <div style={{
          fontSize: '13px', fontWeight: '600', color: '#00925e',
          marginBottom: '20px', letterSpacing: '0.3px'
        }}>
          {language === 'ar' ? `السؤال ${currentStep} من ${totalSteps}` : `Question ${currentStep} of ${totalSteps}`}
        </div>

        {!isSuggestionStep ? (
          <>
            {/* Question */}
            <h2 style={{
              fontSize: '19px', fontWeight: '600', color: '#1e293b',
              marginBottom: '28px', lineHeight: '1.5', minHeight: '54px'
            }}>
              {language === 'ar' ? currentQuestion.ar : currentQuestion.en}
            </h2>

            {/* Rating Scale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {currentQuestion.scale.map((option) => {
                const isSelected = answers[currentQuestion.key] === option.value;
                const displayValue = typeof option.value === 'number' ? option.value : '';
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(currentQuestion.key, option.value)}
                    style={{
                      padding: '14px 18px',
                      background: isSelected ? option.color : 'white',
                      border: `2px solid ${isSelected ? option.color : '#e5e7eb'}`,
                      borderRadius: '12px', cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected ? `0 8px 20px ${option.color}30` : '0 2px 8px rgba(0,0,0,0.04)',
                      display: 'flex', alignItems: 'center', gap: '14px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = option.color;
                        e.currentTarget.style.transform = 'scale(1.01)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${option.color}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      }
                    }}
                  >
                    {displayValue && (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : option.color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '700',
                        color: isSelected ? 'white' : option.color, flexShrink: 0
                      }}>
                        {displayValue}
                      </div>
                    )}
                    <div style={{
                      fontSize: '15px', fontWeight: '600',
                      color: isSelected ? 'white' : '#334155',
                      textAlign: 'left', flex: 1
                    }}>
                      {language === 'ar' ? option.labelAr : option.labelEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Suggestions Step */}
            <h2 style={{
              fontSize: '19px', fontWeight: '600', color: '#1e293b',
              marginBottom: '12px', lineHeight: '1.5'
            }}>
              {language === 'ar' ? 'ما هي اقتراحاتك لتحسين مستوى الخدمة؟' : 'What are your suggestions to improve our service?'}
            </h2>

            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '18px' }}>
              {language === 'ar' ? '(اختياري)' : '(Optional)'}
            </p>

            <textarea
              value={answers.suggestions}
              onChange={(e) => setAnswers(prev => ({ ...prev, suggestions: e.target.value }))}
              placeholder={language === 'ar' ? 'شاركنا أفكارك...' : 'Share your thoughts...'}
              style={{
                width: '100%', minHeight: '110px', padding: '14px 16px',
                border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '14px',
                fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none',
                transition: 'all 0.25s ease', marginBottom: '24px', lineHeight: '1.5'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00b368';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 179, 104, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />

            <button 
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '14px',
                background: canSubmit ? 'linear-gradient(135deg, #00b368, #00925e)' : '#e5e7eb',
                border: 'none', borderRadius: '12px', color: 'white',
                fontWeight: '600', fontSize: '15px',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.25s ease',
                boxShadow: canSubmit ? '0 4px 12px rgba(0, 179, 104, 0.25)' : 'none',
                opacity: canSubmit ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (canSubmit) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(0, 179, 104, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (canSubmit) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 179, 104, 0.25)';
                }
              }}
            >
              {language === 'ar' ? 'إرسال التقييم' : 'Submit Feedback'}
            </button>
          </>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                padding: '10px 18px', background: 'white',
                border: '2px solid #e5e7eb', borderRadius: '10px',
                color: '#64748b', fontWeight: '600', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.background = 'white';
              }}
            >
              {language === 'ar' ? '→ السابق' : '← Back'}
            </button>
          ) : <div />}

          <button onClick={onClose} style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            color: '#94a3b8', fontWeight: '600', fontSize: '14px',
            cursor: 'pointer', transition: 'color 0.25s ease'
          }}
          onMouseEnter={(e) => e.target.style.color = '#64748b'}
          onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>
            {language === 'ar' ? 'تخطي الاستبيان' : 'Skip Survey'}
          </button>
        </div>
      </div>
    </div>
  );
}