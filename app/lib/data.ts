import jobDescriptionsJson from "../../data/job-descriptions.json";
import salariesJson from "../../data/salaries.json";
import { JobDescription, SalaryRecord } from "./types";

export const jobDescriptions: JobDescription[] = jobDescriptionsJson;
export const salaries: SalaryRecord[] = salariesJson as SalaryRecord[];

export const JURISDICTION_DISPLAY: Record<string, string> = {
  sanbernardino: "San Bernardino County",
  ventura: "Ventura County",
  sdcounty: "San Diego County",
  kerncounty: "Kern County",
};

export const JURISDICTION_TOKENS: Record<string, string[]> = {
  sanbernardino: ["san", "bernardino"],
  ventura: ["ventura"],
  sdcounty: ["san", "diego", "sd"],
  kerncounty: ["kern"],
};
