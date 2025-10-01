/**
 * Tests for AIProviderFactory
 */

import { AIProviderFactory } from '../../../src/infrastructure/ai/AIProviderFactory';
import { AIProviderType } from '../../../src/domain/interfaces/IAIProvider';
import { AnthropicProvider } from '../../../src/infrastructure/ai/AnthropicProvider';
import { OpenAIProvider } from '../../../src/infrastructure/ai/OpenAIProvider';
import { NoAIProvider } from '../../../src/infrastructure/ai/NoAIProvider';

describe('AIProviderFactory', () => {
  describe('create', () => {
    it('should create AnthropicProvider when specified', () => {
      const provider = AIProviderFactory.create({
        provider: AIProviderType.ANTHROPIC,
        apiKey: 'test-key',
      });

      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.name).toBe('Anthropic Claude');
    });

    it('should create OpenAIProvider when specified', () => {
      const provider = AIProviderFactory.create({
        provider: AIProviderType.OPENAI,
        apiKey: 'test-key',
      });

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe('OpenAI GPT');
    });

    it('should create NoAIProvider when NONE specified', () => {
      const provider = AIProviderFactory.create({
        provider: AIProviderType.NONE,
      });

      expect(provider).toBeInstanceOf(NoAIProvider);
      expect(provider.name).toBe('No AI');
    });

    it('should create NoAIProvider by default', () => {
      const provider = AIProviderFactory.create({
        provider: 'invalid' as AIProviderType,
      });

      expect(provider).toBeInstanceOf(NoAIProvider);
    });
  });

  describe('createFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create AnthropicProvider when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const provider = AIProviderFactory.createFromEnv();

      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create OpenAIProvider when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const provider = AIProviderFactory.createFromEnv();

      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should prefer Anthropic when both keys are set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const provider = AIProviderFactory.createFromEnv();

      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create NoAIProvider when no keys are set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const provider = AIProviderFactory.createFromEnv();

      expect(provider).toBeInstanceOf(NoAIProvider);
    });
  });

  describe('provider availability', () => {
    it('should report AnthropicProvider as available with API key', () => {
      const provider = AIProviderFactory.create({
        provider: AIProviderType.ANTHROPIC,
        apiKey: 'test-key',
      });

      expect(provider.isAvailable()).toBe(true);
    });

    it('should report AnthropicProvider as unavailable without API key', () => {
      const provider = AIProviderFactory.create({
        provider: AIProviderType.ANTHROPIC,
      });

      expect(provider.isAvailable()).toBe(false);
    });

    it('should report NoAIProvider as always available', () => {
      const provider = AIProviderFactory.create({
        provider: AIProviderType.NONE,
      });

      expect(provider.isAvailable()).toBe(true);
    });
  });
});
