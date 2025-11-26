import path from 'path';
import type { AnalysisResult } from '../models/types';
import type { DependencyBoundaryRule, PolicyViolation, PolicySeverity } from './types';

const DEFAULT_SEVERITY: PolicySeverity = 'error';

type CompiledRule = DependencyBoundaryRule & {
  readonly severity: PolicySeverity;
  readonly fromMatcher: RegExp;
  readonly toMatcher: RegExp;
};

export class DependencyPolicyEnforcer {
  private readonly rules: readonly CompiledRule[];
  private readonly rootDir: string;

  constructor(rules: readonly DependencyBoundaryRule[] | undefined, rootDir: string) {
    this.rules = (rules ?? []).map((rule) => ({
      ...rule,
      severity: rule.severity ?? DEFAULT_SEVERITY,
      fromMatcher: compilePattern(rule.from),
      toMatcher: compilePattern(rule.to),
    }));
    this.rootDir = rootDir;
  }

  evaluate(result: AnalysisResult): PolicyViolation[] {
    if (this.rules.length === 0) {
      return [];
    }

    const violations: PolicyViolation[] = [];

    for (const cycle of result.cycles) {
      for (const edge of cycle.edges) {
        const fromRelative = this.normalize(edge.from);
        const toRelative = this.normalize(edge.to);

        for (const rule of this.rules) {
          if (rule.fromMatcher.test(fromRelative) && rule.toMatcher.test(toRelative)) {
            violations.push({
              rule: rule.name,
              severity: rule.severity,
              from: fromRelative,
              to: toRelative,
              cycleId: cycle.id,
              description: rule.description,
              recommendedStrategies: rule.recommendedStrategies,
              message: `Imports from ${fromRelative} to ${toRelative} violate boundary rule "${rule.name}"`,
            });
          }
        }
      }
    }

    return violations;
  }

  private normalize(filePath: string): string {
    return path.relative(this.rootDir, filePath).replace(/\\/g, '/');
  }
}

function compilePattern(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');

  return new RegExp(`^${escaped}$`);
}
