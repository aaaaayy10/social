import original from "@/data/program-details.json";

export const excludedFinancialPrograms = ["치매예방교실", "찾아가는 시니어 디지털 스쿨", "건강100세 운동교실", "생활체조"];
export const includedInFinancialAnalysis = (name: string) => !excludedFinancialPrograms.includes(name);
const programs = original.refundReport.programs.filter(row => includedInFinancialAnalysis(row.name));
const countTotal = (field: "depositCount" | "count") => programs.reduce((sum, row) => sum + (row[field] ?? 0), 0);
export const financialAnalysisData = {
  ...original,
  programs: original.programs.filter(row => includedInFinancialAnalysis(row.name)),
  refundReport: {
    ...original.refundReport,
    programs,
    totals: { ...original.refundReport.totals, depositCount: countTotal("depositCount"), count: countTotal("count") },
  },
};
