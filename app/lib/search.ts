import { JobDescription, SalaryRecord } from "./types";
import { jobDescriptions, salaries, JURISDICTION_TOKENS } from "./data";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "of",
  "for",
  "and",
  "or",
  "to",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "with",
  "how",
  "much",
  "many",
  "about",
  "tell",
  "me",
  "please",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

interface InvertedIndex {
  tokenToJobs: Map<string, Set<number>>;
  salaryMap: Map<string, SalaryRecord>;
}

function buildIndex(): InvertedIndex {
  const tokenToJobs = new Map<string, Set<number>>();

  function addToken(token: string, jobIndex: number) {
    let set = tokenToJobs.get(token);
    if (!set) {
      set = new Set();
      tokenToJobs.set(token, set);
    }
    set.add(jobIndex);
  }

  // for every word, keep a list of jobs that contain that word
  jobDescriptions.forEach((job, i) => {
    for (const token of tokenize(job.title)) {
      addToken(token, i);
    }

    const jTokens =
      JURISDICTION_TOKENS[job.jurisdiction] || tokenize(job.jurisdiction);
    for (const token of jTokens) {
      addToken(token, i);
    }

    addToken(job.code.toLowerCase(), i);
  });

  // Salary lookup keyed by "jurisdiction:jobCode"
  const salaryMap = new Map<string, SalaryRecord>();
  for (const salary of salaries) {
    salaryMap.set(`${salary.Jurisdiction}:${salary["Job Code"]}`, salary);
  }

  return { tokenToJobs, salaryMap };
}

const index = buildIndex();

export interface SearchResult {
  job: JobDescription;
  salary: SalaryRecord | null;
  score: number;
}

export function searchJobs(query: string, maxResults = 3): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const jobScores = scoreJobsByRelevance(queryTokens);

  return getTopResults(jobScores, maxResults);
}

function scoreJobsByRelevance(queryTokens: string[]): Map<number, number> {
  const jobScores = new Map<number, number>();
  const totalJobs = jobDescriptions.length;

  for (const token of queryTokens) {
    const matchingJobIds = index.tokenToJobs.get(token);
    if (!matchingJobIds) continue;

    const rarityWeight = Math.log(totalJobs / matchingJobIds.size) + 1;

    for (const jobId of matchingJobIds) {
      const currentScore = jobScores.get(jobId) ?? 0;
      jobScores.set(jobId, currentScore + rarityWeight);
    }
  }

  return jobScores;
}

function getTopResults(
  jobScores: Map<number, number>,
  maxResults: number,
): SearchResult[] {
  const byScoreDescending = (
    [, a]: [number, number],
    [, b]: [number, number],
  ) => b - a;

  const rankedJobIds = [...jobScores.entries()]
    .sort(byScoreDescending)
    .map(([jobId]) => jobId);

  const topJobIds = rankedJobIds.slice(0, maxResults);

  return topJobIds.map(buildSearchResult);
}

function buildSearchResult(jobId: number): SearchResult {
  const job = jobDescriptions[jobId];
  const salaryKey = `${job.jurisdiction}:${job.code}`;
  const salary = index.salaryMap.get(salaryKey) ?? null;
  return { job, salary };
}
