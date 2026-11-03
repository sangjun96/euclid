import OpenAI from "openai";
import { langfuse, createTrace } from "./langfuse.js";

export * from "./langfuse.js";

const apiKey = process.env.OPENAI_API_KEY || "";

export const openai = new OpenAI({
  apiKey: apiKey || "dummy-key",
});

export interface GenerateOptions {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  userId?: string;
  taskId?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  traceId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateCompletion(
  options: GenerateOptions
): Promise<GenerateResult> {
  const model = options.model || "gpt-4o-mini";
  const systemPrompt =
    options.systemPrompt || "You are a helpful and concise assistant.";

  const trace = createTrace({
    name: "ai-completion-request",
    userId: options.userId,
    metadata: {
      taskId: options.taskId,
      model,
    },
    tags: ["euclid-app", "openai-sdk"],
  });

  const generation = trace.generation({
    name: "openai-chat-completion",
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: options.prompt },
    ],
  });

  const startTime = new Date();

  try {
    if (!apiKey || apiKey === "dummy-key" || apiKey.startsWith("sk-mock")) {
      // Mock response for quick DX when no OpenAI key is set yet
      const mockResponse = `[Mock Response for '${options.prompt}'] (Configure OPENAI_API_KEY in your .env to receive live OpenAI responses)`;

      generation.end({
        output: mockResponse,
        completionStartTime: startTime,
        usage: {
          promptTokens: 15,
          completionTokens: 25,
          totalTokens: 40,
        },
      });

      await langfuse.flushAsync();

      return {
        text: mockResponse,
        model,
        traceId: trace.id,
        usage: {
          promptTokens: 15,
          completionTokens: 25,
          totalTokens: 40,
        },
      };
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: options.prompt },
      ],
    });

    const completionText =
      response.choices[0]?.message?.content || "(Empty response)";

    generation.end({
      output: completionText,
      completionStartTime: startTime,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    });

    await langfuse.flushAsync();

    return {
      text: completionText,
      model,
      traceId: trace.id,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  } catch (error) {
    generation.end({
      level: "ERROR",
      statusMessage: (error as Error).message,
    });
    await langfuse.flushAsync();
    throw error;
  }
}
