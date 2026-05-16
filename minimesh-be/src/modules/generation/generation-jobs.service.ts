import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MINIMAX_TEXT_PROVIDER,
  type MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import { OpenAIService } from '../../ai/openai/openai.service';
import type { SceneDocument } from '../../schemas/scene.schema';
import { GenerationService } from './generation.service';
import type {
  CandidateResult,
  GenerationJobRequest,
  GenerationJobResponse,
  GenerationJobResult,
  GenerationJobReview,
  GenerationJobStep,
} from './generation-job.types';

interface StoredJob extends GenerationJobResponse {
  request: GenerationJobRequest;
}

interface ScoredCandidate {
  candidate: 'candidateA' | 'candidateB';
  result?: GenerationJobResult;
  score: number;
  valid: boolean;
  issues: string[];
}

const JOB_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GenerationJobsService {
  private readonly jobs = new Map<string, StoredJob>();

  constructor(
    private readonly generationService: GenerationService,
    @Inject(MINIMAX_TEXT_PROVIDER)
    private readonly miniMaxProvider: MiniMaxTextProvider,
    @Optional()
    private readonly openAIService?: OpenAIService,
  ) {}

  createJob(request: GenerationJobRequest): GenerationJobResponse {
    this.pruneExpiredJobs();

    const now = new Date().toISOString();
    const job: StoredJob = {
      jobId: randomUUID(),
      action: request.action,
      status: 'queued',
      steps: this.createSteps(now),
      request,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.jobId, job);
    void this.runJob(job.jobId);

    return this.toResponse(job);
  }

  getJob(jobId: string): GenerationJobResponse | undefined {
    this.pruneExpiredJobs();

    const job = this.jobs.get(jobId);

    return job ? this.toResponse(job) : undefined;
  }

  private async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return;
    }

    try {
      this.updateJob(job, { status: 'running' });
      this.startStep(job, 'context', 'Building scene context');
      this.finishStep(job, 'context');

      this.startStep(job, 'candidates', 'Running scene agents');
      const candidates = await this.runCandidates(job.request);
      this.finishStep(job, 'candidates');

      this.startStep(job, 'validation', 'Checking candidate scenes');
      const scored = candidates.map((candidate) =>
        this.scoreCandidate(candidate, job.request),
      );
      this.finishStep(job, 'validation');

      this.startStep(job, 'review', 'Reviewing scene quality');
      const selected = await this.selectCandidate(scored, job.request);
      this.finishStep(job, 'review');

      if (!selected.result) {
        const issues = scored.flatMap((candidate) => candidate.issues);
        throw new Error(
          issues.length > 0
            ? issues.join(' ')
            : 'No candidate scene could be generated.',
        );
      }

      this.startStep(job, 'final', 'Preparing final scene');
      this.finishStep(job, 'final');

      this.updateJob(job, {
        status: 'succeeded',
        result: selected.result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Generation job failed.';

      this.failActiveStep(job, message);
      this.updateJob(job, {
        status: 'failed',
        error: message,
      });
    }
  }

  private async runCandidates(
    request: GenerationJobRequest,
  ): Promise<CandidateResult[]> {
    const providers: Array<{
      candidate: 'candidateA' | 'candidateB';
      provider: MiniMaxTextProvider;
    }> = [
      {
        candidate: 'candidateA',
        provider: this.miniMaxProvider,
      },
    ];

    if (this.openAIService?.isConfigured()) {
      providers.push({
        candidate: 'candidateB',
        provider: this.openAIService,
      });
    }

    return Promise.all(
      providers.map(async ({ candidate, provider }) => {
        try {
          const result = await this.runGeneration(request, provider);

          return {
            candidate,
            result,
            usage: result.usage,
          };
        } catch (error) {
          return {
            candidate,
            error:
              error instanceof Error
                ? error.message
                : 'Candidate generation failed.',
          };
        }
      }),
    );
  }

  private async runGeneration(
    request: GenerationJobRequest,
    provider: MiniMaxTextProvider,
  ) {
    if (request.action === 'generate' && request.prompt) {
      return this.generationService.generateScene(
        request.prompt,
        request.chatContext,
        provider,
      );
    }

    if (
      request.action === 'edit-scene' &&
      request.scene &&
      request.instruction
    ) {
      return this.generationService.editScene(
        request.scene,
        request.instruction,
        request.chatContext,
        provider,
      );
    }

    if (
      request.action === 'refine-entity' &&
      request.scene &&
      request.entityId &&
      request.instruction
    ) {
      return this.generationService.refineEntity(
        request.scene,
        request.entityId,
        request.instruction,
        request.chatContext,
        provider,
      );
    }

    throw new Error('Invalid generation job request.');
  }

  private scoreCandidate(
    candidate: CandidateResult,
    request: GenerationJobRequest,
  ): ScoredCandidate {
    if (!candidate.result) {
      return {
        candidate: candidate.candidate,
        score: 0,
        valid: false,
        issues: [candidate.error ?? 'Candidate failed.'],
      };
    }

    const scene = candidate.result.scene;
    const prompt = request.prompt ?? request.instruction ?? '';
    const coverage = this.scorePromptCoverage(scene, prompt);
    const objectScore = Math.min(scene.objects.length, 36);
    const entityScore = Math.min(scene.entities?.length ?? 0, 12) * 2;
    const lightScore = Math.min(scene.lights.length, 4) * 3;
    const warningPenalty = candidate.result.warnings.length * 2;
    const score =
      50 + coverage + objectScore + entityScore + lightScore - warningPenalty;

    return {
      candidate: candidate.candidate,
      result: {
        ...candidate.result,
        review: {
          selectedCandidate: candidate.candidate,
          candidateCount: 1,
          scores: [],
          judge: 'heuristic',
        },
      },
      score,
      valid: true,
      issues: [],
    };
  }

  private async selectCandidate(
    scored: ScoredCandidate[],
    request: GenerationJobRequest,
  ): Promise<ScoredCandidate> {
    const valid = scored.filter((candidate) => candidate.valid);

    if (valid.length === 0) {
      return scored[0];
    }

    const sorted = [...valid].sort((a, b) => b.score - a.score);
    let selected = sorted[0];
    let judge: GenerationJobReview['judge'] = 'heuristic';

    if (
      sorted.length > 1 &&
      Math.abs(sorted[0].score - sorted[1].score) <= 5 &&
      this.openAIService?.isConfigured()
    ) {
      const judgedCandidate = await this.judgeCloseCandidates(sorted, request);

      if (judgedCandidate) {
        selected = judgedCandidate;
        judge = 'gpt-5.4-mini';
      }
    }

    const review: GenerationJobReview = {
      selectedCandidate: selected.candidate,
      candidateCount: scored.length,
      judge,
      scores: scored.map((candidate) => ({
        candidate: candidate.candidate,
        score: Math.round(candidate.score),
        valid: candidate.valid,
        issues: candidate.issues,
      })),
    };

    if (selected.result) {
      selected.result = {
        ...selected.result,
        review,
      };
    }

    return selected;
  }

  private async judgeCloseCandidates(
    candidates: ScoredCandidate[],
    request: GenerationJobRequest,
  ): Promise<ScoredCandidate | undefined> {
    if (!this.openAIService) {
      return undefined;
    }

    const prompt = request.prompt ?? request.instruction ?? '';
    const summary = candidates
      .filter((candidate) => candidate.result)
      .map((candidate) => ({
        candidate: candidate.candidate,
        score: Math.round(candidate.score),
        scene: this.summarizeScene(candidate.result?.scene),
      }));

    try {
      const response = await this.openAIService.complete({
        messages: [
          {
            role: 'system',
            name: 'MiniMeshQualityJudge',
            content:
              'Choose the stronger MiniMesh scene candidate. Return only candidateA or candidateB.',
          },
          {
            role: 'user',
            name: 'user',
            content: `User request: ${prompt}

Candidates:
${JSON.stringify(summary, null, 2)}

Choose the candidate that best follows the request, preserves scene context, and has coherent scale/composition.`,
          },
        ],
        maxCompletionTokens: 16,
        temperature: 0,
      });
      const selectedCandidate = response.includes('candidateB')
        ? 'candidateB'
        : response.includes('candidateA')
          ? 'candidateA'
          : undefined;

      return selectedCandidate
        ? candidates.find((candidate) => candidate.candidate === selectedCandidate)
        : undefined;
    } catch {
      return undefined;
    }
  }

  private scorePromptCoverage(scene: SceneDocument, prompt: string): number {
    const tokens = prompt
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3)
      .slice(0, 24);

    if (tokens.length === 0) {
      return 0;
    }

    const sceneText = `${scene.sceneName} ${scene.description ?? ''} ${scene.objects
      .map((object) => `${object.name} ${object.role ?? ''}`)
      .join(' ')} ${(scene.entities ?? [])
      .map((entity) => `${entity.name} ${entity.description ?? ''}`)
      .join(' ')}`.toLowerCase();
    const hits = tokens.filter((token) => sceneText.includes(token)).length;

    return Math.round((hits / tokens.length) * 30);
  }

  private summarizeScene(scene: SceneDocument | undefined) {
    if (!scene) {
      return undefined;
    }

    return {
      sceneName: scene.sceneName,
      description: scene.description,
      objectCount: scene.objects.length,
      entityCount: scene.entities?.length ?? 0,
      lightCount: scene.lights.length,
      objects: scene.objects.slice(0, 20).map((object) => ({
        id: object.id,
        name: object.name,
        type: object.type,
        scale: object.scale,
        position: object.position,
      })),
      entities: (scene.entities ?? []).slice(0, 12).map((entity) => ({
        id: entity.id,
        name: entity.name,
        objectIds: entity.objectIds,
      })),
    };
  }

  private createSteps(createdAt: string): GenerationJobStep[] {
    return [
      ['context', 'Preparing context'],
      ['candidates', 'Generating candidate scenes'],
      ['validation', 'Checking structure and scale'],
      ['review', 'Reviewing quality'],
      ['final', 'Refining final scene'],
    ].map(([id, label]) => ({
      id,
      label,
      status: 'pending',
      createdAt,
    }));
  }

  private startStep(job: StoredJob, stepId: string, detail?: string): void {
    this.updateStep(job, stepId, {
      status: 'running',
      detail,
    });
  }

  private finishStep(job: StoredJob, stepId: string): void {
    this.updateStep(job, stepId, {
      status: 'succeeded',
      completedAt: new Date().toISOString(),
    });
  }

  private failActiveStep(job: StoredJob, detail: string): void {
    const running = job.steps.find((step) => step.status === 'running');

    if (!running) {
      return;
    }

    this.updateStep(job, running.id, {
      status: 'failed',
      detail,
      completedAt: new Date().toISOString(),
    });
  }

  private updateStep(
    job: StoredJob,
    stepId: string,
    patch: Partial<GenerationJobStep>,
  ): void {
    job.steps = job.steps.map((step) =>
      step.id === stepId ? { ...step, ...patch } : step,
    );
    job.updatedAt = new Date().toISOString();
  }

  private updateJob(
    job: StoredJob,
    patch: Partial<Pick<StoredJob, 'status' | 'result' | 'error'>>,
  ): void {
    Object.assign(job, patch);
    job.updatedAt = new Date().toISOString();
  }

  private pruneExpiredJobs(): void {
    const now = Date.now();

    for (const [jobId, job] of this.jobs.entries()) {
      if (now - Date.parse(job.updatedAt) > JOB_TTL_MS) {
        this.jobs.delete(jobId);
      }
    }
  }

  private toResponse(job: StoredJob): GenerationJobResponse {
    const { request: _request, ...response } = job;

    return response;
  }
}
