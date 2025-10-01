# cyclic-dependency-fixer

[![npm version](https://badge.fury.io/js/cyclic-dependency-fixer.svg)](https://www.npmjs.com/package/cyclic-dependency-fixer)
[![Downloads](https://img.shields.io/npm/dm/cyclic-dependency-fixer.svg)](https://www.npmjs.com/package/cyclic-dependency-fixer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ashishyd/cyclic-dependency-fixer/pulls)
[![GitHub stars](https://img.shields.io/github/stars/ashishyd/cyclic-dependency-fixer.svg?style=social)](https://github.com/ashishyd/cyclic-dependency-fixer)

🔄 **Detect and automatically fix cyclic dependencies in JavaScript/TypeScript projects**

`cyclic-dependency-fixer` is a lightweight, powerful tool that not only detects circular dependencies but also provides intelligent auto-fix strategies and actionable manual steps when automatic fixes aren't possible.

---

## Table of Contents

- [Features](#-features)
- [Installation](#-installation)
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

- 🔍 **Fast Detection** - Uses Tarjan's algorithm for efficient cycle detection (O(V + E))
- 🛠️ **Auto-Fix Strategies** - Attempts to automatically fix cycles when safe
- 📝 **Manual Fix Guidance** - Provides clear, actionable steps when auto-fix isn't possible
- 🎯 **Multiple Strategies** - Dynamic imports, shared module extraction, and more
- 📊 **Clear Output** - User-friendly CLI with colored output
- 🔌 **Extensible** - Clean architecture allows custom fix strategies
- 💪 **Type-Safe** - Written in TypeScript with strict typing
- 🪶 **Lightweight** - Minimal dependencies, uses regex-based parsing

## 🚀 Installation

```bash
npm install -g cyclic-dependency-fixer
```

Or use locally in your project:

```bash
npm install --save-dev cyclic-dependency-fixer
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

**Example:**
```bash
cycfix fix --dry-run  # Preview changes
cycfix fix            # Apply fixes with backups
```

### Programmatic API

```typescript
import { createAnalyzer } from 'cyclic-dependency-fixer';

const analyzer = createAnalyzer('./src');

// Detect cycles
const result = await analyzer.detect({
  extensions: ['.ts', '.tsx'],
  exclude: ['node_modules', 'dist'],
});

console.log(`Found ${result.cycles.length} cycles`);

// Attempt to fix
const { analysisResult, fixResults } = await analyzer.fix({
  extensions: ['.ts', '.tsx'],
}, {
  dryRun: false,
  backup: true,
});

fixResults.forEach(result => {
  if (result.success) {
    console.log(`✓ Fixed ${result.cycle.id}`);
  } else {
    console.log(`⚠ Manual steps required for ${result.cycle.id}`);
    result.manualSteps?.forEach(step => {
      console.log(`  - ${step.description}`);
    });
  }
});
```

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
    return { /* FixResult */ };
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

MIT © [Ashish Yadav](https://github.com/ashishyd)

## 🙏 Acknowledgments

- Inspired by [madge](https://github.com/pahen/madge) for cycle detection
- Uses Tarjan's algorithm for efficient SCC detection
- Built with TypeScript, Commander, Chalk, and Ora

## 📮 Support

- 🐛 [Report a bug](https://github.com/ashishyd/cyclic-dependency-fixer/issues)
- 💡 [Request a feature](https://github.com/ashishyd/cyclic-dependency-fixer/issues)
- 💬 [Discussions](https://github.com/ashishyd/cyclic-dependency-fixer/discussions)
- ⭐ [Star on GitHub](https://github.com/ashishyd/cyclic-dependency-fixer)

---

**Made with ❤️ for the TypeScript community**
