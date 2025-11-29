# cyclic-dependency-fixer

[![npm version](https://badge.fury.io/js/cyclic-dependency-fixer.svg)](https://www.npmjs.com/package/cyclic-dependency-fixer)
[![Downloads](https://img.shields.io/npm/dm/cyclic-dependency-fixer.svg)](https://www.npmjs.com/package/cyclic-dependency-fixer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/kitium-ai/cyclic-dependency-fixer/pulls)
[![GitHub stars](https://img.shields.io/github/stars/kitium-ai/cyclic-dependency-fixer.svg?style=social)](https://github.com/kitium-ai/cyclic-dependency-fixer)

🔄 **Detect and automatically fix cyclic dependencies in JavaScript/TypeScript projects with AI-powered analysis**

`cyclic-dependency-fixer` is a lightweight, powerful tool that not only detects circular dependencies but also provides intelligent auto-fix strategies powered by AI (Claude, GPT-4). Get context-aware recommendations, automated refactoring code, and actionable insights.

---

## Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [AI-Powered Features](#-ai-powered-features)
- [Usage](#-usage)
- [Fix Strategies](#-fix-strategies)
- [Output Example](#-output-example)
- [Architecture](#️-architecture)
- [Testing](#-testing)
- [Development](#-development)
- [Advanced Usage](#-advanced-usage)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## ✨ Features

### Core Features

- 🔍 **Fast Detection** - Uses Tarjan's algorithm for efficient cycle detection (O(V + E))
- 🛠️ **Auto-Fix Strategies** - Attempts to automatically fix cycles when safe
- 📝 **Manual Fix Guidance** - Provides clear, actionable steps when auto-fix isn't possible
- 🎯 **Multiple Strategies** - Dynamic imports, shared module extraction, and more
- 📊 **Clear Output** - User-friendly CLI with colored output
- 🔌 **Extensible** - Clean architecture allows custom fix strategies
- 💪 **Type-Safe** - Written in TypeScript with strict typing
- 🪶 **Lightweight** - Minimal dependencies, uses regex-based parsing
- 📄 **Enterprise Reports** - Export JSON or SARIF for CI/CD and audits
- 🛡️ **Policy Guardrails** - Enforce architectural boundaries before merging
- 🧭 **Deterministic Graphs** - TypeScript project-aware parsing with `tsconfig` support and path resolution
- 💾 **Incremental Cache** - Opt-in content-hash cache for stable CI timings and repeated runs
- 🛟 **Degraded-but-useful Results** - Partial outputs with warning surfacing when some files fail to parse
- 📈 **Operational Insights** - Metrics in CLI output (parser used, cache hits) for observability

### 🤖 AI-Powered Features (NEW!)

- **Smart Strategy Selection** - AI analyzes your code and recommends the best fix strategy
- **Codebase Pattern Learning** - Understands your architecture and coding patterns
- **Intelligent Refactoring** - Generates production-ready refactoring code
- **Root Cause Analysis** - Explains WHY circular dependencies exist
- **Context-Aware Suggestions** - Recommendations tailored to your codebase
- **Multiple AI Providers** - Support for Claude (Anthropic) and GPT-4 (OpenAI)

## 🚀 Installation

```bash
npm install -g cyclic-dependency-fixer
```

Or use locally in your project:

```bash
npm install --save-dev cyclic-dependency-fixer
```

## ⚡ Quick Start

### Basic Usage (No AI)

```bash
# Detect circular dependencies
cycfix detect

# Attempt to fix them automatically
cycfix fix --dry-run  # Preview changes
cycfix fix             # Apply fixes
```

### With AI-Powered Analysis

```bash
# Set up your API key (one-time)
export ANTHROPIC_API_KEY=sk-ant-xxx  # or OPENAI_API_KEY

# Run with AI-powered recommendations
cycfix fix --ai --generate-code

# Get detailed AI explanations
cycfix fix --ai --explain --generate-code
```

### Deterministic & scalable analysis

```bash
# Honor tsconfig paths/references for stable graphs
cycfix detect --tsconfig tsconfig.json

# Use incremental cache (content-hash) for faster CI reruns
cycfix detect --cache --cache-dir .cycfix-cache

# Guardrail safety in huge monorepos
cycfix detect --max-files 5000 --max-depth 40
```

## 🤖 AI-Powered Features

### Why Use AI?

Traditional static analysis can detect cycles but struggles with context. AI understands:

- **Semantic relationships** between modules
- **Your codebase's architecture** (layered, hexagonal, clean architecture, etc.)
- **Common patterns** you use (dependency injection, factory pattern, etc.)
- **Why cycles exist** (shared types, bidirectional relationships, etc.)

### Setup

1. **Get an API Key** (choose one):
   - **Claude (Anthropic)**: https://console.anthropic.com/
   - **GPT-4 (OpenAI)**: https://platform.openai.com/api-keys

2. **Set Environment Variable**:

   ```bash
   # For Claude (recommended)
   export ANTHROPIC_API_KEY=sk-ant-xxx

   # Or for GPT-4
   export OPENAI_API_KEY=sk-xxx
   ```

3. **Or use CLI flag**:
   ```bash
   cycfix fix --ai --ai-key sk-ant-xxx
   ```

### AI Features

#### 1. Smart Strategy Selection

AI analyzes your code and recommends the best fix strategy:

```bash
cycfix fix --ai
```

**Output:**

```
🤖 Analyzing codebase patterns with AI...
   Architecture: Clean Architecture (Layered)
   Patterns found: 3

🤖 Getting AI recommendation for cycle abc123...
   Recommended: extract-shared (85% confidence)
   Reasoning: Both UserService and OrderService depend on shared types.
              Creating a shared types module maintains your layered architecture.
```

#### 2. Intelligent Code Generation

Get production-ready refactoring code:

```bash
cycfix fix --ai --generate-code
```

**Output:**

```
📝 Manual steps to fix:

1. Create shared types module
   File: src/shared/types/user-order.types.ts

   export interface UserId {
     readonly id: string;
   }

   export interface OrderReference {
     readonly userId: UserId;
     readonly orderId: string;
   }

2. Update UserService imports
   File: src/services/user.service.ts
   Line: 3

   - import { OrderReference } from './order.service'
   + import { OrderReference } from '../shared/types/user-order.types'
```

#### 3. Root Cause Analysis

Understand WHY cycles exist:

```bash
cycfix fix --ai --explain
```

**Output:**

```
AI Analysis:

This circular dependency exists because:

1. UserService needs to track user orders (OrderReference type)
2. OrderService needs to validate users (UserId type)
3. Both services define types the other needs

Root Cause: Shared domain types without a common module

Impact:
- Prevents tree-shaking
- Can cause runtime initialization errors
- Makes testing harder (mocking circular deps)

Prevention:
- Create a shared types layer (src/types/)
- Follow the Dependency Inversion Principle
- Use interfaces to define contracts
```

#### 4. Architecture-Aware Recommendations

AI adapts to YOUR codebase patterns:

```
✓ Detected: You use dependency injection in 80% of services
✓ Detected: Layered architecture with clear boundaries
✓ Detected: Barrel files (index.ts) for public APIs

Recommendation: Use dependency injection pattern to break this cycle,
as it aligns with your existing architecture.
```

### AI CLI Options

| Option                     | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `--ai`                     | Enable AI-powered analysis                                    |
| `--ai-provider <provider>` | Choose provider: `anthropic` or `openai` (default: anthropic) |
| `--ai-key <key>`           | Provide API key directly (or use env var)                     |
| `--explain`                | Generate AI explanations of why cycles exist                  |
| `--generate-code`          | Generate complete refactoring code with AI                    |

### Example Workflow

```bash
# 1. Detect with AI analysis
cycfix fix --ai --dry-run

# 2. Review AI recommendations
# AI will show:
# - Detected architecture
# - Recommended strategy with confidence score
# - Reasoning for the recommendation

# 3. Generate refactoring code
cycfix fix --ai --generate-code --dry-run

# 4. Apply fixes
cycfix fix --ai --generate-code
```

## 📖 Usage

### CLI

#### Detect Cycles

```bash
cycfix detect
```

**Options:**

- `-d, --dir <directory>` - Root directory to analyze (default: current directory)
- `-e, --extensions <extensions>` - File extensions to include (default: .js,.jsx,.ts,.tsx)
- `-x, --exclude <patterns>` - Patterns to exclude (comma-separated)
- `--include-node-modules` - Include node_modules in analysis
- `--max-depth <depth>` - Maximum depth for cycle detection (default: 50)
- `--config <path>` - Load shared defaults from `cycfix.config.json`
- `--format <cli|json|sarif>` - Choose human or machine readable output
- `--output-file <path>` - Write the report to disk instead of stdout

**Example:**

```bash
cycfix detect --dir ./src --extensions .ts,.tsx --exclude tests,__mocks__
```

#### Fix Cycles

```bash
cycfix fix
```

**Options:**

- `-d, --dir <directory>` - Root directory to analyze
- `-e, --extensions <extensions>` - File extensions to include
- `-x, --exclude <patterns>` - Patterns to exclude
- `--dry-run` - Preview fixes without modifying files
- `--no-backup` - Don't create backup files
- `--auto` - Automatically apply fixes without confirmation
- `--config <path>` - Load shared defaults from `cycfix.config.json`
- `--format <cli|json|sarif>` - Emit CLI-friendly output or JSON/SARIF for CI
- `--output-file <path>` - Persist the report

**Example:**

```bash
cycfix fix --dry-run  # Preview changes
cycfix fix            # Apply fixes with backups
```

## ⚙️ Configuration

Share defaults with your team by checking in a `cycfix.config.json` at the repo root:

```json
{
  "analysis": {
    "extensions": [".ts", ".tsx"],
    "exclude": ["dist", "coverage"]
  },
  "output": {
    "format": "json",
    "file": "reports/cycfix-report.json"
  },
  "policies": {
    "failOnSeverity": "warn",
    "boundaries": [
      {
        "name": "domain-to-infra",
        "from": "src/domain/**",
        "to": "src/infrastructure/**",
        "severity": "error",
        "description": "Domain layer should not depend on infrastructure"
      }
    ]
  }
}
```

CLI flags always win, so you can override config values per run (`cycfix detect --format sarif --output-file .reports/cycfix.sarif`).

## 🛡️ Policy Enforcement

Large codebases often need to enforce architectural boundaries (e.g., `domain` cannot import `infrastructure`). Define rules under `policies.boundaries` and cyclic-dependency-fixer will:

- Match edges using glob-style wildcards (`*`, `**`)
- Annotate reports with the offending imports
- Fail the command automatically when a violation of the configured severity is detected

You can optionally provide `recommendedStrategies` for each rule to guide reviewers toward the right remediation path.

## 📤 Enterprise Reporting

Need to feed results into GitHub Advanced Security, Azure DevOps, or custom dashboards? Use the structured reporters:

```bash
cycfix detect --format json --output-file reports/cycfix.json
cycfix fix --format sarif --output-file reports/cycfix.sarif
```

- **JSON**: optimized for custom ingestion pipelines
- **SARIF**: drop directly into GitHub code scanning or Azure DevOps to annotate PRs

## 🧩 Programmatic API

The package exposes a small, focused API for embedding `cyclic-dependency-fixer` into your own tooling.

### Quick Start Example

```typescript
import { createAnalyzer } from 'cyclic-dependency-fixer';

const analyzer = createAnalyzer('./src');

// Detect cycles
const detection = await analyzer.detect({
  extensions: ['.ts', '.tsx'],
  exclude: ['node_modules', 'dist'],
});

if (!detection.success || !detection.data) {
  throw detection.error;
}

console.log(`Found ${detection.data.cycles.length} cycles`);

// Attempt to fix
const fixAttempt = await analyzer.fix(
  {
    extensions: ['.ts', '.tsx'],
  },
  {
    dryRun: false,
    backup: true,
  },
);

if (!fixAttempt.success || !fixAttempt.data) {
  throw fixAttempt.error;
}

fixAttempt.data.fixResults.forEach((result) => {
  if (result.success) {
    console.log(`✓ Fixed ${result.cycle.id}`);
  } else {
    console.log(`⚠ Manual steps required for ${result.cycle.id}`);
    result.manualSteps?.forEach((step) => {
      console.log(`  - ${step.description}`);
    });
  }
});
```

### Public API Surface

From `cyclic-dependency-fixer` you can import:

- **Core types**
  - `ModulePath`, `Module`, `Cycle`, `AnalysisResult`, `FixResult`, `FixStrategy`, `FixOptions`
- **Use cases**
  - `DetectCyclesUseCase`, `FixCyclesUseCase`
- **Infrastructure defaults**
  - `NodeFileSystem`, `JavaScriptParser`, `TarjanCycleDetector`
- **Fix strategies**
  - `DynamicImportStrategy`, `ExtractSharedStrategy`
- **Factory**
  - `createAnalyzer(rootDir: string)` – returns `{ detect, fix }` helpers as used in the example above

These building blocks let you construct custom pipelines (e.g. your own reporters or policy engines) while reusing the same analysis and fixing logic that powers the CLI.

## 🎯 Fix Strategies

### 1. Dynamic Import Strategy

Converts static imports to dynamic imports to break the cycle.

**Best for:** Simple 2-node cycles where lazy loading is acceptable.

**Example:**

```typescript
// Before
import { utils } from './utils';

// After
const { utils } = await import('./utils');
```

### 2. Extract Shared Strategy

Creates a new shared module to hold common code.

**Best for:** Modules in the same directory sharing common functionality.

**Example:**

```
Before: a.ts ↔ b.ts
After:  a.ts → shared.ts ← b.ts
```

## 📊 Output Example

```
📊 Analysis Results
──────────────────────────────────────────────────
Total modules analyzed: 45
Analysis duration: 123ms

✗ Found 2 circular dependencies
Affected modules: 4

Cycle #1 (abc12345)
  src/components/Button.tsx →
  src/components/Form.tsx →
  src/components/Button.tsx ⤴

  Import details:
    src/components/Button.tsx:5 imports src/components/Form.tsx
    src/components/Form.tsx:12 imports src/components/Button.tsx

🔧 Fix Results
──────────────────────────────────────────────────

⚠ Could not auto-fix cycle abc12345
  Strategy attempted: dynamic-import

  📝 Manual steps to fix:

  1. Convert static import to dynamic import in src/components/Button.tsx
     File: src/components/Button.tsx
     Line: 5

     // Replace:
     // import x from './Form'

     // With:
     const x = await import('./Form').then(m => m.default || m);

  2. Make the parent function async if needed
     File: src/components/Button.tsx
```

## 🏗️ Architecture

Built with **Clean Architecture** principles:

```
src/
├── domain/              # Core business logic
│   ├── models/          # Domain entities & types
│   └── interfaces/      # Abstractions (IFileSystem, IParser, etc.)
├── application/         # Use cases
│   ├── DetectCyclesUseCase.ts
│   ├── FixCyclesUseCase.ts
│   └── fix-strategies/  # Fix strategy implementations
├── infrastructure/      # External concerns
│   ├── filesystem/      # File system operations
│   ├── parsers/         # Code parsing
│   └── graph/           # Cycle detection algorithms
└── cli/                 # Command-line interface
```

### Key Design Principles

- ✅ **SOLID Principles** - Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- ✅ **Dependency Injection** - All dependencies injected for testability
- ✅ **Strategy Pattern** - Pluggable fix strategies
- ✅ **No Any Types** - Strict TypeScript typing throughout

## 🧪 Testing

Comprehensive test coverage (>90%):

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
```

## 🧰 API Reference

Programmatic usage with deterministic parsing, caching, and fix orchestration:

```typescript
import { createAnalyzer, FixStrategy } from 'cyclic-dependency-fixer';

const analyzer = createAnalyzer(process.cwd());

// Detection with tsconfig + cache
const analysis = await analyzer.detect({
  tsconfigPath: 'tsconfig.json',
  enableCache: true,
  cacheDir: '.cycfix-cache',
  maxFiles: 10_000,
});

if (analysis.success && analysis.data.cycles.length > 0) {
  // Attempt targeted fixes
  await analyzer.fix(
    { tsconfigPath: 'tsconfig.json' },
    { strategies: [FixStrategy.EXTRACT_SHARED], dryRun: true },
  );
}
```

`AnalysisResult` now surfaces `warnings`, `metrics`, and `isPartial` so CI can gate on degraded runs while still consuming SARIF/JSON output.

## 📚 Advanced Usage

### Custom Fix Strategy

Extend the package with your own fix strategies:

```typescript
import { IFixStrategy, FixStrategy, Cycle } from 'cyclic-dependency-fixer';

class MyCustomStrategy implements IFixStrategy {
  readonly type = FixStrategy.CUSTOM as any;

  async canFix(cycle: Cycle): Promise<boolean> {
    // Your logic
    return true;
  }

  score(cycle: Cycle): number {
    // Higher score = preferred
    return 100;
  }

  async fix(cycle, modules, fileSystem, dryRun) {
    // Implement your fix
    return {
      /* FixResult */
    };
  }
}
```

### Integration with CI/CD

Add to your GitHub Actions:

```yaml
- name: Check for circular dependencies
  run: npx cycfix detect
```

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Ashish Yadav](https://github.com/kitium-ai)

## 🙏 Acknowledgments

- Inspired by [madge](https://github.com/pahen/madge) for cycle detection
- Uses Tarjan's algorithm for efficient SCC detection
- Built with TypeScript, Commander, Chalk, and Ora

## 📮 Support

- 🐛 [Report a bug](https://github.com/kitium-ai/cyclic-dependency-fixer/issues)
- 💡 [Request a feature](https://github.com/kitium-ai/cyclic-dependency-fixer/issues)
- 💬 [Discussions](https://github.com/kitium-ai/cyclic-dependency-fixer/discussions)
- ⭐ [Star on GitHub](https://github.com/kitium-ai/cyclic-dependency-fixer)

---

**Made with ❤️ for the TypeScript community**
