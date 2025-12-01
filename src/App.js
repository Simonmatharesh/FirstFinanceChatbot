import { useState, useRef, useEffect } from "react";
import "./App.css";
import { knowledgeBase } from "./knowledgeBase";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [emiStep, setEmiStep] = useState(null);
  const [emiData, setEmiData] = useState({
    category: "", nationality: "", product: "", amount: 0, tenure: 0
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const calculateEMI = (principal, tenureMonths, interestRate = 0.05) => {
    const monthlyRate = interestRate / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return emi.toFixed(2);
  };

  const handleEMIFlow = (userInput) => {
    let content = "";
    switch (emiStep) {
      case "category":
        setEmiData(prev => ({ ...prev, category: userInput }));
        setEmiStep("nationality");
        content = 'Are you a Qatari National or an Expat?';
        break;
      case "nationality":
        setEmiData(prev => ({ ...prev, nationality: userInput }));
        setEmiStep("product");
        content = 'Please select a finance product: Vehicle, Personal, Services, Housing.';
        break;
      case "product":
        setEmiData(prev => ({ ...prev, product: userInput }));
        setEmiStep("amount");
        content = `What is the required finance amount for the ${userInput}?`;
        break;
      case "amount":
        setEmiData(prev => ({ ...prev, amount: parseFloat(userInput) }));
        setEmiStep("tenure");
        content = `What is the finance duration you prefer (in months)?`;
        break;
      case "tenure":
        const tenureMonths = parseInt(userInput);
        const principal = emiData.amount;
        const emi = calculateEMI(principal, tenureMonths);
        content = `
Preliminary Finance Details for ${emiData.product} finance of ${principal} QAR as ${emiData.nationality} over ${tenureMonths} months:
Total Payable: ${(emi * tenureMonths).toFixed(2)} QAR
Down Payment: 0 QAR
Monthly Amount: ${emi} QAR
First Installment Date: 01-Jan-2026
Last Installment Date: ${tenureMonths > 0 ? '01-' + (tenureMonths < 12 ? tenureMonths.toString().padStart(2,'0') : '12') + '-2026' : '01-Dec-2026'}
*Preliminary calculation only, terms apply.
        `;
        setEmiStep(null);
        setEmiData({ category: "", nationality: "", product: "", amount: 0, tenure: 0 });
        break;
    }
    return content;
  };

  const matchKnowledgeBase = (inputText) => {
    const lowerInput = inputText.toLowerCase();
    for (let kb of knowledgeBase) {
      if (kb.triggers.some(trigger => lowerInput.includes(trigger.toLowerCase()))) return kb.response;
    }
    return null;
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true});
    const userMessage = { role: "user", content: input, time: timeString };

    let botContent = "";
    if (emiStep) botContent = handleEMIFlow(input);
    else if (input.toLowerCase().includes("emi") || input.toLowerCase().includes("finance calculation")) {
      setEmiStep("category");
      botContent = 'Could you please specify whether you are interested in "Retail" or "Corporate" finance?';
    } else botContent = matchKnowledgeBase(input) || "I can assist with preliminary finance calculations or company info. Please provide details.";

    const botMessage = { role: "bot", content: botContent, time: timeString };
    setMessages(prev => [...prev, userMessage, botMessage]);
    setInput("");
  };

  const handleKeyDown = (e) => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); } };

  return (
    <div className="app-container">
      <div className="chat-box">
        <div className="chat-header">
          <div className="header-top">
            <div className="avatar">F</div>
            <div className="header-title">
              <h1>First Finance</h1>
              <div className="header-status">How can we help you today?</div>
            </div>
          </div>
        </div>

        <div className="messages">
          {messages.length===0&&<div className="empty-state">Ask anything about loans, investments, or budgeting</div>}
          {messages.map((msg,i)=>(
            <div key={i} className={`message ${msg.role} animate-in`} style={{animationDelay:`${i*0.1}s`}}>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">{msg.time}</div>
            </div>
          ))}
          <div ref={messagesEndRef}/>
        </div>

        <div className="input-area">
          <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your message..." />
          <button className="send-button" onClick={sendMessage} disabled={!input.trim()} aria-label="Send">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="white"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
