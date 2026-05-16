import { z } from 'zod';

export const GenerateSceneRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
});

export type GenerateSceneRequest = z.infer<typeof GenerateSceneRequestSchema>;
