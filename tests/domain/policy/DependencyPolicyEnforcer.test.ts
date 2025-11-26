import { describe, expect, it } from 'vitest';
import path from 'path';
import { DependencyPolicyEnforcer } from '../../../src/domain/policy/DependencyPolicyEnforcer';
import type {
  AnalysisResult,
  Cycle,
  CycleEdge,
  ImportInfo,
} from '../../../src/domain/models/types';
import { ImportType } from '../../../src/domain/models/types';

const rootDir = path.resolve('/tmp/cycfix');

function createImport(from: string, to: string): { edge: CycleEdge; toPath: string } {
  const importInfo: ImportInfo = {
    source: './module',
    resolvedPath: to,
    line: 5,
    type: ImportType.STATIC,
    identifiers: [],
  };

  return {
    edge: {
      from,
      to,
      importInfo,
    },
    toPath: to,
  };
}

describe('DependencyPolicyEnforcer', () => {
  it('returns no violations when no rules are configured', () => {
    const cycle: Cycle = {
      id: 'cycle-1',
      paths: [`${rootDir}/src/a.ts`, `${rootDir}/src/b.ts`, `${rootDir}/src/a.ts`],
      edges: [],
    };

    const result: AnalysisResult = {
      cycles: [cycle],
      totalModules: 2,
      affectedModules: cycle.paths,
      duration: 10,
    };

    const enforcer = new DependencyPolicyEnforcer([], rootDir);
    expect(enforcer.evaluate(result)).toEqual([]);
  });

  it('flags violations when edges match configured patterns', () => {
    const from = `${rootDir}/src/domain/user.ts`;
    const to = `${rootDir}/src/infrastructure/db.ts`;
    const { edge } = createImport(from, to);

    const cycle: Cycle = {
      id: 'cycle-2',
      paths: [from, to, from],
      edges: [edge],
    };

    const result: AnalysisResult = {
      cycles: [cycle],
      totalModules: 2,
      affectedModules: cycle.paths,
      duration: 5,
    };

    const enforcer = new DependencyPolicyEnforcer(
      [
        {
          name: 'domain-to-infra',
          from: 'src/domain/**',
          to: 'src/infrastructure/**',
          severity: 'warn',
          description: 'Domain layer should not depend on infrastructure.',
        },
      ],
      rootDir,
    );

    const violations = enforcer.evaluate(result);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: 'domain-to-infra',
      severity: 'warn',
      description: 'Domain layer should not depend on infrastructure.',
    });
  });
});
