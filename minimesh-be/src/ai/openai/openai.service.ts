import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MiniMaxChatRequest,
  MiniMaxCompletion,
  MiniMaxMessage,
  MiniMaxTextProvider,
} from '../minimax/minimax.types';

interface OpenAIResponseContent {
  type?: string;
  text?: string;
}

interface OpenAIResponseOutput {
  type?: string;
  content?: OpenAIResponseContent[];
}

interface OpenAIResponsesApiResult {
  output_text?: string;
  output?: OpenAIResponseOutput[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

@Injectable()
export class OpenAIService implements MiniMaxTextProvider {
  private readonly apiKey: string | undefined;
  private readonly endpoint: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.endpoint = this.resolveEndpoint(
      this.configService.get<string>('OPENAI_BASE_URL'),
    );
    this.model =
      this.configService.get<string>('OPENAI_SCENE_MODEL') ?? 'gpt-5.4-mini';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: MiniMaxChatRequest): Promise<string> {
    const completion = await this.completeWithUsage(request);

    return completion.content;
  }

  async completeWithUsage(
    request: MiniMaxChatRequest,
  ): Promise<MiniMaxCompletion> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured.');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: request.messages.map((message) => ({
          role: this.normalizeRole(message),
          content: message.content,
        })),
        max_output_tokens: request.maxCompletionTokens ?? 4096,
        temperature: request.temperature ?? 0.6,
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `OpenAI request failed with HTTP ${response.status}.`,
      );
    }

    const data = (await response.json()) as OpenAIResponsesApiResult;

    if (data.error?.message) {
      throw new ServiceUnavailableException(data.error.message);
    }

    const content = this.extractText(data);

    if (!content) {
      throw new ServiceUnavailableException('OpenAI returned an empty response.');
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    };
  }

  private normalizeRole(
    message: MiniMaxMessage,
  ): 'system' | 'user' | 'assistant' {
    return message.role;
  }

  private extractText(data: OpenAIResponsesApiResult): string | undefined {
    if (typeof data.output_text === 'string' && data.output_text.trim()) {
      return data.output_text;
    }

    return data.output
      ?.flatMap((output) => output.content ?? [])
      .map((content) => content.text)
      .find((text): text is string => Boolean(text?.trim()));
  }

  private resolveEndpoint(baseUrl: string | undefined): string {
    if (!baseUrl) {
      return 'https://api.openai.com/v1/responses';
    }

    const trimmed = baseUrl.replace(/\/$/, '');

    if (trimmed.endsWith('/responses')) {
      return trimmed;
    }

    return `${trimmed}/v1/responses`;
  }
}
