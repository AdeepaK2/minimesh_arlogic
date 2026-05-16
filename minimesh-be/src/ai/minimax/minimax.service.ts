import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MiniMaxChatRequest,
  MiniMaxCompletion,
  MiniMaxTextProvider,
} from './minimax.types';

interface MiniMaxChoice {
  message?: {
    content?: string;
  };
}

interface MiniMaxResponse {
  choices?: MiniMaxChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

@Injectable()
export class MiniMaxService implements MiniMaxTextProvider {
  private readonly apiKey: string | undefined;
  private readonly endpoint: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MINIMAX_API_KEY');
    this.endpoint = this.resolveEndpoint(
      this.configService.get<string>('MINIMAX_BASE_URL'),
    );
    this.model =
      this.configService.get<string>('MINIMAX_MODEL') ?? 'MiniMax-M2.7';
  }

  async complete(request: MiniMaxChatRequest): Promise<string> {
    const completion = await this.completeWithUsage(request);

    return completion.content;
  }

  async completeWithUsage(
    request: MiniMaxChatRequest,
  ): Promise<MiniMaxCompletion> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'MINIMAX_API_KEY is not configured.',
      );
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        // MiniMax chatcompletion_v2: strip `name`, merge multiple system messages
        // into one (only a single system message is supported).
        messages: this.prepareMessages(request.messages),
        max_completion_tokens: request.maxCompletionTokens ?? 4096,
        temperature: request.temperature ?? 0.6,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `MiniMax request failed with HTTP ${response.status}.`,
      );
    }

    const data = (await response.json()) as MiniMaxResponse;
    const providerStatus = data.base_resp?.status_code ?? 0;

    if (providerStatus !== 0) {
      throw new ServiceUnavailableException(
        data.base_resp?.status_msg ?? 'MiniMax returned an error.',
      );
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new ServiceUnavailableException(
        'MiniMax returned an empty response.',
      );
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      },
    };
  }

  /**
   * MiniMax chatcompletion_v2 limitations:
   * - Does not accept the `name` field on messages.
   * - Only supports a single system message.
   * This method strips `name` and merges all consecutive / scattered system
   * messages into one block separated by a divider.
   */
  private prepareMessages(
    messages: MiniMaxChatRequest['messages'],
  ): Array<{ role: string; content: string }> {
    const systemParts: string[] = [];
    const rest: Array<{ role: string; content: string }> = [];

    for (const { role, content } of messages) {
      if (role === 'system') {
        systemParts.push(content);
      } else {
        rest.push({ role, content });
      }
    }

    const merged: Array<{ role: string; content: string }> = [];
    if (systemParts.length > 0) {
      merged.push({ role: 'system', content: systemParts.join('\n\n') });
    }
    merged.push(...rest);
    return merged;
  }

  private resolveEndpoint(baseUrl: string | undefined): string {
    if (!baseUrl) {
      return 'https://api.minimax.io/v1/text/chatcompletion_v2';
    }

    const trimmed = baseUrl.replace(/\/$/, '');

    if (trimmed.includes('/text/chatcompletion_v2')) {
      return trimmed;
    }

    return `${trimmed}/v1/text/chatcompletion_v2`;
  }
}
