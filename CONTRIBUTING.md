# Contributing to Cyclic Dependency Fixer

First off, thank you for considering contributing to Cyclic Dependency Fixer! It's people like you that make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [ashish.yd@gmail.com](mailto:ashish.yd@gmail.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/kitium-ai/cyclic-dependency-fixer/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots or animated GIFs if relevant**
- **Include your environment details** (OS, Node version, npm version)
- **Include the relevant code sample** (if applicable)

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. With files '...'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
- OS: [e.g. Windows 10, macOS 13.0, Ubuntu 22.04]
- Node Version: [e.g. 18.16.0]
- npm Version: [e.g. 9.5.1]
- Package Version: [e.g. 2.0.1]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as [GitHub issues](https://github.com/kitium-ai/cyclic-dependency-fixer/issues). When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior** and **explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

**Enhancement Request Template:**

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- `good-first-issue` - issues which should only require a few lines of code
- `help-wanted` - issues which should be a bit more involved than `good-first-issue` issues

### Pull Requests

1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

**Pull Request Guidelines:**

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the [coding guidelines](#coding-guidelines)
- Include relevant tests
- Update documentation as needed
- End all files with a newline

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0

### Setup Steps

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cyclic-dependency-fixer.git
   cd cyclic-dependency-fixer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables** (for AI features)
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Build the Project**
   ```bash
   npm run build
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

6. **Run Linter**
   ```bash
   npm run lint
   ```

### Development Workflow

```bash
# Watch mode for development
npm run build:watch

# Run tests in watch mode
npm run test:watch

# Lint and auto-fix
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
cyclic-dependency-fixer/
├── src/
│   ├── domain/              # Core business logic (entities, interfaces)
│   │   ├── interfaces/      # Abstractions (IFileSystem, IParser, etc.)
│   │   └── models/          # Domain entities and types
│   ├── application/         # Use cases (business logic orchestration)
│   │   ├── ai/              # AI-powered features
│   │   └── fix-strategies/  # Fix strategy implementations
│   ├── infrastructure/      # External concerns (file system, parsers)
│   │   ├── ai/              # AI provider implementations
│   │   ├── filesystem/      # File system operations
│   │   ├── graph/           # Cycle detection algorithms
│   │   └── parsers/         # Code parsing
│   ├── cli/                 # Command-line interface
│   └── index.ts             # Public API exports
├── tests/                   # Test files (mirrors src structure)
├── dist/                    # Compiled output (generated)
└── coverage/                # Test coverage reports (generated)
```

### Architecture Principles

This project follows **Clean Architecture** principles:

1. **Dependency Rule**: Dependencies point inward (domain ← application ← infrastructure)
2. **Dependency Injection**: All dependencies injected via constructor
3. **Interface Segregation**: Small, focused interfaces
4. **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion

## Coding Guidelines

### TypeScript Style

- **No `any` types** - Use proper typing or `unknown`
- **Strict mode enabled** - Follow strict TypeScript rules
- **Prefer readonly** - Use `readonly` for immutable properties
- **Use interfaces** - Define contracts with interfaces
- **Explicit return types** - Always specify function return types

### Code Style

We use ESLint and Prettier for code style. Configuration is in `.eslintrc.json` and `.prettierrc.json`.

**Key Rules:**
- Use 2 spaces for indentation
- Use single quotes for strings
- Always use semicolons
- Max line length: 100 characters
- No trailing whitespace

### Naming Conventions

- **Classes**: `PascalCase` (e.g., `DetectCyclesUseCase`)
- **Interfaces**: `IPascalCase` (e.g., `IFileSystem`)
- **Functions/Methods**: `camelCase` (e.g., `detectCycles`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_DEPTH`)
- **Files**: `PascalCase.ts` for classes, `camelCase.ts` for utilities

### Documentation

- **JSDoc comments** for public APIs
- **Inline comments** for complex logic
- **README updates** for new features
- **Type documentation** with TSDoc

**Example:**
```typescript
/**
 * Detects circular dependencies in a module graph.
 * 
 * @param modules - The module graph to analyze
 * @param maxDepth - Maximum depth for cycle detection (default: 50)
 * @returns Analysis result containing detected cycles
 * @throws {Error} If the graph is invalid
 */
async detectCycles(
  modules: Map<string, Module>,
  maxDepth: number = 50
): Promise<AnalysisResult> {
  // Implementation
}
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual classes/functions in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete workflows

### Writing Tests

```typescript
describe('DetectCyclesUseCase', () => {
  let useCase: DetectCyclesUseCase;
  let mockFileSystem: IFileSystem;
  let mockParser: IParser;

  beforeEach(() => {
    // Setup mocks
    mockFileSystem = createMockFileSystem();
    mockParser = createMockParser();
    useCase = new DetectCyclesUseCase(mockFileSystem, mockParser);
  });

  describe('execute', () => {
    it('should detect simple two-node cycle', async () => {
      // Arrange
      mockFileSystem.readFile = jest.fn().mockResolvedValue('...');
      
      // Act
      const result = await useCase.execute({ dir: './test' });
      
      // Assert
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].path).toEqual(['a.ts', 'b.ts', 'a.ts']);
    });
  });
});
```

### Test Coverage

- **Minimum coverage**: 80% overall
- **Critical paths**: 100% coverage for core logic
- **Run coverage**: `npm test -- --coverage`

### Test Best Practices

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- One assertion per test (when possible)
- Mock external dependencies
- Test edge cases and error conditions

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD configuration changes

### Examples

```bash
feat(ai): add Claude Sonnet 4 support

Add support for the new Claude Sonnet 4 model with improved
reasoning capabilities for cycle detection.

Closes #123

---

fix(parser): handle dynamic imports correctly

Dynamic imports were not being parsed correctly in some edge cases.
This fix adds proper support for await import() syntax.

Fixes #456

---

docs(readme): update AI setup instructions

Add more detailed instructions for setting up AI providers
with environment variables and CLI flags.
```

### Commit Rules

- Use the imperative mood ("Add feature" not "Added feature")
- Don't capitalize the first letter of the subject
- No period at the end of the subject
- Limit the subject line to 72 characters
- Separate subject from body with a blank line
- Wrap the body at 72 characters
- Reference issues and PRs in the footer

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (e.g., 1.0.0 → 1.0.1)

### Release Steps

1. **Update Version**
   ```bash
   npm version [major|minor|patch]
   ```

2. **Update CHANGELOG.md**
   - Document all changes since last release
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

3. **Create Release Tag**
   ```bash
   git tag -a v2.0.0 -m "Release v2.0.0"
   git push origin v2.0.0
   ```

4. **Publish to npm**
   ```bash
   npm publish
   ```

5. **Create GitHub Release**
   - Go to [Releases](https://github.com/kitium-ai/cyclic-dependency-fixer/releases)
   - Draft a new release
   - Include changelog and migration notes

## Questions?

Don't hesitate to ask! You can:

- Open an issue with the `question` label
- Start a discussion in [GitHub Discussions](https://github.com/kitium-ai/cyclic-dependency-fixer/discussions)
- Email the maintainer at [ashish.yd@gmail.com](mailto:ashish.yd@gmail.com)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing! 🎉

