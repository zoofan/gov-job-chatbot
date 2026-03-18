import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMError } from "../app/lib/llm";

// Mock streamChat before importing the route
vi.mock("../app/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("../app/lib/llm")>(
    "../app/lib/llm",
  );
  return {
    ...actual,
    streamChat: vi.fn(),
  };
});

import { POST } from "../app/api/chat/route";
import { streamChat } from "../app/lib/llm";

const mockedStreamChat = vi.mocked(streamChat);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeStreamFromText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  // --- Validation ---

  describe("input validation", () => {
    it("returns 500 when ANTHROPIC_API_KEY is not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const req = makeRequest({ messages: [{ role: "user", content: "hi" }] });
      const res = await POST(req as never);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("ANTHROPIC_API_KEY");
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid JSON");
    });

    it("returns 400 when messages array is empty", async () => {
      const req = makeRequest({ messages: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("messages");
    });

    it("returns 400 when messages field is missing", async () => {
      const req = makeRequest({});
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("returns 400 when messages is not an array", async () => {
      const req = makeRequest({ messages: "not an array" });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });
  });

  // --- Successful requests ---

  describe("successful requests", () => {
    it("returns 200 with streamed response", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("Hello!"));
      const req = makeRequest({
        messages: [{ role: "user", content: "What is the salary for the Assistant Sheriff?" }],
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "text/plain; charset=utf-8",
      );

      const text = await res.text();
      expect(text).toBe("Hello!");
    });

    it("passes system prompt to streamChat", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("response"));
      const req = makeRequest({
        messages: [{ role: "user", content: "Assistant Sheriff" }],
      });
      await POST(req as never);

      expect(mockedStreamChat).toHaveBeenCalledOnce();
      const callArgs = mockedStreamChat.mock.calls[0][0];
      expect(callArgs.system).toContain("HR assistant");
      expect(callArgs.system).toContain("Assistant Sheriff");
    });

    it("includes relevant job data in system prompt for matching query", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("response"));
      const req = makeRequest({
        messages: [
          { role: "user", content: "Tell me about the Associate Meteorologist" },
        ],
      });
      await POST(req as never);

      const callArgs = mockedStreamChat.mock.calls[0][0];
      expect(callArgs.system).toContain("Associate Meteorologist");
      expect(callArgs.system).toContain("San Diego County");
    });

    it("includes salary data in system prompt when available", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("response"));
      const req = makeRequest({
        messages: [
          {
            role: "user",
            content: "What is the salary for Assistant Chief Probation Officer San Bernardino?",
          },
        ],
      });
      await POST(req as never);

      const callArgs = mockedStreamChat.mock.calls[0][0];
      expect(callArgs.system).toContain("$70.38");
      expect(callArgs.system).toContain("per hour");
    });

    it("passes all conversation messages to streamChat", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("response"));
      const messages = [
        { role: "user", content: "Tell me about the Assistant Sheriff" },
        { role: "assistant", content: "The Assistant Sheriff..." },
        { role: "user", content: "What about the salary?" },
      ];
      const req = makeRequest({ messages });
      await POST(req as never);

      const callArgs = mockedStreamChat.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3);
      expect(callArgs.messages[0].role).toBe("user");
      expect(callArgs.messages[2].role).toBe("user");
    });
  });

  // --- Search behavior ---

  describe("search behavior", () => {
    it("shows no matching records message for unrelated query", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("response"));
      const req = makeRequest({
        messages: [{ role: "user", content: "xylophone quantum" }],
      });
      await POST(req as never);

      const callArgs = mockedStreamChat.mock.calls[0][0];
      expect(callArgs.system).toContain("No matching job records");
    });

    it("uses fallback search combining recent messages for follow-ups", async () => {
      mockedStreamChat.mockResolvedValue(makeStreamFromText("response"));
      const req = makeRequest({
        messages: [
          { role: "user", content: "Tell me about the Assistant Sheriff in San Diego" },
          { role: "assistant", content: "The Assistant Sheriff..." },
          { role: "user", content: "What about the salary?" },
        ],
      });
      await POST(req as never);

      const callArgs = mockedStreamChat.mock.calls[0][0];
      // The fallback should combine "Tell me about the Assistant Sheriff in San Diego"
      // + "What about the salary?" and find the Assistant Sheriff
      expect(callArgs.system).toContain("Assistant Sheriff");
    });
  });

  // --- Error handling ---

  describe("error handling", () => {
    it("returns 500 with friendly message for LLMError", async () => {
      mockedStreamChat.mockRejectedValue(
        new LLMError("Rate limited", 429),
      );
      const req = makeRequest({
        messages: [{ role: "user", content: "hello" }],
      });
      const res = await POST(req as never);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Rate limited");
    });

    it("returns 500 with message for generic Error", async () => {
      mockedStreamChat.mockRejectedValue(new Error("network timeout"));
      const req = makeRequest({
        messages: [{ role: "user", content: "hello" }],
      });
      const res = await POST(req as never);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("network timeout");
    });

    it("returns 500 with fallback message for non-Error throw", async () => {
      mockedStreamChat.mockRejectedValue("string error");
      const req = makeRequest({
        messages: [{ role: "user", content: "hello" }],
      });
      const res = await POST(req as never);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("Something went wrong");
    });
  });
});
