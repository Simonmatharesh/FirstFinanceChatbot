// config.js
export const eligibilityRules = {
  vehicle: {
    Qatari: { minSalary: 3000, minAge: 18, traineeAllowed: true, minJobMonths: 3 },
    Expat: { minSalary: 5000, minAge: 18, traineeAllowed: false, minJobMonths: 3 },
  },
  personal: {
    Qatari: { minSalary: 0, minAge: 18 },
    Expat: { minSalary: 5000, minAge: 18 },
  },
  housing: {
    Qatari: { minSalary: 0, minAge: 18 },
    Expat: { minSalary: 0, minAge: 18 },
  },
};

export const emiRates = {
  vehicle: { base: 0.045, factor: 0.004 },
  personal: { base: 0.035, factor: 0.003 },
  housing: { base: 0.03, factor: 0.002 },
};

export const requiredDocs = {
  vehicle: {
    Qatari: ["Recent salary certificate", "ID", "Bank statement (3 months)", "Alternative cheques", "National address certificate", "Price offer"],
    Expat: ["Recent salary certificate", "ID + passport", "Bank statement (3 months, stamped)", "Alternative cheques", "National address certificate", "Price offer"],
  },
  personal: { /* similarly */ },
  housing: { /* similarly */ },
};
