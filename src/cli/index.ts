#!/usr/bin/env node

/**
 * CLI entry point for cyclic-dependency-fixer
 */

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
import { NodeFileSystem } from '../infrastructure/filesystem/NodeFileSystem';
import { JavaScriptParser } from '../infrastructure/parsers/JavaScriptParser';
import { TarjanCycleDetector } from '../infrastructure/graph/TarjanCycleDetector';
import { DynamicImportStrategy } from '../application/fix-strategies/DynamicImportStrategy';
import { ExtractSharedStrategy } from '../application/fix-strategies/ExtractSharedStrategy';
import { ResultFormatter } from './formatters/ResultFormatter';
import type { AnalysisConfig } from '../domain/models/types';
import { AIProviderFactory } from '../infrastructure/ai/AIProviderFactory';
import { AIProviderType } from '../domain/interfaces/IAIProvider';
import { getCycfixLogger } from '../logger';

// Load environment variables
loadEnv();

const program = new Command();
const logger = getCycfixLogger('cli');

const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

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
  .action(async (options) => {
    await runFix(options);
  });

async function runDetect(options: any): Promise<void> {
  const spinner = ora('Analyzing dependencies...').start();

  try {
    const rootDir = path.resolve(options.dir);
    const extensions = toList(options.extensions, DEFAULT_EXTENSIONS);
    const exclude = options.exclude ? toList(options.exclude, []) : [];

    logger.info('Running detect command', {
      rootDir,
      extensions,
      exclude,
      includeNodeModules: options.includeNodeModules,
    });

    const config: AnalysisConfig = {
      rootDir,
      extensions,
      exclude,
      includeNodeModules: options.includeNodeModules,
      maxDepth: parseInt(options.maxDepth, 10),
    };

    const fileSystem = new NodeFileSystem(rootDir);
    const parser = new JavaScriptParser(fileSystem);
    const cycleDetector = new TarjanCycleDetector();
    const detectUseCase = new DetectCyclesUseCase(fileSystem, parser, cycleDetector);

    const result = await detectUseCase.execute(config);

    spinner.stop();
    logger.info('Analysis finished', {
      cycles: result.cycles.length,
      totalModules: result.totalModules,
    });

    const formatter = new ResultFormatter();
    console.log(formatter.formatAnalysisResult(result, rootDir));

    if (result.cycles.length > 0) {
      console.log('');
      console.log(
        chalk.yellow(`💡 Tip: Run ${chalk.bold('cycfix fix')} to attempt automatic fixes`)
      );
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
    const extensions = toList(options.extensions, DEFAULT_EXTENSIONS);
    const exclude = options.exclude ? toList(options.exclude, []) : [];

    logger.info('Running fix command', {
      rootDir,
      extensions,
      exclude,
      dryRun: options.dryRun,
      auto: options.auto,
      ai: options.ai,
    });

    const config: AnalysisConfig = {
      rootDir,
      extensions,
      exclude,
      includeNodeModules: false,
      maxDepth: 50,
    };

    const fileSystem = new NodeFileSystem(rootDir);
    const parser = new JavaScriptParser(fileSystem);
    const cycleDetector = new TarjanCycleDetector();
    const detectUseCase = new DetectCyclesUseCase(fileSystem, parser, cycleDetector);

    spinner.text = 'Detecting cycles...';
    const analysisResult = await detectUseCase.execute(config);

    if (analysisResult.cycles.length === 0) {
      spinner.succeed(chalk.green('No circular dependencies found!'));
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
      config.extensions.map((ext) => `*${ext}`),
      config.exclude
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

    const formatter = new ResultFormatter();

    if (options.dryRun) {
      console.log(chalk.yellow('🔍 Dry Run Mode - No files will be modified'));
      console.log('');
    }

    console.log(formatter.formatAnalysisResult(analysisResult, rootDir));
    console.log('');
    console.log(chalk.bold('🔧 Fix Results'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');

    fixResults.forEach((result) => {
      console.log(formatter.formatFixResult(result, rootDir));
      console.log('');
    });

    console.log(formatter.formatSummary(analysisResult, fixResults));

    const anyManualRequired = fixResults.some((r) => !r.success);
    if (anyManualRequired) {
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
