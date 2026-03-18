import { describe, it, expect } from "vitest";
import {
  jobDescriptions,
  salaries,
  JURISDICTION_DISPLAY,
  JURISDICTION_TOKENS,
} from "../app/lib/data";

describe("jobDescriptions", () => {
  it("loads all 8 job descriptions", () => {
    expect(jobDescriptions).toHaveLength(8);
  });

  it("each record has required fields", () => {
    for (const job of jobDescriptions) {
      expect(job).toHaveProperty("jurisdiction");
      expect(job).toHaveProperty("code");
      expect(job).toHaveProperty("title");
      expect(job).toHaveProperty("description");
      expect(typeof job.jurisdiction).toBe("string");
      expect(typeof job.code).toBe("string");
      expect(typeof job.title).toBe("string");
      expect(typeof job.description).toBe("string");
    }
  });

  it("no record has empty title or jurisdiction", () => {
    for (const job of jobDescriptions) {
      expect(job.title.trim().length).toBeGreaterThan(0);
      expect(job.jurisdiction.trim().length).toBeGreaterThan(0);
    }
  });

  it("contains expected jurisdictions", () => {
    const jurisdictions = new Set(jobDescriptions.map((j) => j.jurisdiction));
    expect(jurisdictions).toContain("sanbernardino");
    expect(jurisdictions).toContain("ventura");
    expect(jurisdictions).toContain("sdcounty");
  });

  it("contains expected job titles", () => {
    const titles = jobDescriptions.map((j) => j.title);
    expect(titles).toContain("Assistant Chief Probation Officer");
    expect(titles).toContain("Assistant Sheriff");
    expect(titles).toContain("Associate Meteorologist");
    expect(titles).toContain("Appraiser Trainee");
  });
});

describe("salaries", () => {
  it("loads all 7 salary records", () => {
    expect(salaries).toHaveLength(7);
  });

  it("each record has Jurisdiction and Job Code", () => {
    for (const salary of salaries) {
      expect(salary).toHaveProperty("Jurisdiction");
      expect(salary).toHaveProperty("Job Code");
      expect(typeof salary.Jurisdiction).toBe("string");
      expect(typeof salary["Job Code"]).toBe("string");
    }
  });

  it("each record has all 14 salary grade fields", () => {
    for (const salary of salaries) {
      for (let i = 1; i <= 14; i++) {
        expect(salary).toHaveProperty(`Salary grade ${i}`);
      }
    }
  });

  it("every record has at least one non-empty salary grade", () => {
    for (const salary of salaries) {
      const hasGrade = Array.from({ length: 14 }, (_, i) => {
        const val = salary[`Salary grade ${i + 1}` as keyof typeof salary];
        return typeof val === "string" && val.trim().length > 0;
      }).some(Boolean);
      expect(hasGrade).toBe(true);
    }
  });
});

describe("JURISDICTION_DISPLAY", () => {
  it("has display names for all jurisdictions in the dataset", () => {
    const jurisdictions = new Set(jobDescriptions.map((j) => j.jurisdiction));
    for (const j of jurisdictions) {
      expect(JURISDICTION_DISPLAY[j]).toBeDefined();
      expect(typeof JURISDICTION_DISPLAY[j]).toBe("string");
    }
  });

  it("display names are human-readable", () => {
    expect(JURISDICTION_DISPLAY.sanbernardino).toBe("San Bernardino County");
    expect(JURISDICTION_DISPLAY.ventura).toBe("Ventura County");
    expect(JURISDICTION_DISPLAY.sdcounty).toBe("San Diego County");
    expect(JURISDICTION_DISPLAY.kerncounty).toBe("Kern County");
  });
});

describe("JURISDICTION_TOKENS", () => {
  it("has tokens for all jurisdictions in the dataset", () => {
    const jurisdictions = new Set(jobDescriptions.map((j) => j.jurisdiction));
    for (const j of jurisdictions) {
      expect(JURISDICTION_TOKENS[j]).toBeDefined();
      expect(Array.isArray(JURISDICTION_TOKENS[j])).toBe(true);
      expect(JURISDICTION_TOKENS[j].length).toBeGreaterThan(0);
    }
  });

  it("tokens are all lowercase", () => {
    for (const tokens of Object.values(JURISDICTION_TOKENS)) {
      for (const token of tokens) {
        expect(token).toBe(token.toLowerCase());
      }
    }
  });

  it("sanbernardino includes 'san' and 'bernardino'", () => {
    expect(JURISDICTION_TOKENS.sanbernardino).toContain("san");
    expect(JURISDICTION_TOKENS.sanbernardino).toContain("bernardino");
  });

  it("sdcounty includes 'san', 'diego', and 'sd'", () => {
    expect(JURISDICTION_TOKENS.sdcounty).toContain("san");
    expect(JURISDICTION_TOKENS.sdcounty).toContain("diego");
    expect(JURISDICTION_TOKENS.sdcounty).toContain("sd");
  });
});
