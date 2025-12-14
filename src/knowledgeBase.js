// src/knowledgeBase.js
// First Finance Qatar - Official Knowledge Base
// Organized by category with smart context-aware responses

export const knowledgeBase = [
  /* ═══════════════════════════════════════════════════════════════
   * GREETINGS & GENERAL
   * ═══════════════════════════════════════════════════════════════ */
  {
    category: "greetings",
    triggers: ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "مرحبا", "اهلا", "السلام عليكم"],
    response: "Hello! I'm Hadi, your virtual assistant at First Finance Qatar. How can I help you today?"
  },

  /* ═══════════════════════════════════════════════════════════════
   * RETAIL FINANCE - VEHICLE FINANCE
   * ═══════════════════════════════════════════════════════════════ */
  
  // Vehicle Finance - Qatari Citizens
  {
    category: "vehicle_finance_qatari",
    triggers: [
      "car loan qatari", "vehicle loan qatari", "vehicle finance qatari", 
      "qatari vehicle", "qatari car loan", "car finance qatari national",
      "vehicle financing qatari", "auto loan qatari"
    ],
    response: ({ salary = 0, jobDurationMonths = 0, age = 0 }) => {
      const needsGuarantor = jobDurationMonths < 3;
      return `
**Vehicle Finance Details (Qatari Citizens)**

- Max financing limit: **2,000,000 QAR**
- Repayment period: Up to **72 months** + 3 months grace
- Debt-to-salary ratio: ≤ **75%** of total basic salary + social allowance
- Minimum salary: **None**
- Age: **18 – 65 years**
- ${needsGuarantor ? "Guarantor required (trainee < 3 months)" : "**No guarantor required**"}

**Required Documents:**
- Recent salary certificate
- Original Qatar ID
- Bank statement (last 3 months)
- Alternative payment cheques
- National address certificate
- Price offer directed to First Finance Company
- Vehicle inspection report (for used vehicles)

All services are **100% Shariah-compliant**.`;
    }
  },

  // Vehicle Finance - Expat/Residents
  {
    category: "vehicle_finance_expat",
    triggers: [
      "car loan expat", "vehicle loan expat", "vehicle finance expat", 
      "expat vehicle", "expat car loan", "car finance expatriate",
      "vehicle financing expat", "resident car loan"
    ],
    response: () => `
**Vehicle Finance Details (Expat/Residents)**

- Max financing limit: **400,000 QAR**
- Repayment period: Up to **48 months** + 3 months grace
- Debt-to-salary ratio: ≤ **50%** of total salary
- Minimum salary: **5,000 QAR**
- Age: **18 – 60 years**
- **Guarantor required**

**Required Documents:**
- Recent salary certificate
- Original Qatar ID + Passport
- Bank statement (last 3 months, bank stamped)
- Alternative payment cheques
- National address certificate
- Price offer directed to First Finance Company
- Vehicle inspection report (for used vehicles)

All services are **100% Shariah-compliant**.`
  },

  // Generic Vehicle Finance (nationality not specified)
  {
    category: "vehicle_finance",
    triggers: [
      "car loan", "vehicle loan", "vehicle finance", "auto loan", 
      "car financing", "buy car", "finance car", "motorcycle finance",
      "تمويل مركبات", "قرض سيارة"
    ],
    response: "I can help you with vehicle finance! Are you a **Qatari National** or an **Expat**? The terms differ based on nationality."
  },

  /* ═══════════════════════════════════════════════════════════════
   * RETAIL FINANCE - PERSONAL FINANCE
   * ═══════════════════════════════════════════════════════════════ */

  // Personal Finance - Qatari Citizens
  {
    category: "personal_finance_qatari",
    triggers: [
      "personal loan qatari", "personal finance qatari", 
      "qatari personal loan", "personal financing qatari"
    ],
    response: () => `
**Personal Finance (Qatari Citizens)**

- Maximum financing limit: **2,000,000 QAR**
- Repayment period: Up to **72 months** + 3 months grace
- Debt-to-salary ratio: ≤ **75%**
- **No guarantor required**

**Required Documents:**
- Recent salary certificate
- Original Qatar ID
- Bank statement (last 3 months)
- Security cheques
- National address certificate

All services are **100% Shariah-compliant**.`
  },

  // Personal Finance - Expat/Residents
  {
    category: "personal_finance_expat",
    triggers: [
      "personal loan expat", "personal finance expat",
      "expat personal loan", "personal financing expat"
    ],
    response: () => `
**Personal Finance (Expat/Residents)**

- Maximum financing limit: **200,000 QAR**
- Repayment period: Up to **48 months** + 3 months grace
- Debt-to-salary ratio: ≤ **50%**
- **Qatari guarantor required**

**Required Documents:**
- Recent salary certificate
- Original Qatar ID + Passport
- Bank statement (last 3 months, bank stamped)
- Security cheques
- National address certificate

All services are **100% Shariah-compliant**.`
  },

  // Generic Personal Finance
  {
    category: "personal_finance",
    triggers: [
      "personal loan", "personal finance", "retail loan",
      "personal financing", "تمويل شخصي", "قرض شخصي"
    ],
    response: "I can help you with personal finance! Are you a **Qatari National** or an **Expat**? The terms and limits differ based on nationality."
  },

  /* ═══════════════════════════════════════════════════════════════
   * RETAIL FINANCE - SERVICES FINANCE
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "services_finance_qatari",
    triggers: [
      "services finance qatari", "healthcare finance qatari", 
      "education finance qatari", "wedding finance qatari",
      "travel finance qatari", "تمويل خدمات قطري"
    ],
    response: `
**Services Finance (Qatari Citizens – Salary-Based)**

**Main Features:**
- Repayment period: Up to **72 months** + 3 months grace
- Grace period: Up to **3 months**
- No administrative fees
- Max debt-to-salary ratio: ≤ **75%** of total basic salary + social allowance
- Max finance: **2,000,000 QAR** (including profit)
- **Takaful insurance included**
- Additional income sources allow extra financing & longer repayment
- Age: **18–65 years**
- Qatari trainee requires guarantor or min 3-month training contract

**Required Documents:**
1. Recent salary certificate
2. Original Qatar ID
3. Bank statement (last 3 months, stamped)
4. Alternative payment cheques
5. National address certificate

All services are **100% Shariah-compliant**.`
  },

  /* ═══════════════════════════════════════════════════════════════
   * RETAIL FINANCE - HOUSING/REAL ESTATE
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "housing_finance_qatari",
    triggers: [
      "housing finance qatari", "real estate finance qatari",
      "apartment finance qatari", "villa finance qatari", 
      "home loan qatari", "property finance qatari",
      "تمويل عقاري قطري", "تمويل سكني قطري"
    ],
    response: `
**Housing/Real Estate Finance (Qatari Citizens)**

**Main Features:**
- Repayment period: Up to **15 years (180 months)**
- Grace period at beginning based on credit approval
- No administrative fees
- Down payment: ≥ **30%**
- Mortgage on financed property
- Age: **18–75 years**
- Qatari trainee requires guarantor or min 3-month training contract

**Required Documents:**
1. Recent salary certificate
2. Original Qatar ID
3. Bank statement (last 6 months, stamped)
4. Alternative payment cheques
5. National address certificate
6. Copy of property ownership deed with plan
7. Property appraisal from **two certified appraisal offices**

**Applicable Areas:** The Pearl, Lusail, West Bay (freehold areas only)

All services are **100% Shariah-compliant**.`
  },

  {
    category: "real_estate_finance",
    triggers: [
      "real estate", "housing", "home finance", "property", 
      "lusail", "pearl", "west bay", "apartment", "villa",
      "سكن", "عقار", "لوسيل"
    ],
    response: `
**Housing Finance**

**Key Features:**
- Tenure: Up to **15 years**
- Down payment: **30%**
- Grace period: Available
- No admin fees
- **Freehold areas only** (The Pearl, Lusail, West Bay)

**Contract Types:**
- Ijara (Leasing)
- Murabaha (Cost-plus)

**Required Documents:**
- Property title deed
- 2 valuation reports (QCB-approved)
- 6-month bank statement

💡 Would you like details for **Qatari** or **Expat** citizens?`
  },

  /* ═══════════════════════════════════════════════════════════════
   * RETAIL FINANCE - SPECIALTY PRODUCTS
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "travel_finance",
    triggers: [
      "travel finance", "travel loan", "holiday loan", 
      "vacation finance", "umrah finance", "hajj finance",
      "سفر", "حج", "عمرة", "إجازة"
    ],
    response: `
**Travel & Umrah Finance**

**Eligibility:**
- Minimum salary: **10,000 QAR**
- Maximum finance: **50,000 QAR**
- Tenure: Up to **24 months**
- Grace period: Up to **1 month**
- Down payment: **10%**

**Required Documents:**
- Flight/hotel/package quotation
- Salary certificate + bank statement
- Security cheques

**Shariah Contract:** Murabaha (cost-plus financing)

All services are **100% Shariah-compliant**.`
  },

  {
    category: "marine_finance",
    triggers: [
      "marine", "boat", "yacht", "jet ski", "watercraft",
      "marine finance", "boat loan", "yacht finance",
      "مارين", "يخت", "جت سكي"
    ],
    response: `
**Marine Finance**

**For Qatari Nationals:**
- Up to **2,000,000 QAR**
- Up to **72 months** + 3 months grace
- No down payment
- No collateral required

**For Expats/Residents:**
- Up to **400,000 QAR**
- Up to **48 months** + 3 months grace
- No down payment
- Marine craft as collateral

✅ **Takaful insurance included**
✅ **100% Shariah-compliant**`
  },

  /* ═══════════════════════════════════════════════════════════════
   * CORPORATE FINANCE
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "corporate_finance_general",
    triggers: [
      "corporate finance", "company finance", "business finance",
      "corporate loan", "business loan", "about corporate finance",
      "تمويل الشركات", "تمويل الأعمال"
    ],
    response: `
**Corporate Finance Solutions**

First Finance provides innovative **Shariah-compliant** solutions for both Qatari and non-Qatari companies to secure liquidity for projects, working capital, and operating expenses.

**Available Products:**
1. **Commodities Finance** - Metals, raw materials
2. **Goods Finance** - Import/export goods
3. **Vehicle & Equipment / Fleet Financing** - Wholesale
4. **Corporate Revolving Credit** - Flexible credit line

**Company Definitions:**
- **Qatari Company:** >50% owned by Qatari nationals
- **Foreign Company:** 100% foreign-owned OR >50% non-Qatari ownership

**Note for Non-Qatari Companies:**
No difference in features, benefits, profit rates, or repayment terms. However, **mandatory collateral** (real estate/cash ≥80% of debt) or **Qatari guarantor** required.`
  },

  {
    category: "corporate_commodities_finance",
    triggers: [
      "commodities finance", "metal finance", "raw materials finance",
      "commodity financing", "تمويل سلع"
    ],
    response: `
**Commodities Finance (Corporate)**

**Main Features:**
- Repayment period tailored to your activity
- Grace period available (credit approval required)
- No administrative fees
- Financing scaled to your business needs
- **Takaful Insurance included**

**Required Documents:**
1. Last 3 audited financial statements OR internal financials
2. Valid commercial registration + trade license + establishment registration
3. Bank statement (last 6 months, stamped & signed)
4. Original ID cards of partners
5. Original passports of resident partners
6. Copies of contracts, invoices, supply orders
7. **Collateral:** Real estate/cash (≥80% of debt) OR Qatari guarantor
8. Any additional documents required by FFC

All services are **100% Shariah-compliant**.`
  },

  {
    category: "corporate_goods_finance",
    triggers: [
      "goods finance", "import finance", "export finance",
      "company goods finance", "تمويل بضائع"
    ],
    response: `
**Goods Finance (Corporate)**

**Main Features:**
- Repayment: Up to **36 months** (including grace period)
- Purchase goods **domestically & internationally**
- Grace period available (credit approval required)
- Financing tailored to your business scale
- No administrative fees
- **Takaful Insurance included**

**Required Documents:**
1. Last 3 audited financial statements OR internal financials
2. Valid commercial registration + license + establishment registration
3. Bank statement (last 6 months, stamped & signed)
4. Original ID cards of partners
5. Original passports of resident partners
6. Copies of contracts, invoices, supply orders
7. Quotation addressed to **First Finance Company**
8. Any additional documents required by FFC

All services are **100% Shariah-compliant**.`
  },

  {
    category: "corporate_vehicle_equipment_finance",
    triggers: [
      "fleet finance", "company vehicle finance", "equipment financing",
      "wholesale vehicle finance", "fleet loan", "تمويل مركبات شركات"
    ],
    response: `
**Vehicle & Equipment / Fleet Financing (Wholesale)**

**Main Features:**
- Repayment: Up to **60 months** (including grace period)
- Grace period available (credit approval required)
- Financing tailored to fleet size & requirements
- No administrative fees
- **Lien on vehicles & equipment financed**
- **Takaful Insurance included**

**Required Documents:**
1. Last 3 audited financial statements OR internal financials
2. Valid commercial registration + license + establishment registration
3. Bank statement (last 6 months, stamped & signed)
4. Original ID cards of partners
5. Original passports of resident partners
6. Copies of contracts, invoices, supply orders
7. Quotation addressed to **First Finance Company**
8. **Collateral:** Real estate/cash (≥80% of debt) OR Qatari guarantor

All services are **100% Shariah-compliant**.`
  },

  {
    category: "corporate_revolving_credit",
    triggers: [
      "revolving credit", "credit limit", "credit line",
      "corporate credit line", "تمويل ائتماني متجدد"
    ],
    response: `
**Corporate Revolving Credit Product**

**Main Features:**
✅ Revolving credit limit valid for specified period (e.g., 1 year)
✅ Withdraw multiple times based on business needs
✅ **Profits calculated only on used amount**

**Flexibility:** Draw, repay, and redraw as needed within your approved limit.

**Required Documents:**
Varies based on credit limit type and financing requirements. Please contact your **FFC relationship manager** for personalized details.

All services are **100% Shariah-compliant**.`
  },

  /* ═══════════════════════════════════════════════════════════════
   * COMPANY INFORMATION
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "company_info",
    triggers: [
      "about", "who are you", "first finance", "about company",
      "company info", "من أنتم", "عن الشركة"
    ],
    response: `
**First Finance Company**

🏛️ **Established:** November 1999
📊 **First** finance company in Qatar regulated by **Qatar Central Bank**
💰 **Share Capital:** QAR 50M → QAR 639M by 2009
🏢 **Ownership:** Acquired by Dukhan Bank in 2010

**Mission:**
✓ Become the most recommended finance company in Qatar
✓ Build long-term partnerships with clients
✓ Attract top talent and maintain engaging work environment
✓ Grow profitable and sustainable businesses
✓ Contribute to community development and economic prosperity

**Vision:**
Leading finance company recognized for progressive spirit, excellent service, outstanding results, and community contribution.

**Quality Standards:**
✅ ISO 9001:2015 certified
✅ **100% Shariah-compliant services**

📋 For Board & Management details, ask me directly!`
  },

  {
    category: "company_full_info",
    triggers: [
      "board", "management", "directors", "CEO", "executives",
      "vision", "mission", "quality policy", "company address"
    ],
    response: `
**First Finance Company - Complete Overview**

**History:**
- Established: **November 1999**
- First finance company in Qatar regulated by **Qatar Central Bank**
- Share capital: QAR 50M → **QAR 639M** by 2009
- Acquired by **Dukhan Bank** in 2010

**Board of Directors:**
- Sheikh Mohammed Al-Thani – *Chairman*
- Mr. Ahmed Ishaq Hashem – *Vice Chairman*
- Mr. Abdulrahman Khalifa Al-Ghanim – *Member*
- Mr. Osama Abubaker – *Member*
- Mr. Talal A Al-Khaja – *Member*

**Executive Management:**
- **CEO:** Eslah Assem
- **Head of HR:** Hamad Al-Muhannadi
- **Head of Finance:** Amer Taha
- **Head of Risk:** Basil Al-Sughayer
- **Head of Compliance:** Amro Tantawi
- **Head of IT:** Bassem Itani
- **Head of Legal:** Awad Al-Sanousy
- **Head of Operations:** Annas Miqdad
- **Head of Business Development:** Hussam Barakat
- **Head of Collections:** Mutaz Al-Masloukhi
- **Senior Manager Internal Audit:** Ahmed Hajaj

**Shariah Supervisory & Fatwa Board:**
- **Chairman:** Shaikh Dr. Waleed Mohammed Hadi
- **Members:** Shaikh Dr. Esam Khalaf Al-Enezi, Shaikh Dr. Osama Qais Al-Dereai

**Contact:**
📍 C-Ring Road, Zone 40, Building 321 (next to Turkish Hospital), Doha, Qatar
📞 +974 44559999
📠 +974 44559955
✉️ info@ffcqatar.com`
  },

  /* ═══════════════════════════════════════════════════════════════
   * SHARIAH & ISLAMIC FINANCE
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "islamic_contracts",
    triggers: [
      "shariah", "islamic", "sharia", "halal finance",
      "murabaha", "ijara", "ijarah", "contract", "islamic finance",
      "عقود", "مرابحة", "إجارة", "شريعة"
    ],
    response: `
**Shariah-Compliant Contracts**

First Finance uses only **approved Islamic finance structures:**

🔹 **Murabaha** → Cost-plus sale (vehicles, goods, travel)
🔹 **Ijara** → Leasing with ownership transfer (housing, equipment)
🔹 **Istisna** → Manufacturing finance (construction projects)
🔹 **Mudaraba & Musharaka** → Profit-sharing partnerships (corporate)

**Shariah Principles:**
✅ No interest (Riba)
✅ No uncertainty (Gharar)
✅ No gambling (Maysir)

**Supervision:**
All contracts are **approved and supervised** by our Shariah Supervisory & Fatwa Board.`
  },

  {
    category: "shariah_transactions",
    triggers: [
      "shariah transaction", "musawamah", "bay al manfaah",
      "islamic transaction types", "halal contracts"
    ],
    response: `
**Shariah-Compliant Transaction Types**

🔹 **Musawamah:** Company purchases asset and sells to customer at mutually agreed price (no disclosed markup)

🔹 **Murabaha:** Company sells goods at **cost + disclosed profit margin** (transparent pricing)

🔹 **Ijarah:** Leasing of tangible assets (housing, vehicles, equipment) with ownership transfer option

🔹 **Bay al-Manfaah:** Selling the right to use/benefit from a service (service financing)

**All transactions are:**
✅ Supervised by our Shariah Board
✅ Compliant with Islamic finance principles
✅ Transparent and ethical`
  },

  {
    category: "profit_rates",
    triggers: [
      "profit rate", "profit rates", "profit", "interest rate", "interest",
      "financing rate", "finance rate", "how much profit", "what's the profit",
      "how much do I pay", "what is the rate", "profit structure",
      "murabaha profit", "cost of finance", "profit percentage",
      "finance charges", "profit margin"
    ],
    response: `
**Profit Rates Information**

The current profit rates at First Finance Company are determined by a **set of credit policy matrix controls** that consider:
- Product type
- Financing amount
- Repayment period
- Customer profile
- Market conditions

**For Precise Rates:**
📞 Visit a branch or contact our call center at **+974 4455 9999**
💼 Speak with a finance specialist for a personalized quote

**Note:** All services provided by First Finance Company are **100% Shariah-compliant** financial services.`
  },

  /* ═══════════════════════════════════════════════════════════════
   * SERVICES & SUPPORT
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "contact",
    triggers: [
      "contact", "phone", "call", "email", "location", "address",
      "reach", "get in touch", "اتصال", "رقم", "عنوان"
    ],
    response: `
**Get in Touch with First Finance**

📞 **Call Center:** +974 4455 9999
✉️ **Email:** info@ffcqatar.com
🌐 **Website:** https://ffcqatar.com

**Branch Locations:**

🏢 **Main Branch:**
C-Ring Road, Building 321 (next to Turkish Hospital)

🏢 **Mawater Branch:**
Umm Ghuwailina

**Digital Services:**
💬 **Live Chat:** Available 24/7 on our website
📱 **Mobile App:** Available 24/7 (iOS & Android)

We're here to help!`
  },

  {
    category: "working_hours",
    triggers: [
      "working hours", "open", "branch hours", "work hours", 
      "hours", "timing", "schedule", "مواعيد", "دوام", "ساعات العمل"
    ],
    response: `
**Branch Working Hours**

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
Available **24/7** for your convenience!`
  },

  {
    category: "app_guide",
    triggers: [
      "mobile app", "app", "how to use app", "download app",
      "application process", "apply online", "online application",
      "تطبيق", "تحميل", "كيفية التقديم"
    ],
    response: `
**Apply for Finance - 3 Easy Ways**

📱 **Mobile App (Recommended):**
- **iOS:** https://apps.apple.com/qa/app/ffc-online/id1581399823
- **Android:** https://play.google.com/store/apps/details?id=com.its.mobilebanking.ffc

**Features:**
✅ Apply 24/7 from anywhere
✅ Track application status
✅ Upload documents instantly
✅ Get instant pre-approval

💻 **Website:**
Apply online at **https://ffcqatar.com** (available 24/7)

🏢 **Visit a Branch:**
- Main Branch: C-Ring Road
- Mawater Branch: Umm Ghuwailina

All applications are **100% Shariah-compliant**.`
  },

  {
    category: "after_sales_services",
    triggers: [
      "after sales", "after-sales", "services", "collections",
      "liability certificate", "vehicle lien release", "lien release",
      "bank payment order", "replace cheque", "vehicle export",
      "property mortgage", "clearance", "certificate"
    ],
    response: `
**After-Sales Services**

Our Collections Department provides:

📋 **Certificates & Documents:**
- Liability / Replacement Certificates
- Vehicle Lien Release
- Traffic Department letters
- Property mortgage release

🚗 **Vehicle Services:**
- Deregistration / title transfer
- Vehicle export clearance

💰 **Financial Services:**
- Payment schedule changes
- Cheque replacements
- Bank payment orders

⚖️ **Legal Services:**
- Legal referrals
- Dispute resolution support

📞 **Contact Collections:** +974 4455 9999

All processes are **Shariah-compliant**.`
  },

  {
    category: "company_accreditation",
    triggers: [
      "company accreditation", "accreditation", "non-accredited company",
      "accreditation requirements", "accreditation documents",
      "company approval", "employer accreditation"
    ],
    response: `
**Company Accreditation (Individual Financing)**

**Accreditation Levels:**

✅ **Level 1: Automatically Accredited**
- Governmental & Semi-Government entities
- Companies listed on Qatar Stock Exchange (QSE)

📋 **Level 2: Non-Accredited (Loans > 150,000 QAR)**
Required documents:
- Accreditation form
- National address certificate
- Last 2 audited financial statements
- Commercial registration/license
- Owner(s) Qatar ID

📋 **Level 3: Non-Accredited (Car Loans < 150,000 QAR)**
Required:
- Commercial registration/license/ID
- Company ≥ **3 years** established

**For Residents Working in Non-Accredited Companies:**
- Employment: ≥ **1 year**
- No returned cheques in last **6 months**
- Maximum financing: **150,000 QAR**
- Financing only from authorized agencies/distributors

All services are **100% Shariah-compliant**.`
  },

  /* ═══════════════════════════════════════════════════════════════
   * EMI & CALCULATIONS
   * ═══════════════════════════════════════════════════════════════ */

  {
    category: "vehicle_emi",
    triggers: [
      "emi calculation", "vehicle emi", "calculate emi", "monthly payment",
      "installment calculator", "payment calculator", "حاسبة القسط"
    ],
    response: ({ amount, tenure, firstInstallmentDate }) => {
      if (!amount || !tenure) {
        return `
**EMI Calculator**

To calculate your monthly installment, I need:
1. **Finance amount** (in QAR)
2. **Repayment period** (in months)

Example: "Calculate EMI for 100,000 QAR over 36 months"

Would you like to start an EMI calculation?`;
      }

      const monthlyEMI = amount / tenure;
      const totalPayable = monthlyEMI * tenure;
      const lastInstallmentDate = new Date(new Date(firstInstallmentDate).setMonth(new Date(firstInstallmentDate).getMonth() + tenure - 1)).toLocaleDateString();

      return `
**Preliminary Finance Details**

💰 **Finance Amount:** ${amount.toLocaleString()} QAR
📅 **Duration:** ${tenure} months

**Payment Schedule:**
- **Total Payable:** ${totalPayable.toFixed(2)} QAR
- **Down Payment:** 0 QAR
- **Monthly Installment:** ${monthlyEMI.toFixed(2)} QAR
- **First Installment:** ${new Date(firstInstallmentDate).toLocaleDateString()}
- **Last Installment:** ${lastInstallmentDate}

⚠️ *This is a preliminary calculation only. Terms and conditions apply.*

📞 For exact profit rates, contact us at **+974 4455 9999**`;
    }
  }
];