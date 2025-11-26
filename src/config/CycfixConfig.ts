import type { PolicyConfig } from '../domain/policy/types';

export type OutputFormat = 'cli' | 'json' | 'sarif';

export type OutputConfig = {
  readonly format?: OutputFormat;
  readonly file?: string;
};

export type AiConfig = {
  readonly provider?: 'anthropic' | 'openai';
  readonly apiKey?: string;
};

export type CycfixConfig = {
  readonly analysis?: {
    readonly extensions?: readonly string[];
    readonly exclude?: readonly string[];
    readonly includeNodeModules?: boolean;
    readonly maxDepth?: number;
  };
  readonly ai?: AiConfig;
  readonly output?: OutputConfig;
  readonly policies?: PolicyConfig;
};
