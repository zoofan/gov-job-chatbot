import { NextRequest } from "next/server";
import { searchJobs, SearchResult } from "../../lib/search";
import { JURISDICTION_DISPLAY } from "../../lib/data";
import { formatSalaryGrades } from "../../lib/salary";
import { streamChat, LLMError } from "../../lib/llm";

function buildContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "\n\nNo matching job records were found in the database for this query.";
  }

  const sections = results.map((r) => {
    const jurisdiction =
      JURISDICTION_DISPLAY[r.job.jurisdiction] || r.job.jurisdiction;
    let text = `--- Job Record ---\nTitle: ${r.job.title}\nJurisdiction: ${jurisdiction}\nJob Code: ${r.job.code}\n\n${r.job.description}`;
    if (r.salary) {
      text += `\n\nSalary Information: ${formatSalaryGrades(r.salary)}`;
    } else {
      text +=
        "\n\nSalary Information: No salary data available for this position.";
    }
    return text;
  });

  return "\n\nRelevant job data:\n\n" + sections.join("\n\n");
}

const SYSTEM_PROMPT_PREFIX = `You are an HR assistant that answers questions about job descriptions and salary information for government positions.

Rules:
- Answer based ONLY on the job data provided below. Do not make up information.
- If the data doesn't contain what the user is asking about, say so clearly.
- Be concise and helpful. Format salary information clearly.
- When discussing salaries, include the grade levels and amounts from the data.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the server." },
      { status: 500 },
    );
  }

  let body: { messages: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  // Search based on the latest user message
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserContent = userMessages[userMessages.length - 1]?.content || "";

  let results = searchJobs(lastUserContent);

  // Fallback: combine recent user messages for follow-up question context
  if (results.length === 0 && userMessages.length > 1) {
    const combined = userMessages
      .slice(-2)
      .map((m) => m.content)
      .join(" ");
    results = searchJobs(combined);
  }

  const systemPrompt = SYSTEM_PROMPT_PREFIX + buildContext(results);

  try {
    const readable = await streamChat({
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof LLMError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

    return Response.json({ error: message }, { status: 500 });
  }
}
