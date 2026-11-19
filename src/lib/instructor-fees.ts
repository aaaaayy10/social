import fees from "@/data/instructor-fees.json";
import details from "@/data/program-details.json";
import { includedInFinancialAnalysis } from "@/lib/financial-analysis-scope";

const key = (name: string) => name.normalize("NFKC").replace(/\s/g, "").toLocaleLowerCase("ko-KR");
const names = [...new Set([...details.programs.map(row => row.name), ...details.refundReport.programs.map(row => row.name), ...fees.programs.map(row => row.name)])].filter(includedInFinancialAnalysis);

export const instructorFees = fees;
export const instructorFeeRows = names.map(name => {
  const expense = fees.programs.find(row => key(row.name) === key(name));
  const report = details.refundReport.programs.find(row => key(row.name) === key(name));
  const fee = expense?.fee ?? 0;
  const transport = expense?.transport ?? 0;
  const total = fee + transport;
  const deposit = report?.deposit ?? null;
  const refund = report?.refund ?? null;
  const balance = report?.balance ?? null;
  return { name, fee, transport, total, deposit, refund, balance,
    depositDifference: deposit === null ? null : total - deposit,
    balanceDifference: balance === null ? null : total - balance };
});
export const normalizeFeeSearch = key;
