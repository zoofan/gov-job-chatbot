"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Markdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        let errorMsg = "Something went wrong. Please try again.";
        try {
          const errorBody = await res.json();
          if (errorBody.error) errorMsg = errorBody.error;
        } catch {
          errorMsg = (await res.text()) || errorMsg;
        }
        throw new Error(errorMsg);
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const errorMessage: Message = {
        role: "assistant",
        content: msg,
        isError: true,
      };
      setMessages((prev) => {
        // Replace empty assistant bubble
        if (
          prev.length > 0 &&
          prev[prev.length - 1].role === "assistant" &&
          prev[prev.length - 1].content === ""
        ) {
          const next = [...prev];
          next[next.length - 1] = errorMessage;
          return next;
        }
        return [...prev, errorMessage];
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold">HR Assistant</h1>
        <p className="text-sm opacity-50">
          Ask about job descriptions and salaries
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center opacity-40 mt-24 space-y-2">
            <p className="text-lg">Ask a question about jobs or salaries</p>
            <p className="text-sm">
              e.g. &quot;What is the salary for the Assistant Chief Probation
              Officer in San Bernardino?&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                msg.isError
                  ? "bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-md"
                  : msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md whitespace-pre-wrap"
                    : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" && !msg.isError ? (
                msg.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  isLoading && (
                    <span className="animate-pulse">Thinking...</span>
                  )
                )
              ) : (
                msg.content ||
                (isLoading && (
                  <span className="animate-pulse">Thinking...</span>
                ))
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a job or salary..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-full disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
