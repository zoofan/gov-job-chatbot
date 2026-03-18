import Anthropic from "@anthropic-ai/sdk";
import { LLMError, LLMStreamOptions } from "../llm";

const client = new Anthropic();

export async function streamAnthropic({
  system,
  messages,
}: LLMStreamOptions): Promise<ReadableStream<Uint8Array>> {
  try {
    const stream = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIError) {
      const status = error.status;
      if (status === 401) {
        throw new LLMError(
          "Invalid API key. Check your ANTHROPIC_API_KEY in .env.local.",
          status,
        );
      } else if (status === 400 && error.message?.includes("credit")) {
        throw new LLMError(
          "Your Anthropic API credit balance is too low. Please add credits at console.anthropic.com.",
          status,
        );
      } else if (status === 429) {
        throw new LLMError(
          "Rate limited by the API. Please wait a moment and try again.",
          status,
        );
      } else if (status === 529 || status === 503) {
        throw new LLMError(
          "The API is temporarily overloaded. Please try again shortly.",
          status,
        );
      } else {
        throw new LLMError(`API error: ${error.message}`, status);
      }
    }
    throw error;
  }
}
