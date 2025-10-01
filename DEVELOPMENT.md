# Development Guide

## Project Structure

```
cyclic-dependency-fixer/
├── src/
│   ├── domain/                    # Core business logic (no dependencies)
│   │   ├── models/types.ts       # Domain entities and types
│   │   └── interfaces/           # Abstractions (IFileSystem, IParser, etc.)
│   ├── application/               # Use cases (orchestration layer)
│   │   ├── DetectCyclesUseCase.ts
│   │   ├── FixCyclesUseCase.ts
│   │   └── fix-strategies/       # Fix strategy implementations
│   │       ├── DynamicImportStrategy.ts
│   │       └── ExtractSharedStrategy.ts
│   ├── infrastructure/            # External adapters
│   │   ├── filesystem/           # File system operations
│   │   ├── parsers/              # Code parsing (regex-based)
│   │   └── graph/                # Cycle detection (Tarjan's algorithm)
│   ├── cli/                      # Command-line interface
│   │   ├── formatters/           # Output formatting
│   │   └── index.ts              # CLI entry point
│   └── index.ts                  # Public API
├── tests/                        # Test suite
│   ├── application/              # Use case tests
│   ├── infrastructure/           # Infrastructure tests
│   └── integration/              # End-to-end tests
└── package.json
```

## Architecture Principles

### Clean Architecture
- **Domain Layer**: Pure business logic, no external dependencies
- **Application Layer**: Use cases that orchestrate domain logic
- **Infrastructure Layer**: Implementations of external concerns
- **CLI Layer**: User interface

### SOLID Principles
- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extensible through new strategies without modifying core
- **Liskov Substitution**: All implementations honor their interfaces
- **Interface Segregation**: Focused, minimal interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### Design Patterns
- **Strategy Pattern**: Fix strategies are pluggable
- **Dependency Injection**: All dependencies injected through constructors
- **Factory Pattern**: `createAnalyzer()` creates preconfigured instances

## Key Algorithms

### Cycle Detection: Tarjan's Algorithm
- **Time Complexity**: O(V + E)
- **Space Complexity**: O(V)
- Finds all strongly connected components in a directed graph
- Efficient for large codebases

### Import Parsing
- Regex-based parsing (no AST)
- Lightweight and fast
- Handles: static imports, dynamic imports, require(), export-from

## Commands

```bash
# Development
npm run build          # Build TypeScript
npm run build:watch    # Build in watch mode
npm test               # Run tests with coverage
npm run test:watch     # Run tests in watch mode
npm run lint           # Check code quality
npm run lint:fix       # Fix linting errors
npm run format         # Format code
npm run format:check   # Check formatting

# Testing
npm test -- --coverage              # Full coverage report
npm test -- tests/unit              # Run only unit tests
npm test -- tests/integration       # Run only integration tests
```

## Adding a New Fix Strategy

1. Create a new class implementing `IFixStrategy`:

```typescript
import { IFixStrategy, FixStrategy, Cycle, FixResult } from '../domain';

export class MyStrategy implements IFixStrategy {
  readonly type = FixStrategy.MY_STRATEGY;

  async canFix(cycle: Cycle): Promise<boolean> {
    // Return true if this strategy can handle the cycle
    return true;
  }

  score(cycle: Cycle): number {
    // Return a score (0-100). Higher = more preferred
    return 75;
  }

  async fix(cycle, modules, fileSystem, dryRun): Promise<FixResult> {
    // Implement the fix logic
    return { /* ... */ };
  }
}
```

2. Register it in `src/index.ts`:

```typescript
const strategies = [
  new DynamicImportStrategy(),
  new ExtractSharedStrategy(),
  new MyStrategy(), // Add here
];
```

3. Write tests in `tests/application/fix-strategies/MyStrategy.test.ts`

## Testing Strategy

### Unit Tests (75%+ coverage)
- Test each class in isolation
- Mock all dependencies
- Focus on business logic

### Integration Tests
- Test end-to-end scenarios
- Use real file system (temp directories)
- Verify actual cycle detection and fixing

### Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('methodName', () => {
    it('should do something', () => {
      // Arrange, Act, Assert
    });
  });
});
```

## Code Quality Standards

### TypeScript
- **Strict mode enabled**
- **No `any` types** (use proper typing)
- **Explicit return types** for public functions
- **Readonly** parameters where possible

### Complexity Limits
- **Max function length**: 50 lines
- **Max cyclomatic complexity**: 10
- **Max parameters**: 5

### Naming Conventions
- **Classes**: PascalCase
- **Interfaces**: PascalCase with `I` prefix
- **Functions/Methods**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Private members**: prefix with `_` if needed

## Performance Considerations

### Lightweight Design
- No heavy AST parsing libraries (ts-morph, babel, etc.)
- Regex-based import extraction
- Minimal dependencies (chalk, commander, ora)

### Optimization Techniques
- Parallel file parsing
- Early bailout on non-local imports
- Deduplication of file paths
- Efficient graph algorithms

## Publishing Checklist

Before publishing to npm:

- [ ] All tests passing
- [ ] Linting passes
- [ ] Code formatted
- [ ] Version bumped in package.json
- [ ] CHANGELOG updated
- [ ] README updated
- [ ] Build succeeds (`npm run build`)
- [ ] Dry run publish (`npm publish --dry-run`)

## Troubleshooting

### Tests failing
```bash
# Clear cache
npm run test -- --clearCache

# Run specific test
npm test -- tests/path/to/test.ts

# Debug test
node --inspect-brk node_modules/.bin/jest --runInBand tests/path/to/test.ts
```

### Build errors
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

### Linting errors
```bash
# Auto-fix
npm run lint:fix

# Check specific file
npx eslint src/path/to/file.ts
```

## Future Enhancements

### Potential Improvements
1. **AST-based parsing** for more accurate analysis
2. **More fix strategies**:
   - Barrel file creation
   - Dependency injection
   - Interface extraction
3. **Interactive mode** for guided fixing
4. **Graph visualization** output
5. **IDE plugins** (VS Code, WebStorm)
6. **Pre-commit hooks** integration
7. **Monorepo support** improvements
8. **Configuration file** support (.cycfixrc)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Resources

- [Tarjan's Algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
