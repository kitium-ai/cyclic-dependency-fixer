/**
 * Anthropic Claude AI Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  IAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
} from '../../domain/interfaces/IAIProvider';

export class AnthropicProvider implements IAIProvider {
  readonly name = 'Anthropic Claude';
  private client: Anthropic | null = null;

  constructor(private readonly apiKey?: string) {
    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && !!this.client;
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.3,
      system: request.systemPrompt || this.getDefaultSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
    });

    const content = message.content[0];
    const textContent = content.type === 'text' ? content.text : '';

    return {
      content: textContent,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      provider: this.name,
    };
  }

  async generateCode(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const codeRequest = {
      ...request,
      systemPrompt:
        request.systemPrompt ||
        'You are an expert TypeScript developer. Generate clean, type-safe code following SOLID principles.',
    };

    return this.analyze(codeRequest);
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert software architect specializing in code quality and dependency management.
Your role is to analyze circular dependencies and provide intelligent, context-aware recommendations for fixing them.
Focus on:
1. Understanding the root cause of circular dependencies
2. Recommending the most appropriate fix strategy
3. Providing specific, actionable refactoring steps
4. Considering the overall architecture and patterns in the codebase
5. Ensuring type safety and following SOLID principles`;
  }
}
