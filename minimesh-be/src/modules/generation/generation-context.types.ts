import { z } from 'zod';

export const TokenUsageSchema = z.object({
  estimatedInputTokens: z.number().int().min(0).optional(),
  estimatedOutputTokens: z.number().int().min(0).optional(),
  providerInputTokens: z.number().int().min(0).nullable().optional(),
  providerOutputTokens: z.number().int().min(0).nullable().optional(),
  contextBudgetTokens: z.number().int().min(1).optional(),
  contextBudgetPercent: z.number().min(0).max(100).optional(),
  usedProviderUsage: z.boolean().optional(),
});

export const ChatContextMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1200),
});

export const ChatContextSchema = z
  .object({
    compactSummary: z.string().trim().max(4000).nullable().optional(),
    recentMessages: z.array(ChatContextMessageSchema).max(12).default([]),
    selectedEntityName: z.string().trim().max(120).nullable().optional(),
    sceneName: z.string().trim().max(120).nullable().optional(),
  })
  .optional();

export const GenerationMemorySchema = z.object({
  compactSummary: z.string().max(4000).nullable().optional(),
  compactedAt: z.string().datetime().nullable().optional(),
  didCompact: z.boolean().default(false),
});

export const GenerationUsageSchema = TokenUsageSchema.extend({
  memory: GenerationMemorySchema.optional(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type ChatContext = z.infer<typeof ChatContextSchema>;
export type GenerationUsage = z.infer<typeof GenerationUsageSchema>;
