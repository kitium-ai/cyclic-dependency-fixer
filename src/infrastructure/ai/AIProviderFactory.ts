/**
 * Factory for creating AI providers based on configuration
 * Follows Factory Pattern
 */

import { IAIProvider, AIProviderType } from '../../domain/interfaces/IAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { NoAIProvider } from './NoAIProvider';

export interface AIConfig {
  readonly provider: AIProviderType;
  readonly apiKey?: string;
}

export class AIProviderFactory {
  static create(config: AIConfig): IAIProvider {
    switch (config.provider) {
      case AIProviderType.ANTHROPIC:
        return new AnthropicProvider(config.apiKey);

      case AIProviderType.OPENAI:
        return new OpenAIProvider(config.apiKey);

      case AIProviderType.NONE:
      default:
        return new NoAIProvider();
    }
  }

  static createFromEnv(): IAIProvider {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      return new AnthropicProvider(anthropicKey);
    }

    if (openaiKey) {
      return new OpenAIProvider(openaiKey);
    }

    return new NoAIProvider();
  }
}
