import { SalaryRecord } from "./types";

export function parseSalaryValue(raw: string): number | null {
  const cleaned = raw.replace(/[\s,$]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function detectSalaryUnit(salary: SalaryRecord): string {
  for (let i = 1; i <= 14; i++) {
    const raw = salary[`Salary grade ${i}` as keyof SalaryRecord];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const value = parseSalaryValue(raw);
    if (value === null) continue;
    // Values over $500 are monthly; smaller values are hourly rates
    return value > 500 ? "per month" : "per hour";
  }
  return "";
}

export function formatSalaryGrades(salary: SalaryRecord): string {
  const grades: string[] = [];
  for (let i = 1; i <= 14; i++) {
    const value = salary[`Salary grade ${i}` as keyof SalaryRecord];
    if (typeof value === "string" && value.trim()) {
      grades.push(`Grade ${i}: ${value.trim()}`);
    }
  }
  if (grades.length === 0) return "No salary data available";
  const unit = detectSalaryUnit(salary);
  return grades.join(", ") + (unit ? ` (${unit})` : "");
}
