import { ChatMessage } from "./types";
import { streamAnthropic } from "./providers/anthropic";

export interface LLMStreamOptions {
  system: string;
  messages: ChatMessage[];
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export const streamChat = streamAnthropic;
