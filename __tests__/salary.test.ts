import { describe, it, expect } from "vitest";
import {
  parseSalaryValue,
  detectSalaryUnit,
  formatSalaryGrades,
} from "../app/lib/salary";
import { SalaryRecord } from "../app/lib/types";

function makeSalary(
  grades: Partial<Record<string, string>> = {},
): SalaryRecord {
  const base: SalaryRecord = {
    Jurisdiction: "test",
    "Job Code": "00000",
    "Salary grade 1": "",
    "Salary grade 2": "",
    "Salary grade 3": "",
    "Salary grade 4": "",
    "Salary grade 5": "",
    "Salary grade 6": "",
    "Salary grade 7": "",
    "Salary grade 8": "",
    "Salary grade 9": "",
    "Salary grade 10": "",
    "Salary grade 11": "",
    "Salary grade 12": "",
    "Salary grade 13": "",
    "Salary grade 14": "",
  };
  return { ...base, ...grades } as SalaryRecord;
}

describe("parseSalaryValue", () => {
  it("parses simple dollar amount", () => {
    expect(parseSalaryValue("$70.38")).toBe(70.38);
  });

  it("parses amount with commas", () => {
    expect(parseSalaryValue("$3,119.39")).toBe(3119.39);
  });

  it("parses amount with leading/trailing spaces", () => {
    expect(parseSalaryValue(" $4,966.18 ")).toBe(4966.18);
  });

  it("parses amount without dollar sign", () => {
    expect(parseSalaryValue("101.00")).toBe(101.0);
  });

  it("returns null for empty string", () => {
    expect(parseSalaryValue("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseSalaryValue("   ")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseSalaryValue("N/A")).toBeNull();
  });

  it("handles large values with multiple commas", () => {
    expect(parseSalaryValue("$1,234,567.89")).toBe(1234567.89);
  });

  it("handles whole numbers", () => {
    expect(parseSalaryValue("$50")).toBe(50);
  });
});

describe("detectSalaryUnit", () => {
  it("detects hourly rate for small values (< $500)", () => {
    const salary = makeSalary({
      "Salary grade 1": "$70.38",
      "Salary grade 2": "$101.00",
    });
    expect(detectSalaryUnit(salary)).toBe("per hour");
  });

  it("detects monthly rate for large values (> $500)", () => {
    const salary = makeSalary({
      "Salary grade 1": " $3,119.39 ",
      "Salary grade 2": " $4,375.47 ",
    });
    expect(detectSalaryUnit(salary)).toBe("per month");
  });

  it("returns empty string when all grades are empty", () => {
    const salary = makeSalary();
    expect(detectSalaryUnit(salary)).toBe("");
  });

  it("skips empty grades and detects from first non-empty", () => {
    const salary = makeSalary({
      "Salary grade 1": "",
      "Salary grade 2": "",
      "Salary grade 3": "$45.00",
    });
    expect(detectSalaryUnit(salary)).toBe("per hour");
  });

  it("treats $500.00 exactly as monthly", () => {
    const salary = makeSalary({ "Salary grade 1": "$500.01" });
    expect(detectSalaryUnit(salary)).toBe("per month");
  });

  it("treats $499.99 as hourly", () => {
    const salary = makeSalary({ "Salary grade 1": "$499.99" });
    expect(detectSalaryUnit(salary)).toBe("per hour");
  });
});

describe("formatSalaryGrades", () => {
  it("formats hourly salary with unit label", () => {
    const salary = makeSalary({
      "Salary grade 1": "$70.38",
      "Salary grade 2": "$101.00",
    });
    expect(formatSalaryGrades(salary)).toBe(
      "Grade 1: $70.38, Grade 2: $101.00 (per hour)",
    );
  });

  it("formats monthly salary with unit label", () => {
    const salary = makeSalary({
      "Salary grade 1": " $3,119.39 ",
      "Salary grade 2": " $4,375.47 ",
    });
    expect(formatSalaryGrades(salary)).toBe(
      "Grade 1: $3,119.39, Grade 2: $4,375.47 (per month)",
    );
  });

  it("returns 'No salary data available' when all grades are empty", () => {
    const salary = makeSalary();
    expect(formatSalaryGrades(salary)).toBe("No salary data available");
  });

  it("trims whitespace from salary values", () => {
    const salary = makeSalary({ "Salary grade 1": "  $50.00  " });
    const result = formatSalaryGrades(salary);
    expect(result).toContain("Grade 1: $50.00");
    expect(result).not.toContain("  ");
  });

  it("skips empty grades in output", () => {
    const salary = makeSalary({
      "Salary grade 1": "$10.00",
      "Salary grade 2": "",
      "Salary grade 3": "$20.00",
    });
    expect(formatSalaryGrades(salary)).toBe(
      "Grade 1: $10.00, Grade 3: $20.00 (per hour)",
    );
  });

  it("formats all 14 grades when populated", () => {
    const grades: Record<string, string> = {};
    for (let i = 1; i <= 14; i++) {
      grades[`Salary grade ${i}`] = `$${i * 10}.00`;
    }
    const salary = makeSalary(grades);
    const result = formatSalaryGrades(salary);
    for (let i = 1; i <= 14; i++) {
      expect(result).toContain(`Grade ${i}: $${i * 10}.00`);
    }
  });

  it("formats real San Bernardino salary data correctly", () => {
    const salary = makeSalary({
      Jurisdiction: "sanbernardino",
      "Job Code": "01297",
      "Salary grade 1": "$70.38",
      "Salary grade 2": "$101.00",
    });
    const result = formatSalaryGrades(salary);
    expect(result).toBe("Grade 1: $70.38, Grade 2: $101.00 (per hour)");
  });

  it("formats real SD County multi-grade salary data correctly", () => {
    const salary = makeSalary({
      Jurisdiction: "sdcounty",
      "Job Code": "03697",
      "Salary grade 1": "$43.38",
      "Salary grade 2": "$45.55",
      "Salary grade 3": "$47.83",
      "Salary grade 4": "$50.22",
      "Salary grade 5": "$53.33",
    });
    const result = formatSalaryGrades(salary);
    expect(result).toBe(
      "Grade 1: $43.38, Grade 2: $45.55, Grade 3: $47.83, Grade 4: $50.22, Grade 5: $53.33 (per hour)",
    );
  });
});
