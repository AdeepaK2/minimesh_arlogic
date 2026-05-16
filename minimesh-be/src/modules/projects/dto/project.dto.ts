import { z } from 'zod';

export const CreateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional(),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(600).nullable().optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
