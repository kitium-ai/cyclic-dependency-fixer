/**
 * Fallback provider when AI is disabled
 */

import {
  IAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
} from '../../domain/interfaces/IAIProvider';

export class NoAIProvider implements IAIProvider {
  readonly name = 'No AI';

  isAvailable(): boolean {
    return true;
  }

  async analyze(_request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    return {
      content: 'AI analysis is disabled. Configure an AI provider to enable intelligent features.',
      tokensUsed: 0,
      provider: this.name,
    };
  }

  async generateCode(_request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    return {
      content: 'AI code generation is disabled. Configure an AI provider to enable this feature.',
      tokensUsed: 0,
      provider: this.name,
    };
  }
}
