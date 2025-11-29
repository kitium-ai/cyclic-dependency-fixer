/**
 * Format analysis and fix results for CLI output
 */

import * as path from 'path';
import chalk from 'chalk';
import type { AnalysisResult, Cycle, FixResult } from '../../domain/models/types';
import type { PolicyViolation } from '../../domain/policy/types';

export class ResultFormatter {
  formatAnalysisResult(
    result: AnalysisResult,
    rootDir: string,
    policyViolations: readonly PolicyViolation[] = []
  ): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold('📊 Analysis Results'));
    lines.push(chalk.gray('─'.repeat(50)));
    lines.push('');

    // Summary
    lines.push(`Total modules analyzed: ${chalk.cyan(result.totalModules.toString())}`);
    lines.push(`Analysis duration: ${chalk.cyan(result.duration.toString())}ms`);
    lines.push('');

    if (result.isPartial) {
      lines.push(chalk.yellow('⚠️  Partial results — some files could not be analyzed.'));
    }

    if (result.warnings?.length) {
      lines.push(chalk.bold('⚠️ Analysis warnings'));
      result.warnings.forEach((warning) => {
        const location = warning.file ? ` (${path.relative(rootDir, warning.file)})` : '';
        lines.push(chalk.yellow(`- ${warning.message}${location}`));
      });
      lines.push('');
    }

    if (result.metrics) {
      lines.push(chalk.gray(`Parser: ${result.metrics.parser}`));
      lines.push(chalk.gray(`Cached modules: ${result.metrics.cachedModules}`));
      lines.push('');
    }

    if (result.cycles.length === 0) {
      lines.push(chalk.green('✓ No circular dependencies found!'));
      return lines.join('\n');
    }

    // Cycles found
    lines.push(
      chalk.red(
        `✗ Found ${chalk.bold(result.cycles.length.toString())} circular ${result.cycles.length === 1 ? 'dependency' : 'dependencies'}`
      )
    );
    lines.push(`Affected modules: ${chalk.yellow(result.affectedModules.length.toString())}`);
    lines.push('');

    // Detail each cycle
    result.cycles.forEach((cycle, index) => {
      lines.push(this.formatCycle(cycle, index + 1, rootDir));
      lines.push('');
    });

    if (policyViolations.length > 0) {
      lines.push(chalk.bold('🚫 Policy Violations'));
      lines.push(chalk.gray('─'.repeat(50)));
      lines.push('');

      policyViolations.forEach((violation, index) => {
        lines.push(
          `${chalk.yellow(`${index + 1}.`)} ${violation.message} (${violation.severity.toUpperCase()})`
        );

        if (violation.description) {
          lines.push(chalk.gray(`   ${violation.description}`));
        }

        if (violation.recommendedStrategies?.length) {
          lines.push(
            chalk.gray(`   Suggested strategies: ${violation.recommendedStrategies.join(', ')}`)
          );
        }
      });
    }

    return lines.join('\n');
  }

  formatCycle(cycle: Cycle, index: number, rootDir: string): string {
    const lines: string[] = [];

    lines.push(chalk.bold.red(`Cycle #${index} (${cycle.id})`));

    // Show the path
    const cyclePath = cycle.paths.slice(0, -1); // Remove duplicate last element
    cyclePath.forEach((modulePath, i) => {
      const relative = path.relative(rootDir, modulePath);
      const arrow = i < cyclePath.length - 1 ? ' → ' : ' ⤴ ';
      const color = i === 0 ? chalk.yellow : chalk.white;
      lines.push(`  ${color(relative)}${chalk.gray(arrow)}`);
    });

    // Show import details
    lines.push('');
    lines.push(chalk.gray('  Import details:'));
    cycle.edges.forEach((edge) => {
      const fromFile = path.relative(rootDir, edge.from);
      const toFile = path.relative(rootDir, edge.to);
      lines.push(chalk.gray(`    ${fromFile}:${edge.importInfo.line} imports ${toFile}`));
    });

    return lines.join('\n');
  }

  formatFixResult(result: FixResult, rootDir: string): string {
    const lines: string[] = [];

    if (result.success) {
      lines.push(chalk.green(`✓ Successfully fixed cycle ${result.cycle.id}`));
      lines.push(chalk.gray(`  Strategy: ${result.strategy}`));

      if (result.modifiedFiles.length > 0) {
        lines.push(chalk.gray('  Modified files:'));
        result.modifiedFiles.forEach((file) => {
          const relative = path.relative(rootDir, file);
          lines.push(chalk.gray(`    - ${relative}`));
        });
      }

      if (result.createdFiles.length > 0) {
        lines.push(chalk.gray('  Created files:'));
        result.createdFiles.forEach((file) => {
          const relative = path.relative(rootDir, file);
          lines.push(chalk.gray(`    - ${relative}`));
        });
      }
    } else {
      lines.push(chalk.yellow(`⚠ Could not auto-fix cycle ${result.cycle.id}`));
      lines.push(chalk.gray(`  Strategy attempted: ${result.strategy}`));

      if (result.error) {
        lines.push(chalk.red(`  Error: ${result.error}`));
      }

      if (result.manualSteps && result.manualSteps.length > 0) {
        lines.push('');
        lines.push(chalk.bold('  📝 Manual steps to fix:'));
        result.manualSteps.forEach((step, index) => {
          lines.push('');
          lines.push(chalk.cyan(`  ${index + 1}. ${step.description}`));
          const relative = path.relative(rootDir, step.file);
          lines.push(chalk.gray(`     File: ${relative}`));

          if (step.line) {
            lines.push(chalk.gray(`     Line: ${step.line}`));
          }

          if (step.code) {
            lines.push('');
            step.code.split('\n').forEach((line) => {
              lines.push(chalk.gray(`     ${line}`));
            });
          }
        });
      }
    }

    return lines.join('\n');
  }

  formatSummary(analysisResult: AnalysisResult, fixResults: readonly FixResult[]): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold('📈 Summary'));
    lines.push(chalk.gray('─'.repeat(50)));

    const successful = fixResults.filter((r) => r.success).length;
    const failed = fixResults.filter((r) => !r.success).length;

    lines.push(`Total cycles found: ${chalk.cyan(analysisResult.cycles.length.toString())}`);
    lines.push(`Auto-fixed: ${chalk.green(successful.toString())}`);
    lines.push(`Requires manual fix: ${chalk.yellow(failed.toString())}`);

    return lines.join('\n');
  }
}
