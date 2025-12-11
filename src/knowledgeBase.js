// src/knowledgeBase.js

export const knowledgeBase = [
  // =========================
  // Greetings / small talk
  // =========================
 // =========================
// First Finance Chatbot Knowledge Base
// =========================
  // =========================
  // 1. Greetings
  // =========================
  {
    category: "greetings",
    triggers: ["hi", "hello", "hey", "مرحبا", "اهلا"],
    response: "Hello! I'm Hadi, your virtual assistant at First Finance Qatar. How can I help you today?"
  },

  // =========================
  // 2. Company Info
  // =========================
  {
    category: "company_info",
    triggers: ["about", "who are you", "first finance", "من أنتم", "عن الشركة"],
    response: `
**First Finance Company**  
Established in November 1999, First Finance Company was the first finance company in Qatar to be regulated by the Qatar Central Bank. The company started with QAR 50 million share capital, which rose to QAR 639 million by 2009.  

In 2010, Dukhan Bank acquired 100% of the company’s shares.  

**Mission:**  
- Become the most recommended finance company in Qatar.  
- Build long-term partnerships with clients.  
- Attract top talent and maintain an engaging work environment.  
- Grow profitable and sustainable businesses.  
- Contribute to community development and economic prosperity.  

**Vision:** To be a leading finance company recognized for progressive spirit, excellent service, outstanding results, and community contribution.  

**Quality Policy:** ISO 9001:2015 standards, Shariah-compliant services.  

**Board & Management:** Available upon request.  

All services are **100% Shariah-compliant**.
`
  },

  // =========================
  // 3. Contact Information
  // =========================
  {
    category: "contact",
    triggers: ["contact", "phone", "call", "location", "اتصال", "رقم"],
    response: `
**Get in Touch**  
- **Call:** +974 4455 9999  
- **Email:** info@ffcqatar.com  
- **Website:** https://ffcqatar.com  

**Branches:**  
- Main Branch: C-Ring Road, Building 321 – next to Turkish Hospital  
- Mawater Branch: Umm Ghuwailina  

**Live Chat & App:** Available 24/7
`
  },

  // =========================
  // 4. App Guide
  // =========================
  {
    category: "app_guide",
    triggers: ["mobile app", "app", "how to use app", "download app", "application process", "apply online", "تطبيق", "تحميل"],
    response: `
**Apply in 3 Easy Ways**  

**Mobile App (Recommended)**  
- iOS: https://apps.apple.com/qa/app/ffc-online/id1581399823  
- Android: https://play.google.com/store/apps/details?id=com.its.mobilebanking.ffc  

**Website:** Apply online 24/7 at https://ffcqatar.com  

**Visit a Branch:**  
- Main Branch: C Ring Road  
- Mawater Branch: Umm Ghuwailina  

All applications are 100% Shariah-compliant.
`
  },

  // =========================
  // 5. Vehicle Finance (Dynamic)
  // =========================
  {
    category: "vehicle_finance",
    triggers: ["car loan", "vehicle loan", "vehicle finance", "personal car finance", "new car", "used car", "motorcycle", "marine", "تمويل مركبات"],
    response: ({ nationality, salary, jobDurationMonths, age }) => {
      let maxFinance, maxTenure, dbRatio, needsGuarantor;

      if (nationality === "Qatari") {
        maxFinance = 2000000;
        maxTenure = 72;
        dbRatio = 0.75;
        needsGuarantor = jobDurationMonths < 3;
      } else {
        maxFinance = 400000;
        maxTenure = 48;
        dbRatio = 0.5;
        needsGuarantor = true;
      }

      const debtLimit = salary * 12 * dbRatio;
      const guarantorText = needsGuarantor ? "A guarantor is required." : "No guarantor required.";

      return `
**Vehicle Finance Details (${nationality})**  

- Max financing limit: ${maxFinance.toLocaleString()} QAR  
- Repayment period: Up to ${maxTenure} months + 3 months grace  
- Debt-to-salary ratio: ≤ ${dbRatio * 100}%  
- Minimum salary: ${nationality === "Qatari" ? "None" : "5,000 QAR"}  
- Age: 18 – ${nationality === "Qatari" ? 65 : 60}  
- ${guarantorText}

**Required Documents:**  
- Recent salary certificate  
- Original ID + passport  
- Bank statement (last 3 months)  
- Alternative payment cheques  
- National address certificate  
- Price offer directed to First Finance Company  
- Vehicle inspection report (for used vehicles)

All services are fully **Shariah-compliant**.
`;
    }
  },

  // =========================
  // 6. EMI Calculator
  // =========================
  {
    category: "vehicle_emi",
    triggers: ["emi calculation", "vehicle emi", "calculate emi", "حاسبة القسط"],
    response: ({ amount, tenure, firstInstallmentDate }) => {
      const monthlyEMI = amount / tenure;
      const totalPayable = monthlyEMI * tenure;
      const lastInstallmentDate = new Date(new Date(firstInstallmentDate).setMonth(new Date(firstInstallmentDate).getMonth() + tenure - 1)).toLocaleDateString();

      return `
**Preliminary Finance Details**  

- Total Payable Amount: ${totalPayable.toFixed(2)} QAR  
- Down Payment Amount: 0 QAR  
- Monthly Preliminary Amount: ${monthlyEMI.toFixed(2)} QAR  
- First Installment Date: ${new Date(firstInstallmentDate).toLocaleDateString()}  
- Last Installment Date: ${lastInstallmentDate}  

**This is a preliminary calculation only, terms and conditions apply.**
`;
    }
  },

  // =========================
  // 7. Personal Finance
  // =========================
  {
    category: "personal_finance",
    triggers: ["personal finance", "personal loan", "retail loan", "تمويل شخصي"],
    response: ({ nationality, salary }) => {
      const maxFinance = nationality === "Qatari" ? 2000000 : 200000;
      const dbRatio = nationality === "Qatari" ? 0.75 : 0.5;
      const needsGuarantor = nationality !== "Qatari";
      return `
**Personal Finance (${nationality})**  

- Maximum financing limit: ${maxFinance.toLocaleString()} QAR  
- Debt-to-salary ratio: ≤ ${dbRatio * 100}%  
- ${needsGuarantor ? "A Qatari guarantor is required." : "No guarantor required."}

**Required Documents:**  
- Recent salary certificate  
- ID + Passport  
- Bank statement (3 months)  
- Security cheques  
- National address proof
`;
    }
  },

  // =========================
  // 8. Housing / Real Estate Finance
  // =========================
  {
    category: "real_estate_finance",
    triggers: ["real estate", "housing", "home finance", "property", "lusail", "pearl", "west bay", "سكن", "عقار", "لوسيل"],
    response: `
**Housing Finance**  

**Key Features:**  
- Tenure: Up to 15 years  
- Down payment: 30%  
- Grace period: Available  
- No admin fees  
- Freehold areas only (The Pearl, Lusail, West Bay)  

**Contract Type:**  
- Ijara  
- Murabaha  

**Required Documents:**  
- Property title deed  
- 2 valuation reports (QCB-approved)  
- 6-month bank statement
`
  },

  // =========================
  // 9. Travel Finance
  // =========================
  {
    category: "travel_finance",
    triggers: ["travel finance", "travel loan", "holiday", "vacation", "umrah", "سفر", "حج", "عمرة"],
    response: `
**Travel & Umrah Finance**  

**Eligibility:**  
- Minimum salary: 10,000 QAR  
- Maximum finance: 50,000 QAR  
- Tenure: Up to 24 months  
- Grace period: Up to 1 month  
- Down payment: 10%  

**Required Documents:**  
- Flight/hotel/package quotation  
- Salary certificate + bank statement  
- Security cheques  

**Shariah Contract:** Murabaha
`
  },

  // =========================
  // 10. Marine Finance
  // =========================
  {
    category: "marine_finance",
    triggers: ["marine", "boat", "yacht", "jet ski", "مارين", "يخت", "جت سكي"],
    response: `
**Marine Finance**  

**For Qatari Nationals:**  
- Up to 2,000,000 QAR  
- Up to 72 months + 3 months grace  
- No down payment  
- No collateral required  

**For Expats/Residents:**  
- Up to 400,000 QAR  
- Up to 48 months + 3 months grace  
- No down payment  
- Marine craft as collateral  

**Takaful insurance included**  
100% Shariah-compliant
`
  },

  // =========================
  // 11. Shariah / Islamic Contracts
  // =========================
  {
    category: "islamic_contracts",
    triggers: ["shariah", "islamic", "murabaha", "ijara", "contract", "عقود", "مرابحة", "إجارة"],
    response: `
**Shariah-Compliant Contracts**  

- **Murabaha** → Cost-plus sale (vehicles, goods, travel)  
- **Ijara** → Leasing with ownership (housing)  
- **Istisna** → Manufacturing finance (construction)  
- **Mudaraba & Musharaka** → Profit-sharing (corporate)  

**Approved by Shariah Board:** No interest (Riba), no uncertainty (Gharar), no gambling (Maysir)
`
  },

  // =========================
  // 12. Working Hours
  // =========================
  {
    category: "working_hours",
    triggers: ["working hours", "open", "branch hours", "work hours", "hours", "مواعيد", "دوام"],
    response: `
**Branch Working Hours**  

**Main Branch (C Ring Road):**  
Sun – Wed: 7:30 AM – 7:00 PM  
Thursday: 7:30 AM – 2:30 PM  
Saturday: 8:00 AM – 1:00 PM  
Friday: Closed  

**Mawater Branch:**  
Sun – Thu: 4:30 PM – 9:30 PM  
Saturday: 4:30 PM – 7:00 PM  
Friday: Closed  

**App & Website:** 24/7
`
  },

  // =========================
  // 13. Company Accreditation
  // =========================
 // =========================
// 1. Company Accreditation
// =========================
{
  category: "company_accreditation",
  triggers: [
    "company accreditation",
    "accreditation",
    "non-accredited company",
    "car loans below 150000",
    "personal loan",
    "car loan",
    "accreditation documents",
    "accreditation requirements"
  ],
  response: `
**Company Accreditation (Individual Financing)**

**Levels of Accreditation:**
1. **Governmental & Semi-Gov / Listed on QSE** → Automatically accredited.
2. **Non-accredited (Personal/Car Loans > 150,000 QAR)** → Required: Accreditation form, national address certificate, last 2 audited financial statements, commercial registration/license, owner(s) ID.
3. **Non-accredited (Car Loans < 150,000 QAR)** → Required: CR/license/ID, company ≥ 3 years established.

**Resident Eligibility:**
- Employment ≥ 1 year
- No returned cheques in last 6 months
- Maximum financing 150,000 QAR
- Financing only from authorized agencies/distributors
`
},

// =========================
// 2. After-Sales Services
// =========================
{
  category: "after_sales_services",
  triggers: [
    "after sales",
    "services",
    "collections",
    "liability certificate",
    "vehicle lien release",
    "bank payment order",
    "replace cheque",
    "vehicle export",
    "property mortgage"
  ],
  response: `
**After-Sales Services**

Services provided by the Collections Department include:
- Liability / Replacement Certificates
- Vehicle Lien Release
- Traffic Department letters
- Legal referrals
- Deregistration / title transfer
- Payment changes
- Cheque replacements
- Property mortgage release
- Vehicle export
- Other related services
`
},

// =========================
// 3. Shariah-Compliant Transactions
// =========================
{
  category: "shariah_transactions",
  triggers: [
    "shariah transaction",
    "musawamah",
    "murabaha",
    "ijarah",
    "bay al manfaah",
    "islamic contracts"
  ],
  response: `
**Shariah-Compliant Transactions**

- **Musawamah**: Company buys an asset and sells to customer at agreed price.
- **Murabaha**: Company sells goods at cost + disclosed profit.
- **Ijarah**: Leasing of tangible assets (e.g., housing, vehicles).
- **Bay al-Manfaah**: Selling right to use/benefit from a service.

**All transactions supervised by Shariah Board.**
`
},

// =========================
// 4. Company Full Info
// =========================
{
  category: "company_full_info",
  triggers: [
    "about company",
    "first finance",
    "history",
    "board",
    "management",
    "vision",
    "mission",
    "quality policy",
    "address"
  ],
  response: `
**About First Finance Company**

- Established: November 1999
- First finance company in Qatar regulated by Qatar Central Bank
- Share capital: QAR 50M → QAR 639M by 2009
- Acquired by Dukhan Bank in 2010

**Board of Directors**
- Sheikh Mohammed Al-Thani – Chairman
- Mr. Ahmed Ishaq Hashem – Vice Chairman
- Mr. Abdulrahman Khalifa Al-Ghanim – Member
- Mr. Osama Abubaker – Member
- Mr. Talal A Al-Khaja – Member

**Executive Management**
- CEO: Eslah Assem
- Head of HR: Hamad Al-Muhannadi
- Head of Finance: Amer Taha
- Head of Risk: Basil Al-Sughayer
- Head of Compliance: Amro Tantawi
- Head of IT: Bassem Itani
- Head of Legal: Awad Al-Sanousy
- Head of Operations: Annas Miqdad
- Head of Business Development: Hussam Barakat
- Head of Collections: Mutaz Al-Masloukhi
- Senior Manager Internal Audit: Ahmed Hajaj

**Shariah Supervisory & Fatwa Board**
- Chairman: Shaikh Dr. Waleed Mohammed Hadi
- Members: Shaikh Dr. Esam Khalaf Al-Enezi, Shaikh Dr. Osama Qais Al-Dereai

**Vision**: Leading global finance company with excellence in service & community impact  
**Mission**: Ethical, innovative, accessible finance; long-term client & shareholder value; community contribution; embrace technology & progressive ideas  

**Quality Policy**
- Fulfill commitments efficiently & effectively
- Enhance customer satisfaction
- Set measurable objectives
- Allocate resources for smooth operation
- Train competent employees
- Continual QMS improvement

**Address**
C-Ring Road, Zone 40, Building 321, next to Turkish Hospital, Doha, Qatar  
Tel: +974 44559999 | Fax: +974 44559955 | Email: info@ffcqatar.com
`
}
,

// Retail Finance - Services Finance for Qatari Citizens
{
  category: "services_finance_qatari",
  triggers: ["services finance qatar", "healthcare finance qatar", "education finance qatar", "wedding finance qatar", "travel finance qatar", "تمويل خدمات قطري"],
  response: `
**Services Finance (Qatari Citizens – Salary-Based)**

**Main Features**  
1. Repayment period up to 72 months, including grace period up to 3 months  
2. Grace period up to 3 months  
3. No administrative fees  
4. Max debt-to-salary ratio ≤ 75% of total basic salary + social allowance  
5. Max finance: 2,000,000 QAR (including profit)  
6. Takaful insurance included  
7. Additional income sources allow extra financing & longer repayment (Qatari citizens only)  
8. Age: 18–65 years  
9. Qatari trainee requires guarantor or min 3-month training contract  

**Required Documents**  
1. Recent salary certificate  
2. Original personal ID  
3. Bank statement (last 3 months, stamped)  
4. Alternative payment cheques  
5. National address certificate
`
},

// Retail Finance - Housing/Real Estate Finance for Qatari Citizens
{
  category: "housing_finance_qatari",
  triggers: ["housing finance qatar", "real estate finance qatar", "apartment finance qatar", "villa finance qatar", "تمويل عقاري قطري", "تمويل سكني قطري"],
  response: `
**Housing/Real Estate Finance (Qatari Citizens)**

**Main Features**  
1. Repayment period up to 15 years (180 months)  
2. Grace period at beginning based on credit approval  
3. No administrative fees  
4. Down payment ≥ 30%  
5. Mortgage on financed property  
6. Age: 18–75 years  
7. Qatari trainee requires guarantor or min 3-month training contract  

**Required Documents**  
1. Recent salary certificate  
2. Original personal ID  
3. Bank statement (last 6 months, stamped)  
4. Alternative payment cheques  
5. National address certificate  
6. Copy of property ownership deed with plan  
7. Property appraisal from two certified appraisal offices
`
},
// General Intro - Corporate Finance
{
  category: "corporate_finance_general",
  triggers: ["corporate finance intro", "about corporate finance", "تمويل الشركات", "company finance overview"],
  response: `
**About Corporate Finance**  
First Finance provides innovative Sharia-compliant solutions for both Qatari and non-Qatari companies to secure liquidity for projects, working capital, and operating expenses.  

**Corporate Finance Products**  
1. Commodities Finance  
2. Goods Finance  
3. Vehicle & Equipment / Fleet Financing (Wholesale)  
4. Corporate Revolving Credit Product (Revolving Credit Limit)  

**Qatari Company Definition:**  
Local company owned >50% by Qatari nationals.  

**Foreign (Non-Qatari) Company Definition:**  
1. Locally incorporated companies 100% foreign owned.  
2. Companies with >50% non-Qatari ownership.  

**Important Notes for Non-Qatari Companies:**  
- No difference in features, benefits, profit rates, or repayment tenor compared to Qatari companies.  
- Mandatory real estate or cash collateral covering ≥80% of indebtedness, or a creditworthy Qatari guarantor (individual or company).`
},

// Corporate Finance - Commodities Finance (Non-Qatari & Qatari)
{
  category: "corporate_commodities_finance",
  triggers: ["commodities finance", "تمويل سلع", "metal finance", "Qatar commodities finance"],
  response: `
**Commodities Finance (Corporate Finance)**

**Main Features:**  
1. Longest repayment period suiting activity/financing  
2. Grace period at beginning of financing (subject to credit approval)  
3. No administrative fees  
4. Financing tailored to scale of activity & request  
5. Takaful Insurance  

**Required Documents:**  
1. Last 3 audited financial statements or internal company financials  
2. Recent valid commercial registration + trade license + establishment registration (at least 1–3 months prior expiry)  
3. Bank statement for last 6 months, stamped & signed  
4. Original ID cards of partners  
5. Original passports of resident partners  
6. Copies of operating contracts, invoices, supply orders  
7. Real estate or cash collateral covering 80% of indebtedness, or a Qatari guarantor  
8. Any additional documents required by FFC`
},

// Corporate Finance - Goods Finance (Non-Qatari & Qatari)
{
  category: "corporate_goods_finance",
  triggers: ["goods finance", "تمويل بضائع", "company goods finance", "import finance"],
  response: `
**Goods Finance (Corporate Finance)**

**Main Features:**  
1. Repayment up to 36 months including grace period  
2. Ability to purchase goods domestically & internationally  
3. Grace period at start based on credit approval  
4. Financing tailored to scale of activity & request  
5. No administrative fees  
6. Takaful Insurance  

**Required Documents:**  
1. Last 3 audited financial statements or internal company financials  
2. Recent valid commercial registration + license + establishment registration  
3. Bank statement for last 6 months, stamped & signed  
4. Original ID cards of partners  
5. Original passports of resident partners  
6. Copies of operating contracts, invoices, supply orders  
7. Quotation addressed to First Finance Company  
8. Any additional documents required by FFC`
},

// Corporate Finance - Vehicle & Equipment / Fleet Financing (Wholesale)
{
  category: "corporate_vehicle_equipment_finance",
  triggers: ["fleet finance", "vehicle financing", "equipment financing", "تمويل مركبات شركات", "wholesale finance"],
  response: `
**Vehicle & Equipment / Fleet Financing (Wholesale)**

**Main Features:**  
1. Repayment up to 60 months including grace period  
2. Grace period at beginning based on credit approval  
3. Financing tailored to scale of activity & request  
4. No administrative fees  
5. Lien on vehicles & equipment financed  
6. Takaful Insurance  

**Required Documents:**  
1. Last 3 audited financial statements or internal financials  
2. Recent valid commercial registration + license + establishment registration  
3. Bank statement last 6 months, stamped & signed  
4. Original ID cards of partners  
5. Original passports of resident partners  
6. Copies of operating contracts, invoices, supply orders  
7. Quotation addressed to First Finance Company  
8. Real estate or cash collateral covering 80% of indebtedness, or Qatari guarantor`
},

// Corporate Revolving Credit (Revolving Credit Limit)
{
  category: "corporate_revolving_credit",
  triggers: ["revolving credit", "credit limit", "تمويل ائتماني متجدد"],
  response: `
**Corporate Revolving Credit Product**

**Main Features:**  
1. Obtain revolving credit limit valid for a specified period (e.g., 1 year)  
2. Withdraw multiple times based on business needs  
3. Profits calculated only on used amount  

**Required Documents:**  
- Depending on type of credit limit and financing requirements. Contact your FFC relationship manager for details.`
},
{
  category : "profit_rates",
  triggers : [  "profit rate",
  "profit rates",
  "profit",
  "interest rate",
  "interest",
  "financing rate",
  "finance rate",
  "how much profit",
  "what's the profit",
  "how much do I pay",
  "what is the rate",
  "profit structure",
  "murabaha profit",
  "cost of finance",
  "profit percentage",
  "finance charges",
  "profit margin",
  "vehicle profit",
  "personal loan profit",
  "housing finance profit",
  "corporate finance profit"],
  response: "The current profit rates at First Finance Company are determined by a set of credit policy matrix controls. For precise rates, you would need to visit a branch or contact the First Finance Company call center. Please note that all services provided by First Finance Company are Shari'a-compliant financial services."
}

];

