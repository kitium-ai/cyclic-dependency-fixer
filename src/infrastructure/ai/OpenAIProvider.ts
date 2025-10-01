/**
 * OpenAI GPT AI Provider Implementation
 */

import OpenAI from 'openai';
import {
  IAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
} from '../../domain/interfaces/IAIProvider';

export class OpenAIProvider implements IAIProvider {
  readonly name = 'OpenAI GPT';
  private client: OpenAI | null = null;

  constructor(private readonly apiKey?: string) {
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && !!this.client;
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.3,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt || this.getDefaultSystemPrompt(),
        },
        {
          role: 'user',
          content: request.prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed =
      (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

    return {
      content,
      tokensUsed,
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
