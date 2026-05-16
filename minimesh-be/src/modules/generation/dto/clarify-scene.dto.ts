import { z } from 'zod';
import { ChatContextSchema } from '../generation-context.types';

export const ClarifySceneRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
  chatContext: ChatContextSchema,
});

export type ClarifySceneRequest = z.infer<typeof ClarifySceneRequestSchema>;
