/**
 * Core domain types for cyclic dependency detection and fixing
 */

/**
 * Represents a module file path (normalized absolute path)
 */
export type ModulePath = string;

/**
 * Represents an import statement's source
 */
export type ImportInfo = {
  /** The imported module path (relative or absolute) */
  readonly source: string;
  /** The resolved absolute path of the imported module */
  readonly resolvedPath: ModulePath;
  /** Line number where the import occurs */
  readonly line: number;
  /** Import type (static, dynamic, require) */
  readonly type: ImportType;
  /** Imported identifiers */
  readonly identifiers: string[];
};

/**
 * Types of imports supported
 */
export enum ImportType {
  STATIC = 'static', // import x from 'y'
  DYNAMIC = 'dynamic', // import('y')
  REQUIRE = 'require', // require('y')
  EXPORT_FROM = 'export-from', // export { x } from 'y'
}

/**
 * Represents a module in the dependency graph
 */
export type Module = {
  /** Absolute path to the module */
  readonly path: ModulePath;
  /** All imports in this module */
  readonly imports: readonly ImportInfo[];
  /** File extension */
  readonly extension: string;
  /** Whether this is a TypeScript file */
  readonly isTypeScript: boolean;
};

/**
 * Represents a circular dependency cycle
 */
export type Cycle = {
  /** Ordered list of module paths forming the cycle */
  readonly paths: readonly ModulePath[];
  /** Import information for each edge in the cycle */
  readonly edges: readonly CycleEdge[];
  /** Unique identifier for this cycle */
  readonly id: string;
};

/**
 * Represents an edge in a cycle (A imports B)
 */
export type CycleEdge = {
  /** The importing module */
  readonly from: ModulePath;
  /** The imported module */
  readonly to: ModulePath;
  /** Import details */
  readonly importInfo: ImportInfo;
};

/**
 * Analysis result containing detected cycles
 */
export type AnalysisResult = {
  /** All detected cycles */
  readonly cycles: readonly Cycle[];
  /** Total number of modules analyzed */
  readonly totalModules: number;
  /** Modules involved in cycles */
  readonly affectedModules: readonly ModulePath[];
  /** Analysis duration in milliseconds */
  readonly duration: number;
};

/**
 * Configuration for dependency analysis
 */
export type AnalysisConfig = {
  /** Root directory to analyze */
  readonly rootDir: string;
  /** File extensions to include */
  readonly extensions: readonly string[];
  /** Patterns to exclude (glob) */
  readonly exclude: readonly string[];
  /** Whether to follow external dependencies */
  readonly includeNodeModules: boolean;
  /** Maximum depth for cycle detection */
  readonly maxDepth: number;
};

/**
 * Strategy for fixing a cycle
 */
export enum FixStrategy {
  /** Extract common code to a new module */
  EXTRACT_SHARED = 'extract-shared',
  /** Use dynamic imports to break the cycle */
  DYNAMIC_IMPORT = 'dynamic-import',
  /** Introduce dependency injection */
  DEPENDENCY_INJECTION = 'dependency-injection',
  /** Move code to break circular reference */
  MOVE_CODE = 'move-code',
  /** Create barrel file to centralize exports */
  BARREL_FILE = 'barrel-file',
}

/**
 * Result of attempting to fix a cycle
 */
export type FixResult = {
  /** The cycle that was fixed */
  readonly cycle: Cycle;
  /** Strategy used for the fix */
  readonly strategy: FixStrategy;
  /** Whether the fix was successful */
  readonly success: boolean;
  /** Files that were modified */
  readonly modifiedFiles: readonly ModulePath[];
  /** Files that were created */
  readonly createdFiles: readonly ModulePath[];
  /** Error message if fix failed */
  readonly error?: string;
  /** Manual steps if auto-fix failed */
  readonly manualSteps?: readonly ManualStep[];
};

/**
 * A manual step to fix a cycle
 */
export type ManualStep = {
  /** Description of the step */
  readonly description: string;
  /** File to modify */
  readonly file: ModulePath;
  /** Code snippet to add/modify */
  readonly code?: string;
  /** Line number reference */
  readonly line?: number;
};

/**
 * Options for fix execution
 */
export type FixOptions = {
  /** Whether to apply fixes automatically */
  readonly autoFix: boolean;
  /** Preferred fix strategies (in order) */
  readonly strategies: readonly FixStrategy[];
  /** Whether to create backup files */
  readonly backup: boolean;
  /** Dry run mode (don't modify files) */
  readonly dryRun: boolean;
};
