import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MiniMaxChatRequest, MiniMaxTextProvider } from './minimax.types';

interface MiniMaxChoice {
  message?: {
    content?: string;
  };
}

interface MiniMaxResponse {
  choices?: MiniMaxChoice[];
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
        messages: request.messages,
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

    return content;
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
