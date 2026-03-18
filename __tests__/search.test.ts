import { describe, it, expect } from "vitest";
import { searchJobs } from "../app/lib/search";

describe("searchJobs", () => {
  // --- Empty / no-op queries ---

  describe("empty and stop-word-only queries", () => {
    it("returns empty array for empty string", () => {
      expect(searchJobs("")).toEqual([]);
    });

    it("returns empty array for whitespace-only string", () => {
      expect(searchJobs("   ")).toEqual([]);
    });

    it("returns empty array when query is all stop words", () => {
      expect(searchJobs("what is the in of for")).toEqual([]);
    });

    it("returns empty array when all tokens are single characters", () => {
      expect(searchJobs("a I")).toEqual([]);
    });
  });

  // --- Title matching ---

  describe("title matching", () => {
    it("matches 'Assistant Sheriff' to the Assistant Sheriff position", () => {
      const results = searchJobs("Assistant Sheriff");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Assistant Sheriff");
    });

    it("matches 'Meteorologist' to the Associate Meteorologist position", () => {
      const results = searchJobs("Meteorologist");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Associate Meteorologist");
    });

    it("matches 'Appraiser' to the Appraiser Trainee position", () => {
      const results = searchJobs("Appraiser");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Appraiser Trainee");
    });

    it("matches 'District Attorney' to the Assistant District Attorney position", () => {
      const results = searchJobs("District Attorney");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Assistant District Attorney");
    });

    it("matches 'Human Resources' to the Assistant Director of Human Resources", () => {
      const results = searchJobs("Human Resources");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Assistant Director of Human Resources");
    });

    it("matches 'Public Information Specialist' to Apcd position", () => {
      const results = searchJobs("Public Information Specialist");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Apcd Public Information Specialist");
    });

    it("is case-insensitive", () => {
      const lower = searchJobs("assistant sheriff");
      const upper = searchJobs("ASSISTANT SHERIFF");
      const mixed = searchJobs("AsSiStAnT sHeRiFf");
      expect(lower[0].job.title).toBe("Assistant Sheriff");
      expect(upper[0].job.title).toBe("Assistant Sheriff");
      expect(mixed[0].job.title).toBe("Assistant Sheriff");
    });
  });

  // --- Jurisdiction matching ---

  describe("jurisdiction matching", () => {
    it("matches 'San Bernardino' to sanbernardino jobs", () => {
      const results = searchJobs("San Bernardino");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.job.jurisdiction).toBe("sanbernardino");
      });
    });

    it("matches 'San Diego' to sdcounty jobs", () => {
      const results = searchJobs("San Diego");
      expect(results.length).toBeGreaterThan(0);
      const sdJobs = results.filter((r) => r.job.jurisdiction === "sdcounty");
      expect(sdJobs.length).toBeGreaterThan(0);
    });

    it("matches 'SD' to sdcounty jobs", () => {
      const results = searchJobs("SD");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.job.jurisdiction).toBe("sdcounty");
      });
    });

    it("matches 'Ventura' to ventura jobs", () => {
      const results = searchJobs("Ventura");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.job.jurisdiction).toBe("ventura");
      });
    });

    it("matches 'Kern' to kerncounty salary records", () => {
      // kerncounty only appears in salary data, not job descriptions
      // so a search for just "Kern" shouldn't match any jobs
      const results = searchJobs("Kern");
      expect(results).toEqual([]);
    });
  });

  // --- Combined title + jurisdiction ---

  describe("combined title and jurisdiction queries", () => {
    it("distinguishes Assistant Chief Probation Officer between San Bernardino and Ventura", () => {
      const sbResults = searchJobs("Assistant Chief Probation Officer San Bernardino");
      expect(sbResults[0].job.title).toBe("Assistant Chief Probation Officer");
      expect(sbResults[0].job.jurisdiction).toBe("sanbernardino");

      const venturaResults = searchJobs("Assistant Chief Probation Officer Ventura");
      expect(venturaResults[0].job.title).toBe("Assistant Chief Probation Officer");
      expect(venturaResults[0].job.jurisdiction).toBe("ventura");
    });

    it("matches 'Assistant Sheriff San Diego County'", () => {
      const results = searchJobs("Assistant Sheriff San Diego County");
      expect(results[0].job.title).toBe("Assistant Sheriff");
      expect(results[0].job.jurisdiction).toBe("sdcounty");
    });

    it("matches 'District Attorney San Bernardino'", () => {
      const results = searchJobs("District Attorney San Bernardino");
      expect(results[0].job.title).toBe("Assistant District Attorney");
      expect(results[0].job.jurisdiction).toBe("sanbernardino");
    });
  });

  // --- Job code matching ---

  describe("job code matching", () => {
    it("matches by exact job code '01297'", () => {
      const results = searchJobs("01297");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.code).toBe("01297");
    });

    it("matches by job code '09111'", () => {
      const results = searchJobs("09111");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.code).toBe("09111");
    });
  });

  // --- Salary data joining ---

  describe("salary data joining", () => {
    it("includes salary for San Bernardino Assistant Chief Probation Officer", () => {
      const results = searchJobs("Assistant Chief Probation Officer San Bernardino");
      const match = results[0];
      expect(match.salary).not.toBeNull();
      expect(match.salary!["Salary grade 1"]).toBe("$70.38");
      expect(match.salary!["Salary grade 2"]).toBe("$101.00");
    });

    it("includes salary for Ventura APCD Public Information Specialist", () => {
      const results = searchJobs("Apcd Public Information Specialist");
      const match = results[0];
      expect(match.salary).not.toBeNull();
      expect(match.salary!["Salary grade 1"]).toContain("3,119.39");
    });

    it("returns null salary when no matching salary record exists", () => {
      // The Assistant Sheriff (sdcounty, code 0265) has no salary in sdcounty
      // (the 0265 salary record is for kerncounty)
      const results = searchJobs("Assistant Sheriff San Diego");
      const match = results[0];
      expect(match.job.title).toBe("Assistant Sheriff");
      expect(match.salary).toBeNull();
    });
  });

  // --- maxResults parameter ---

  describe("maxResults parameter", () => {
    it("defaults to 3 results", () => {
      const results = searchJobs("assistant");
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("respects maxResults = 1", () => {
      const results = searchJobs("assistant", 1);
      expect(results.length).toBe(1);
    });

    it("respects maxResults = 5", () => {
      const results = searchJobs("assistant", 5);
      expect(results.length).toBeLessThanOrEqual(5);
      expect(results.length).toBeGreaterThan(3);
    });

    it("returns fewer than maxResults when not enough matches", () => {
      const results = searchJobs("meteorologist", 10);
      expect(results.length).toBe(1);
    });
  });

  // --- Score ordering ---

  describe("score ordering", () => {
    it("ranks exact title match above partial matches", () => {
      const results = searchJobs("Associate Meteorologist", 5);
      expect(results[0].job.title).toBe("Associate Meteorologist");
    });

    it("ranks results with more matching tokens higher", () => {
      const results = searchJobs("Assistant Chief Probation Officer", 5);
      // Both Assistant Chief Probation Officer positions should rank above
      // other "Assistant" jobs
      const topTitles = results.slice(0, 2).map((r) => r.job.title);
      expect(topTitles).toEqual([
        "Assistant Chief Probation Officer",
        "Assistant Chief Probation Officer",
      ]);
    });

    it("returns results in consistent ranked order", () => {
      const results = searchJobs("assistant san", 8);
      // First result should be most relevant — an "assistant" job in a "san" jurisdiction
      expect(results.length).toBeGreaterThan(1);
      const firstJob = results[0].job;
      expect(firstJob.title.toLowerCase()).toContain("assistant");
      expect(
        firstJob.jurisdiction === "sanbernardino" ||
          firstJob.jurisdiction === "sdcounty",
      ).toBe(true);
    });
  });

  // --- Nonsense queries ---

  describe("unrelated queries", () => {
    it("returns empty for completely unrelated terms", () => {
      const results = searchJobs("xylophone quantum blockchain");
      expect(results).toEqual([]);
    });

    it("returns results for partial matches even with noise", () => {
      const results = searchJobs("xylophone sheriff quantum");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].job.title).toBe("Assistant Sheriff");
    });
  });

  // --- Natural language queries (like a real user) ---

  describe("natural language queries", () => {
    it("handles 'What is the salary for the Assistant Chief Probation Officer in San Bernardino?'", () => {
      const results = searchJobs(
        "What is the salary for the Assistant Chief Probation Officer in San Bernardino?",
      );
      expect(results[0].job.title).toBe("Assistant Chief Probation Officer");
      expect(results[0].job.jurisdiction).toBe("sanbernardino");
    });

    it("handles 'Tell me about the Assistant Sheriff position in San Diego County'", () => {
      const results = searchJobs(
        "Tell me about the Assistant Sheriff position in San Diego County",
      );
      expect(results[0].job.title).toBe("Assistant Sheriff");
      expect(results[0].job.jurisdiction).toBe("sdcounty");
    });

    it("handles 'What are the knowledge skills and abilities for the Associate Meteorologist?'", () => {
      const results = searchJobs(
        "What are the knowledge skills and abilities for the Associate Meteorologist?",
      );
      expect(results[0].job.title).toBe("Associate Meteorologist");
    });

    it("handles 'How much does the Appraiser Trainee in Ventura make?'", () => {
      const results = searchJobs(
        "How much does the Appraiser Trainee in Ventura make?",
      );
      expect(results[0].job.title).toBe("Appraiser Trainee");
      expect(results[0].job.jurisdiction).toBe("ventura");
    });
  });
});
