import type { FixStrategy } from '../models/types';

export type PolicySeverity = 'warn' | 'error';

export type DependencyBoundaryRule = {
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly severity?: PolicySeverity;
  readonly description?: string;
  readonly recommendedStrategies?: readonly FixStrategy[];
};

export type PolicyConfig = {
  readonly failOnSeverity?: PolicySeverity;
  readonly boundaries?: readonly DependencyBoundaryRule[];
};

export type PolicyViolation = {
  readonly rule: string;
  readonly severity: PolicySeverity;
  readonly from: string;
  readonly to: string;
  readonly message: string;
  readonly description?: string;
  readonly cycleId?: string;
  readonly recommendedStrategies?: readonly FixStrategy[];
};
