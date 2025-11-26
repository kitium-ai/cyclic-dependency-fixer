import type { AnalysisResult, FixResult } from '../../domain/models/types';
import type { PolicyViolation } from '../../domain/policy/types';

type JsonReportPayload = {
  readonly command: 'detect' | 'fix';
  readonly rootDir: string;
  readonly analysis: AnalysisResult;
  readonly fixes?: readonly FixResult[];
  readonly policyViolations?: readonly PolicyViolation[];
};

export class JsonReporter {
  render(payload: JsonReportPayload): string {
    const body = {
      command: payload.command,
      generatedAt: new Date().toISOString(),
      rootDir: payload.rootDir,
      analysis: {
        totalModules: payload.analysis.totalModules,
        affectedModules: payload.analysis.affectedModules,
        cycles: payload.analysis.cycles,
        durationMs: payload.analysis.duration,
      },
      fixes: payload.fixes ?? [],
      policyViolations: payload.policyViolations ?? [],
    };

    return JSON.stringify(body, null, 2);
  }
}
