import type { GenerationUsage } from '../generation/generation-context.types';

/** Sum provider or estimated tokens; uses a modest floor when the model omitted usage figures. */
export function tallyGenerationTokens(usage?: GenerationUsage): number {
  if (!usage) {
    return 2048;
  }

  const input =
    typeof usage.providerInputTokens === 'number' && usage.providerInputTokens >= 0
      ? usage.providerInputTokens
      : (usage.estimatedInputTokens ?? 0);

  const output =
    typeof usage.providerOutputTokens === 'number' && usage.providerOutputTokens >= 0
      ? usage.providerOutputTokens
      : (usage.estimatedOutputTokens ?? 0);

  let total = Math.floor(Math.max(0, input) + Math.max(0, output));
  if (total <= 0) {
    total = 512;
  }
  return total;
}
