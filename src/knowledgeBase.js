// src/knowledgeBase.js
export const knowledgeBase = [
  {
    category: "app_guide",
    triggers: ["mobile app", "app", "how to use app", "download app", "application process"],
    response: `
You can apply for finance through:
1. Mobile app: 
iOS: apps.apple.com/qa/app/ffc-online/id1581399823
Android: play.google.com/store/apps/details?id=com.its.mobilebanking.ffc&hl=en&pli=1
2. FFC website: ffcqatar.com
3. Visiting the nearest branch.
All services are Shari'a-compliant.
`
  },
  {
    category: "required_docs",
    triggers: ["required documents", "docs", "req docs"],
    response: `
For finance applications:
1. Recent salary certificate
2. Original ID and passport
3. Bank statement for last 3 months
4. Alternative payment cheques
5. National address certificate
6. Price offer to First Finance Company
Customer’s sponsorship/residence must match employer issuing salary.
All services are Shari'a-compliant.
`
  },
  {
    category: "faq",
    triggers: ["loan rates", "account opening", "investment advice", "funding options", "interest rates", "late payment", "repayment plan", "loan tenure", "fees", "promotions"],
    response: "Here’s the answer to your query: [Provide FAQ details]."
  },
  {
    category: "company_info",
    triggers: ["about", "vision", "mission", "shariah board", "islamic contracts", "working hours"],
    response: `
First Finance provides Shariah-compliant financial solutions.
Vision: ...
Mission: ...
Shariah Board: ...
Working hours: Sunday to Thursday, 8:00 AM – 4:00 PM
`
  },
  {
    category: "contact_privacy",
    triggers: ["contact", "phone", "email", "privacy", "disclaimer"],
    response: "Contact: +974 XXXX XXXX, support@firstfinance.qa. Review privacy policy and disclaimer at our website."
  }
];
