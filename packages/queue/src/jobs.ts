export const QUEUES = {
  AI_GENERATE: "ai-generate",
  SYSTEM_NOTIFICATION: "system-notification",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export interface AiGenerateJobPayload {
  taskId: string;
  prompt: string;
  model: string;
  userId?: string;
}

export interface SystemNotificationJobPayload {
  recipient: string;
  message: string;
  channel: "email" | "slack" | "in-app";
}

export interface JobPayloadMap {
  [QUEUES.AI_GENERATE]: AiGenerateJobPayload;
  [QUEUES.SYSTEM_NOTIFICATION]: SystemNotificationJobPayload;
}
