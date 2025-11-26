#!/usr/bin/env node

/**
 * CLI entry point for cyclic-dependency-fixer
 */

import { promises as fs } from 'fs';
import { config as loadEnv } from 'dotenv';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { compact, unique } from '@kitiumai/utils-ts';
import { DetectCyclesUseCase } from '../application/DetectCyclesUseCase';
import { FixCyclesUseCase } from '../application/FixCyclesUseCase';
import {
  AIEnhancedFixCyclesUseCase,
  type AIFixOptions,
} from '../application/AIEnhancedFixCyclesUseCase';
import { JsonReporter } from './reporters/JsonReporter';
import { SarifReporter } from './reporters/SarifReporter';
import { NodeFileSystem } from '../infrastructure/filesystem/NodeFileSystem';
import { JavaScriptParser } from '../infrastructure/parsers/JavaScriptParser';
import { TarjanCycleDetector } from '../infrastructure/graph/TarjanCycleDetector';
import { DynamicImportStrategy } from '../application/fix-strategies/DynamicImportStrategy';
import { ExtractSharedStrategy } from '../application/fix-strategies/ExtractSharedStrategy';
import { ResultFormatter } from './formatters/ResultFormatter';
import type { AnalysisConfig, AnalysisResult, FixResult } from '../domain/models/types';
import { AIProviderFactory } from '../infrastructure/ai/AIProviderFactory';
import { AIProviderType } from '../domain/interfaces/IAIProvider';
import { getCycfixLogger } from '../logger';
import { ConfigLoader } from '../config/ConfigLoader';
import type { CycfixConfig, OutputFormat } from '../config/CycfixConfig';
import { DependencyPolicyEnforcer } from '../domain/policy/DependencyPolicyEnforcer';
import type {
  DependencyBoundaryRule,
  PolicyConfig,
  PolicySeverity,
  PolicyViolation,
} from '../domain/policy/types';

// Load environment variables
loadEnv();

const program = new Command();
const logger = getCycfixLogger('cli');

const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const formatter = new ResultFormatter();
const jsonReporter = new JsonReporter();
const sarifReporter = new SarifReporter();

type OutputOptions = {
  readonly format: OutputFormat;
  readonly file?: string;
};

type PolicyOptions = {
  readonly failOnSeverity: PolicySeverity;
  readonly rules: readonly DependencyBoundaryRule[];
};

function toList(input: string | string[], fallback: readonly string[]): string[] {
  if (Array.isArray(input)) {
    return unique(compact(input.map((value) => value.trim())));
  }

  const source = input?.length ? input : fallback.join(',');
  return unique(compact(source.split(',').map((value) => value.trim())));
}

program
  .name('cycfix')
  .description('Detect and fix cyclic dependencies in JavaScript/TypeScript projects')
  .version('0.1.0');

program
  .command('detect')
  .description('Detect cyclic dependencies')
  .option('-d, --dir <directory>', 'Root directory to analyze', '.')
  .option(
    '-e, --extensions <extensions>',
    'File extensions to include (comma-separated)',
    '.js,.jsx,.ts,.tsx'
  )
  .option('-x, --exclude <patterns>', 'Patterns to exclude (comma-separated)', '')
  .option('--include-node-modules', 'Include node_modules in analysis', false)
  .option('--max-depth <depth>', 'Maximum depth for cycle detection', '50')
  .option('--config <path>', 'Path to cycfix.config.json file')
  .option('--format <format>', 'Report format (cli|json|sarif)', 'cli')
  .option('--output-file <path>', 'Write report to a file instead of stdout')
  .action(async (options) => {
    await runDetect(options);
  });

program
  .command('fix')
  .description('Detect and attempt to fix cyclic dependencies')
  .option('-d, --dir <directory>', 'Root directory to analyze', '.')
  .option(
    '-e, --extensions <extensions>',
    'File extensions to include (comma-separated)',
    '.js,.jsx,.ts,.tsx'
  )
  .option('-x, --exclude <patterns>', 'Patterns to exclude (comma-separated)', '')
  .option('--dry-run', 'Preview fixes without modifying files', false)
  .option('--no-backup', 'Do not create backup files', false)
  .option('--auto', 'Automatically apply fixes without confirmation', false)
  .option('--ai', 'Use AI-powered analysis and recommendations', false)
  .option('--ai-provider <provider>', 'AI provider (anthropic|openai)', 'anthropic')
  .option('--ai-key <key>', 'AI API key (or set ANTHROPIC_API_KEY/OPENAI_API_KEY env var)', '')
  .option('--explain', 'Generate AI-powered explanations', false)
  .option('--generate-code', 'Generate AI-powered refactoring code', false)
  .option('--config <path>', 'Path to cycfix.config.json file')
  .option('--format <format>', 'Report format (cli|json|sarif)', 'cli')
  .option('--output-file <path>', 'Write report to a file instead of stdout')
  .action(async (options) => {
    await runFix(options);
  });

async function runDetect(options: any): Promise<void> {
  const spinner = ora('Analyzing dependencies...').start();

  try {
    const rootDir = path.resolve(options.dir);
    const configLoader = new ConfigLoader(rootDir);
    const loadedConfig = await configLoader.load(options.config);
    const analysisConfig = resolveAnalysisConfig(rootDir, options, loadedConfig);
    const outputOptions = resolveOutputOptions(options.format, options.outputFile, loadedConfig);
    const policyOptions = resolvePolicyOptions(loadedConfig);

    logger.info('Running detect command', {
      rootDir,
      extensions: analysisConfig.extensions,
      exclude: analysisConfig.exclude,
      includeNodeModules: analysisConfig.includeNodeModules,
      outputFormat: outputOptions.format,
    });

    const fileSystem = new NodeFileSystem(rootDir);
    const parser = new JavaScriptParser(fileSystem);
    const cycleDetector = new TarjanCycleDetector();
    const detectUseCase = new DetectCyclesUseCase(fileSystem, parser, cycleDetector);

    const result = await detectUseCase.execute(analysisConfig);
    const policyViolations = new DependencyPolicyEnforcer(policyOptions.rules, rootDir).evaluate(
      result
    );

    spinner.stop();
    logger.info('Analysis finished', {
      cycles: result.cycles.length,
      totalModules: result.totalModules,
    });

    await renderDetectOutput({
      analysisResult: result,
      output: outputOptions,
      policyViolations,
      rootDir,
    });

    const hasCycles = result.cycles.length > 0;
    const policyFailure = shouldFailForPolicies(policyViolations, policyOptions.failOnSeverity);

    if (hasCycles || policyFailure) {
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    logger.error('Detect command failed', { error: error as Error });
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

async function runFix(options: any): Promise<void> {
  const spinner = ora('Analyzing dependencies...').start();

  try {
    const rootDir = path.resolve(options.dir);
    const configLoader = new ConfigLoader(rootDir);
    const loadedConfig = await configLoader.load(options.config);
    const analysisConfig = resolveAnalysisConfig(rootDir, options, loadedConfig);
    const outputOptions = resolveOutputOptions(options.format, options.outputFile, loadedConfig);
    const policyOptions = resolvePolicyOptions(loadedConfig);

    logger.info('Running fix command', {
      rootDir,
      extensions: analysisConfig.extensions,
      exclude: analysisConfig.exclude,
      dryRun: options.dryRun,
      auto: options.auto,
      ai: options.ai,
      outputFormat: outputOptions.format,
    });

    const fileSystem = new NodeFileSystem(rootDir);
    const parser = new JavaScriptParser(fileSystem);
    const cycleDetector = new TarjanCycleDetector();
    const detectUseCase = new DetectCyclesUseCase(fileSystem, parser, cycleDetector);

    spinner.text = 'Detecting cycles...';
    const analysisResult = await detectUseCase.execute(analysisConfig);
    const policyViolations = new DependencyPolicyEnforcer(policyOptions.rules, rootDir).evaluate(
      analysisResult
    );

    if (analysisResult.cycles.length === 0) {
      spinner.succeed(chalk.green('No circular dependencies found!'));
      await renderFixOutput({
        analysisResult,
        fixResults: [],
        policyViolations,
        rootDir,
        output: outputOptions,
        dryRun: options.dryRun,
      });

      const policyFailure = shouldFailForPolicies(policyViolations, policyOptions.failOnSeverity);
      if (policyFailure) {
        process.exit(1);
      }

      return;
    }

    spinner.text = 'Analyzing fix strategies...';

    const strategies = [new DynamicImportStrategy(), new ExtractSharedStrategy()];

    // Determine if AI should be used
    const useAI = options.ai || options.explain || options.generateCode;

    // Create AI provider if needed
    let aiProvider;
    if (useAI) {
      const providerType =
        options.aiProvider === 'openai' ? AIProviderType.OPENAI : AIProviderType.ANTHROPIC;

      if (options.aiKey) {
        aiProvider = AIProviderFactory.create({
          provider: providerType,
          apiKey: options.aiKey,
        });
      } else {
        aiProvider = AIProviderFactory.createFromEnv();
      }

      if (!aiProvider.isAvailable()) {
        spinner.warn(chalk.yellow('AI features requested but no API key configured'));
        console.log(
          chalk.yellow(
            'Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable, or use --ai-key'
          )
        );
        console.log('');
        aiProvider = AIProviderFactory.create({ provider: AIProviderType.NONE });
      } else {
        spinner.info(chalk.cyan(`🤖 AI-powered analysis enabled (${aiProvider.name})`));
        console.log('');
      }
    } else {
      aiProvider = AIProviderFactory.create({ provider: AIProviderType.NONE });
    }

    // Choose use case based on AI availability
    const fixUseCase =
      useAI && aiProvider.isAvailable()
        ? new AIEnhancedFixCyclesUseCase(fileSystem, strategies, aiProvider)
        : new FixCyclesUseCase(fileSystem, strategies);

    const fixOptions: AIFixOptions = {
      autoFix: options.auto,
      strategies: [],
      backup: options.backup !== false,
      dryRun: options.dryRun,
      useAI: useAI && aiProvider.isAvailable(),
      explainWithAI: options.explain && aiProvider.isAvailable(),
      generateCode: options.generateCode && aiProvider.isAvailable(),
    };

    const modules = new Map();
    const files = await fileSystem.glob(
      analysisConfig.extensions.map((ext) => `*${ext}`),
      analysisConfig.exclude
    );

    for (const file of files) {
      const content = await fileSystem.readFile(file);
      const module = await parser.parse(file, content);
      modules.set(file, module);
    }

    const fixResults = await fixUseCase.execute(analysisResult.cycles, modules, fixOptions);

    spinner.stop();
    logger.info('Fix command completed', {
      totalCycles: analysisResult.cycles.length,
      fixResults: fixResults.length,
      dryRun: options.dryRun,
    });

    await renderFixOutput({
      analysisResult,
      fixResults,
      policyViolations,
      rootDir,
      output: outputOptions,
      dryRun: options.dryRun,
    });

    const anyManualRequired = fixResults.some((r) => !r.success);
    const policyFailure = shouldFailForPolicies(policyViolations, policyOptions.failOnSeverity);
    if (anyManualRequired || policyFailure) {
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    logger.error('Fix command failed', { error: error as Error });
    console.error(chalk.red('Error:'), (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

program.parse();

function resolveAnalysisConfig(
  rootDir: string,
  cliOptions: any,
  config: CycfixConfig | null | undefined
): AnalysisConfig {
  const analysisConfig = config?.analysis ?? {};

  const extensions =
    // eslint-disable-next-line no-nested-ternary
    cliOptions.extensions !== undefined
      ? toList(cliOptions.extensions, DEFAULT_EXTENSIONS)
      : analysisConfig.extensions
        ? Array.from(analysisConfig.extensions)
        : [...DEFAULT_EXTENSIONS];

  const exclude =
    // eslint-disable-next-line no-nested-ternary
    cliOptions.exclude !== undefined
      ? toList(cliOptions.exclude, [])
      : analysisConfig.exclude
        ? Array.from(analysisConfig.exclude)
        : [];

  const includeNodeModules =
    typeof cliOptions.includeNodeModules === 'boolean'
      ? cliOptions.includeNodeModules
      : (analysisConfig.includeNodeModules ?? false);

  const maxDepth =
    cliOptions.maxDepth !== undefined
      ? parseInt(cliOptions.maxDepth, 10)
      : (analysisConfig.maxDepth ?? 50);

  return {
    rootDir,
    extensions,
    exclude,
    includeNodeModules,
    maxDepth,
  };
}

function resolveOutputOptions(
  cliFormat: string | undefined,
  cliFile: string | undefined,
  config: CycfixConfig | null | undefined
): OutputOptions {
  const format = ensureFormat(cliFormat ?? config?.output?.format ?? 'cli');
  const file = cliFile ?? config?.output?.file;

  return { format, file };
}

function ensureFormat(format: string): OutputFormat {
  if (format === 'json' || format === 'sarif') {
    return format;
  }
  return 'cli';
}

function resolvePolicyOptions(config: CycfixConfig | null | undefined): PolicyOptions {
  const policyConfig: PolicyConfig | undefined = config?.policies;

  return {
    failOnSeverity: policyConfig?.failOnSeverity ?? 'error',
    rules: policyConfig?.boundaries ?? [],
  };
}

function shouldFailForPolicies(
  violations: readonly PolicyViolation[],
  threshold: PolicySeverity
): boolean {
  if (violations.length === 0) {
    return false;
  }

  if (threshold === 'warn') {
    return violations.length > 0;
  }

  return violations.some((violation) => violation.severity === 'error');
}

async function emitReport(content: string, output: OutputOptions): Promise<void> {
  if (!output.file) {
    console.log(content);
    return;
  }

  const finalPath = path.isAbsolute(output.file)
    ? output.file
    : path.resolve(process.cwd(), output.file);

  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  await fs.writeFile(finalPath, content, 'utf-8');

  console.log(chalk.green(`Report written to ${finalPath}`));
}

async function renderDetectOutput({
  analysisResult,
  rootDir,
  output,
  policyViolations,
}: {
  analysisResult: AnalysisResult;
  rootDir: string;
  output: OutputOptions;
  policyViolations: readonly PolicyViolation[];
}): Promise<void> {
  if (output.format === 'cli') {
    console.log(formatter.formatAnalysisResult(analysisResult, rootDir, policyViolations));

    if (analysisResult.cycles.length > 0) {
      console.log('');
      console.log(
        chalk.yellow(`💡 Tip: Run ${chalk.bold('cycfix fix')} to attempt automatic fixes`)
      );
    }
    return;
  }

  const payload = {
    command: 'detect' as const,
    rootDir,
    analysis: analysisResult,
    policyViolations,
  };

  const content =
    output.format === 'json' ? jsonReporter.render(payload) : sarifReporter.render(payload);

  await emitReport(content, output);
}

async function renderFixOutput({
  analysisResult,
  fixResults,
  rootDir,
  output,
  policyViolations,
  dryRun,
}: {
  analysisResult: AnalysisResult;
  fixResults: readonly FixResult[];
  rootDir: string;
  output: OutputOptions;
  policyViolations: readonly PolicyViolation[];
  dryRun: boolean;
}): Promise<void> {
  if (output.format === 'cli') {
    if (dryRun) {
      console.log(chalk.yellow('🔍 Dry Run Mode - No files will be modified'));
      console.log('');
    }

    console.log(formatter.formatAnalysisResult(analysisResult, rootDir, policyViolations));

    console.log('');
    console.log(chalk.bold('🔧 Fix Results'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    fixResults.forEach((result) => {
      console.log(formatter.formatFixResult(result, rootDir));
      console.log('');
    });

    console.log(formatter.formatSummary(analysisResult, fixResults));

    return;
  }

  const payload = {
    command: 'fix' as const,
    rootDir,
    analysis: analysisResult,
    fixes: fixResults,
    policyViolations,
  };

  const content =
    output.format === 'json' ? jsonReporter.render(payload) : sarifReporter.render(payload);

  await emitReport(content, output);
}
