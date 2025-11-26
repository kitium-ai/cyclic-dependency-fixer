import path from 'path';
import type { AnalysisResult, Cycle, FixResult } from '../../domain/models/types';
import type { PolicyViolation } from '../../domain/policy/types';
import packageJson from '../../../package.json';

type SarifResult = {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations?: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine?: number };
    };
  }>;
};

type SarifReportPayload = {
  readonly command: 'detect' | 'fix';
  readonly rootDir: string;
  readonly analysis: AnalysisResult;
  readonly fixes?: readonly FixResult[];
  readonly policyViolations?: readonly PolicyViolation[];
};

export class SarifReporter {
  render(payload: SarifReportPayload): string {
    const rules = new Map<string, { name: string; description: string }>();
    const results: SarifResult[] = [];

    payload.analysis.cycles.forEach((cycle) => {
      const ruleId = 'cyclic-dependency';
      if (!rules.has(ruleId)) {
        rules.set(ruleId, {
          name: 'Circular dependency detected',
          description:
            'A strongly-connected component of modules with circular imports has been detected.',
        });
      }

      results.push({
        ruleId,
        level: 'error',
        message: { text: `Cycle ${cycle.id} detected with ${cycle.paths.length - 1} modules.` },
        locations: this.createCycleLocations(cycle, payload.rootDir),
      });
    });

    (payload.policyViolations ?? []).forEach((violation) => {
      const ruleId = `policy/${violation.rule}`;
      if (!rules.has(ruleId)) {
        rules.set(ruleId, {
          name: `Policy violation: ${violation.rule}`,
          description: violation.description ?? 'Dependency boundary rule violation.',
        });
      }

      results.push({
        ruleId,
        level: violation.severity === 'warn' ? 'warning' : 'error',
        message: { text: violation.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: violation.from,
              },
            },
          },
        ],
      });
    });

    (payload.fixes ?? []).forEach((fix) => {
      const ruleId = `fix/${fix.cycle.id}`;
      if (!rules.has(ruleId)) {
        rules.set(ruleId, {
          name: `Fix strategy: ${fix.strategy}`,
          description: 'Result of attempting to remediate a circular dependency.',
        });
      }

      results.push({
        ruleId,
        level: fix.success ? 'note' : 'warning',
        message: {
          text: fix.success
            ? `Cycle ${fix.cycle.id} resolved via ${fix.strategy}.`
            : `Automatic remediation for cycle ${fix.cycle.id} failed.`,
        },
      });
    });

    const sarifLog = {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'cyclic-dependency-fixer',
              version: packageJson.version ?? '0.0.0',
              rules: Array.from(rules.entries()).map(([id, meta]) => ({
                id,
                name: meta.name,
                shortDescription: { text: meta.description },
              })),
            },
          },
          invocations: [
            {
              executionSuccessful: true,
              commandLine: process.argv.join(' '),
            },
          ],
          results,
        },
      ],
    };

    return JSON.stringify(sarifLog, null, 2);
  }

  private createCycleLocations(cycle: Cycle, rootDir: string): SarifResult['locations'] {
    if (!cycle.edges.length) {
      return undefined;
    }

    return cycle.edges.map((edge) => ({
      physicalLocation: {
        artifactLocation: {
          uri: path.relative(rootDir, edge.from).replace(/\\/g, '/'),
        },
        region: {
          startLine: edge.importInfo.line,
        },
      },
    }));
  }
}
