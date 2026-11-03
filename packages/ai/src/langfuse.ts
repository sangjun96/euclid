import { Langfuse } from "langfuse";

const publicKey = process.env.LANGFUSE_PUBLIC_KEY || "pk-lf-mock";
const secretKey = process.env.LANGFUSE_SECRET_KEY || "sk-lf-mock";
const baseUrl = process.env.LANGFUSE_BASE_URL || "http://localhost:3000";

export const langfuse = new Langfuse({
  publicKey,
  secretKey,
  baseUrl,
  enabled: process.env.LANGFUSE_ENABLED !== "false",
});

export interface CreateTraceOptions {
  name: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export function createTrace(options: CreateTraceOptions) {
  return langfuse.trace({
    name: options.name,
    userId: options.userId,
    metadata: options.metadata,
    tags: options.tags,
  });
}
