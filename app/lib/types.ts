export interface JobDescription {
  jurisdiction: string;
  code: string;
  title: string;
  description: string;
}

export interface SalaryRecord {
  Jurisdiction: string;
  "Job Code": string;
  "Approval Date"?: string;
  "Salary grade 1": string;
  "Salary grade 2": string;
  "Salary grade 3": string;
  "Salary grade 4": string;
  "Salary grade 5": string;
  "Salary grade 6": string;
  "Salary grade 7": string;
  "Salary grade 8": string;
  "Salary grade 9": string;
  "Salary grade 10": string;
  "Salary grade 11": string;
  "Salary grade 12": string;
  "Salary grade 13": string;
  "Salary grade 14": string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
