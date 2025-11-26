/**
 * Abstraction for AI providers (Claude, GPT, etc.)
 * Follows Dependency Inversion Principle
 */

export type AIAnalysisRequest = {
  /** The prompt to send to the AI */
  readonly prompt: string;
  /** Maximum tokens for the response */
  readonly maxTokens?: number;
  /** Temperature for randomness (0-1) */
  readonly temperature?: number;
  /** System instructions */
  readonly systemPrompt?: string;
};

export type AIAnalysisResponse = {
  /** The AI's response text */
  readonly content: string;
  /** Tokens used in the request */
  readonly tokensUsed: number;
  /** Provider that generated the response */
  readonly provider: string;
};

export type IAIProvider = {
  /**
   * Get the provider name
   */
  readonly name: string;

  /**
   * Check if the provider is configured and available
   */
  isAvailable(): boolean;

  /**
   * Analyze code and provide AI insights
   */
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;

  /**
   * Generate code based on instructions
   */
  generateCode(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
};

/**
 * AI provider types
 */
export enum AIProviderType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  NONE = 'none',
}
