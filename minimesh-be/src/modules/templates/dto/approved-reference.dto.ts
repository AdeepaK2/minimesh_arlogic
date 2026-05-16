import { z } from 'zod';
import { SceneFragmentSchema } from '../../../schemas/scene-fragment.schema';
import { SceneDocumentSchema } from '../../../schemas/scene.schema';

export const ApprovedReferenceRequestSchema = z
  .object({
    referenceType: z.enum(['fragment', 'scene']),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80).default('approved'),
    description: z.string().trim().min(1).max(600),
    tags: z.array(z.string().trim().min(1).max(40)).max(16).default([]),
    fragment: SceneFragmentSchema.optional(),
    scene: SceneDocumentSchema.optional(),
    sourceSceneId: z.string().uuid().optional(),
    sourceVersionId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.referenceType === 'fragment' && !value.fragment) {
      context.addIssue({
        code: 'custom',
        message: 'fragment is required when referenceType is fragment.',
        path: ['fragment'],
      });
    }

    if (value.referenceType === 'scene' && !value.scene) {
      context.addIssue({
        code: 'custom',
        message: 'scene is required when referenceType is scene.',
        path: ['scene'],
      });
    }
  });

export type ApprovedReferenceRequest = z.infer<
  typeof ApprovedReferenceRequestSchema
>;
