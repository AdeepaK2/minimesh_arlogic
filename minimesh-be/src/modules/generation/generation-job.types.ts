import type { SceneDocument } from '../../schemas/scene.schema';
import type { LogicalGltfDocument } from '../../schemas/logical-gltf.schema';
import type { ChatContext, GenerationUsage } from './generation-context.types';
import type { GenerateSceneResult } from './generation.service';

export type GenerationJobAction = 'generate' | 'edit-scene' | 'refine-entity';
export type GenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type GenerationJobStepStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed';

export interface GenerationJobStep {
  id: string;
  label: string;
  status: GenerationJobStepStatus;
  detail?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GenerationJobReview {
  selectedCandidate: 'candidateA' | 'candidateB';
  candidateCount: number;
  scores: Array<{
    candidate: 'candidateA' | 'candidateB';
    score: number;
    valid: boolean;
    issues: string[];
  }>;
  judge?: 'heuristic' | 'gpt-5.4';
}

export interface GenerationJobResult extends GenerateSceneResult {
  review: GenerationJobReview;
}

export interface GenerationJobResponse {
  jobId: string;
  action: GenerationJobAction;
  status: GenerationJobStatus;
  steps: GenerationJobStep[];
  result?: GenerationJobResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJobRequest {
  action: GenerationJobAction;
  prompt?: string;
  instruction?: string;
  scene?: SceneDocument;
  /** Optional: pass the stored logical glTF to use the glTF edit path. */
  logicalGltf?: LogicalGltfDocument;
  entityId?: string;
  chatContext?: ChatContext;
}

export interface CandidateResult {
  candidate: 'candidateA' | 'candidateB';
  result?: GenerateSceneResult;
  error?: string;
  usage?: GenerationUsage;
}
