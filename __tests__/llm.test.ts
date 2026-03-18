import { describe, it, expect } from "vitest";
import { LLMError } from "../app/lib/llm";

describe("LLMError", () => {
  it("is an instance of Error", () => {
    const err = new LLMError("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of LLMError", () => {
    const err = new LLMError("test");
    expect(err).toBeInstanceOf(LLMError);
  });

  it("sets the message correctly", () => {
    const err = new LLMError("something broke");
    expect(err.message).toBe("something broke");
  });

  it("sets the name to 'LLMError'", () => {
    const err = new LLMError("test");
    expect(err.name).toBe("LLMError");
  });

  it("stores statusCode when provided", () => {
    const err = new LLMError("rate limited", 429);
    expect(err.statusCode).toBe(429);
  });

  it("statusCode is undefined when not provided", () => {
    const err = new LLMError("generic error");
    expect(err.statusCode).toBeUndefined();
  });

  it("works with common HTTP status codes", () => {
    const cases = [
      { msg: "bad request", code: 400 },
      { msg: "unauthorized", code: 401 },
      { msg: "rate limited", code: 429 },
      { msg: "server error", code: 500 },
      { msg: "overloaded", code: 529 },
    ];
    for (const { msg, code } of cases) {
      const err = new LLMError(msg, code);
      expect(err.message).toBe(msg);
      expect(err.statusCode).toBe(code);
      expect(err.name).toBe("LLMError");
    }
  });

  it("can be caught as Error in try/catch", () => {
    try {
      throw new LLMError("catch me", 500);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(LLMError);
      expect((e as LLMError).statusCode).toBe(500);
    }
  });

  it("has a stack trace", () => {
    const err = new LLMError("with stack");
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("LLMError");
  });
});
