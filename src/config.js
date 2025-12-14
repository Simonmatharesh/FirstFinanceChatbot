// config.js

/* ============================
   ELIGIBILITY RULES (KB-ALIGNED)
   ============================ */

export const eligibilityRules = {
  vehicle: {
    Qatari: {
      minAge: 18,
      maxAgeEnd: 65,
      minSalary: null, // Not explicitly defined in KB
      trainee: {
        allowed: true,
        conditions: "Guarantor or valid 3-month training contract"
      },
      minJobMonths: 3
    },
    Expat: {
      minAge: 18,
      maxAgeEnd: 60,
      minSalary: 5000,
      trainee: {
        allowed: false
      },
      minJobMonths: 3
    }
  },

  personal: {
    Qatari: {
      minAge: 18,
      maxAgeEnd: 65,
      minSalary: null,
      guarantorRequired: false
    },
    Expat: {
      minAge: 18,
      maxAgeEnd: 60,
      minSalary: 5000,
      guarantorRequired: true
    }
  },

  housing: {
    Qatari: {
      minAge: 18,
      maxAgeEnd: 65,
      minSalary: null
    },
    Expat: {
      minAge: 18,
      maxAgeEnd: 60,
      minSalary: null
    }
  },

  services: {
    Qatari: {
      minAge: 18,
      maxAgeEnd: 65,
      downPaymentRequired: false
    },
    Expat: {
      minAge: 18,
      maxAgeEnd: 60,
      downPaymentRequired: true,
      minDownPaymentPercent: 10
    }
  }
};

/* ============================
   EMI / PROFIT RATES
   ============================ */
/* KB does NOT define exact rates — these are placeholders
   and SHOULD NOT be shown to users directly */

export const emiRates = {
  vehicle: { base: null },
  personal: { base: null },
  housing: { base: null },
  services: { base: null }
};

/* ============================
   REQUIRED DOCUMENTS (KB-EXACT)
   ============================ */

export const requiredDocs = {
  vehicle: {
    Qatari: [
      "Recent salary certificate",
      "Original Qatar ID",
      "Bank statement (last 3 months)",
      "Alternative payment cheques",
      "National address certificate",
      "Vehicle price offer"
    ],
    Expat: [
      "Recent salary certificate",
      "Original Qatar ID and Passport",
      "Bank statement (last 3 months, bank stamped)",
      "Alternative payment cheques",
      "National address certificate",
      "Vehicle price offer"
    ]
  },

  personal: {
    Qatari: [
      "Recent salary certificate",
      "Original Qatar ID",
      "Bank statement (last 3 months)",
      "Alternative payment cheques",
      "National address certificate"
    ],
    Expat: [
      "Recent salary certificate",
      "Original Qatar ID and Passport",
      "Bank statement (last 3 months, bank stamped)",
      "Alternative payment cheques",
      "National address certificate",
      "Qatari guarantor documents"
    ]
  },

  housing: {
    Qatari: [
      "Recent salary certificate",
      "Original Qatar ID",
      "Bank statement (last 6 months)",
      "Property documents",
      "National address certificate"
    ],
    Expat: [
      "Recent salary certificate",
      "Original Qatar ID and Passport",
      "Bank statement (last 6 months, bank stamped)",
      "Property documents",
      "National address certificate"
    ]
  },

  services: {
    Qatari: [
      "Recent salary certificate",
      "Original Qatar ID",
      "Bank statement (last 3 months)",
      "Service quotation",
      "National address certificate"
    ],
    Expat: [
      "Recent salary certificate",
      "Original Qatar ID and Passport",
      "Bank statement (last 3 months, bank stamped)",
      "Service quotation",
      "National address certificate",
      "Minimum 10% down payment proof"
    ]
  }
};
