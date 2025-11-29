# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CONTRIBUTING.md with comprehensive contribution guidelines
- CODE_OF_CONDUCT.md following Contributor Covenant v2.1
- Enhanced GitHub Actions workflows for improved CI/CD
  - CodeQL security scanning
  - Automated stale issue/PR management
  - PR auto-labeling based on changed files
  - PR checks for title format and size
  - Automated release creation
  - Code coverage reporting with thresholds
- Dependabot configuration for automated dependency updates
- PR template with comprehensive checklist
- Welcome messages for first-time contributors
- Vitest configuration + setup powered by `@kitiumai/config` and `@kitiumai/vitest-helpers`
- Shared logger wrapper that forwards to `@kitiumai/logger`

### Changed

- Updated repository URLs from `ashishyd` to `kitium-ai`
- Improved documentation structure
- Migrated the Jest test suite to Vitest for faster runs and ESM compatibility
- Adopted the shared `@kitiumai/lint` Flat config with dedicated `tsconfig.eslint.json`
- Refined the CLI and public API to use `@kitiumai/utils-ts` helpers and `@kitiumai/types` `Result` envelopes
- Added `.js` extension-aware imports and Node16 module resolution across tooling

## [2.0.1] - 2024-01-XX

### Fixed

- Minor bug fixes and improvements

## [2.0.0] - 2024-01-XX

### Added

- 🤖 **AI-Powered Analysis** - Integration with Claude (Anthropic) and GPT-4 (OpenAI)
  - Smart strategy selection with confidence scores
  - Codebase pattern learning and architecture detection
  - Intelligent refactoring code generation
  - Root cause analysis for circular dependencies
- AI CLI options: `--ai`, `--ai-provider`, `--ai-key`, `--explain`, `--generate-code`
- Architecture-aware recommendations based on detected codebase patterns
- Context-aware fix suggestions aligned with existing code style
- ⚙️ **Shared Configuration**
  - `cycfix.config.json` / `.cycfixrc.json` support for team-wide defaults
  - Centralized analysis options (extensions, excludes, depth, node_modules)
  - Configurable output behavior (format, file path)
- 🛡️ **Policy Guardrails**
  - Configurable `policies.boundaries` to enforce architectural rules (e.g. `domain` → `infrastructure`)
  - Severity-based failures via `policies.failOnSeverity` (`warn` / `error`)
  - Policy violations annotated alongside cycle information in CLI output
- 📄 **Enterprise Reporting**
  - JSON reporter for ingestion into custom dashboards and pipelines
  - SARIF reporter for GitHub / Azure DevOps code scanning integration
  - `--format` and `--output-file` CLI flags to control report shape and destination

### Enhanced

- Fix strategies now supported by AI analysis
- Manual fix steps enhanced with AI-generated code snippets
- Documentation with AI integration guide

### Changed

- Minimum Node.js version: 16.0.0
- Enhanced error messages with more context
- CLI now respects both config file and CLI flags, with flags taking precedence
- `detect` / `fix` exit codes consider both cycles and policy violations for CI friendliness

## [1.0.0] - 2024-01-XX

### Added

- 🔍 **Core Functionality**
  - Fast cycle detection using Tarjan's algorithm (O(V + E))
  - Support for JavaScript and TypeScript projects
  - File extensions: `.js`, `.jsx`, `.ts`, `.tsx`
- 🛠️ **Fix Strategies**
  - Dynamic Import Strategy - Converts static imports to dynamic
  - Extract Shared Strategy - Creates shared modules for common code
- 📝 **Manual Fix Guidance**
  - Clear, actionable steps for manual fixes
  - Code examples and line numbers
- 🎨 **CLI Interface**
  - `detect` command - Find circular dependencies
  - `fix` command - Attempt automatic fixes
  - Options: `--dir`, `--extensions`, `--exclude`, `--dry-run`, `--backup`
- 📊 **Output Formatting**
  - Colored console output with Chalk
  - Detailed cycle information with import paths
  - Progress indicators with Ora
- 🏗️ **Clean Architecture**
  - Domain layer with interfaces and models
  - Application layer with use cases
  - Infrastructure layer with implementations
  - CLI layer for user interaction
- ✅ **Testing**
  - Comprehensive unit tests
  - Integration tests
  - > 90% code coverage
- 📦 **Programmatic API**
  - `createAnalyzer()` factory function
  - TypeScript type definitions
  - Full API documentation

### Technical Details

- Written in TypeScript 5.3
- Uses regex-based parsing for speed
- Dependency injection throughout
- SOLID principles
- No `any` types - strict typing

## [0.1.0] - 2024-01-XX

### Added

- Initial proof of concept
- Basic cycle detection
- Simple CLI interface

---

## Release Guidelines

### Version Format

- **MAJOR.MINOR.PATCH** (e.g., 2.0.1)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

### Links

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)

[Unreleased]: https://github.com/kitium-ai/cyclic-dependency-fixer/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/kitium-ai/cyclic-dependency-fixer/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/kitium-ai/cyclic-dependency-fixer/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/kitium-ai/cyclic-dependency-fixer/releases/tag/v1.0.0
