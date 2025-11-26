# GitHub Configuration

This directory contains all GitHub-specific configuration for the cyclic-dependency-fixer project.

## 📁 Structure

```
.github/
├── workflows/              # GitHub Actions workflows
│   ├── ci.yml             # Main CI pipeline (lint, test, build)
│   ├── publish.yml        # NPM publishing on release
│   ├── codeql.yml         # Security scanning with CodeQL
│   ├── coverage.yml       # Code coverage reporting
│   ├── release.yml        # Automated release creation
│   ├── stale.yml          # Stale issue/PR management
│   ├── auto-label.yml     # Automatic PR labeling
│   └── pr-checks.yml      # PR title checks and size labeling
├── ISSUE_TEMPLATE/         # Issue templates
│   ├── bug_report.yml     # Bug report template
│   ├── feature_request.yml # Feature request template
│   └── config.yml         # Issue template configuration
├── dependabot.yml          # Dependabot configuration
├── labeler.yml            # PR auto-labeling rules
├── PULL_REQUEST_TEMPLATE.md # PR template
└── README.md              # This file
```

## 🔄 Workflows

### CI Pipeline (`ci.yml`)

**Triggers:** Push/PR to `main` or `develop`

**Jobs:**

- **Lint** - ESLint and Prettier checks
- **Test** - Run tests on multiple OS (Ubuntu, Windows, macOS) and Node versions (16, 18, 20)
- **Build** - Build TypeScript and verify artifacts
- **Integration** - Run integration tests

**Status Badge:**

```markdown
[![CI](https://github.com/kitium-ai/cyclic-dependency-fixer/actions/workflows/ci.yml/badge.svg)](https://github.com/kitium-ai/cyclic-dependency-fixer/actions/workflows/ci.yml)
```

### Publish to NPM (`publish.yml`)

**Triggers:** Release created

**Steps:**

1. Run full test suite
2. Build project
3. Publish to npm

**Required Secret:** `NPM_TOKEN`

### CodeQL Security Scan (`codeql.yml`)

**Triggers:**

- Push/PR to `main` or `develop`
- Weekly schedule (Mondays at midnight)

**Purpose:** Automated security vulnerability scanning

### Code Coverage (`coverage.yml`)

**Triggers:** Push/PR to `main`

**Features:**

- Generate coverage report
- Comment coverage on PRs
- Check 80% coverage threshold
- Upload to Codecov

### Release Automation (`release.yml`)

**Triggers:** Push tag matching `v*.*.*`

**Automates:**

- Create GitHub release
- Generate changelog from commits
- Add installation instructions
- Link to documentation

### Stale Management (`stale.yml`)

**Schedule:** Daily at midnight

**Configuration:**

- Issues: Stale after 60 days, close after 7 days
- PRs: Stale after 45 days, close after 14 days
- Exemptions: `pinned`, `security`, `bug`, `enhancement`

### Auto Label (`auto-label.yml`)

**Triggers:** PR opened/updated

**Labels based on:**

- Changed file paths
- File types
- Directory structure

See `labeler.yml` for rules.

### PR Checks (`pr-checks.yml`)

**Triggers:** PR opened/updated

**Checks:**

1. **Title Format** - Conventional commits format
2. **Size Label** - Automatically label PR size (xs/s/m/l/xl)
3. **Welcome Message** - Greet first-time contributors

## 🏷️ Labels

### Auto-Applied Labels

| Label             | Applied When                            |
| ----------------- | --------------------------------------- |
| `documentation`   | Changes to `*.md` files or `docs/`      |
| `dependencies`    | Changes to `package.json` or lock files |
| `tests`           | Changes to `tests/` or test files       |
| `CI/CD`           | Changes to `.github/workflows/`         |
| `domain`          | Changes to `src/domain/`                |
| `application`     | Changes to `src/application/`           |
| `infrastructure`  | Changes to `src/infrastructure/`        |
| `CLI`             | Changes to `src/cli/`                   |
| `AI`              | Changes to AI-related files             |
| `fix-strategies`  | Changes to fix strategies               |
| `breaking-change` | Changes to interfaces or public API     |
| `size/xs`         | < 10 lines changed                      |
| `size/s`          | < 100 lines changed                     |
| `size/m`          | < 500 lines changed                     |
| `size/l`          | < 1000 lines changed                    |
| `size/xl`         | > 1000 lines changed                    |

### Manual Labels

Create these labels in GitHub:

- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention needed
- `question` - Further information requested
- `wontfix` - This will not be worked on
- `duplicate` - Duplicate issue/PR
- `invalid` - Invalid issue/PR
- `priority:high` - High priority
- `priority:medium` - Medium priority
- `priority:low` - Low priority

## 🤖 Dependabot

**Configuration:** `dependabot.yml`

**Features:**

- Weekly dependency updates (Mondays at 9 AM)
- Separate PRs for npm and GitHub Actions
- Auto-labeling with `dependencies` and `automated`
- Ignores major version updates by default

## 📝 Templates

### Issue Templates

Located in `ISSUE_TEMPLATE/`:

- **Bug Report** - Report bugs with structured format
- **Feature Request** - Suggest new features
- **Config** - Links to discussions for questions

### Pull Request Template

Located in `PULL_REQUEST_TEMPLATE.md`

**Sections:**

- Description and type of change
- Related issues
- Changes made
- Testing details
- Checklist for contributors
- Breaking changes documentation
- Additional context

## 🔐 Required Secrets

Add these secrets in repository settings:

| Secret          | Purpose         | How to Get                                                                     |
| --------------- | --------------- | ------------------------------------------------------------------------------ |
| `NPM_TOKEN`     | Publish to npm  | [npm access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens) |
| `CODECOV_TOKEN` | Upload coverage | [Codecov](https://codecov.io/) (optional)                                      |

## 📊 Status Badges

Add these to your README:

```markdown
<!-- CI -->

[![CI](https://github.com/kitium-ai/cyclic-dependency-fixer/actions/workflows/ci.yml/badge.svg)](https://github.com/kitium-ai/cyclic-dependency-fixer/actions/workflows/ci.yml)

<!-- CodeQL -->

[![CodeQL](https://github.com/kitium-ai/cyclic-dependency-fixer/actions/workflows/codeql.yml/badge.svg)](https://github.com/kitium-ai/cyclic-dependency-fixer/actions/workflows/codeql.yml)

<!-- Coverage -->

[![codecov](https://codecov.io/gh/kitium-ai/cyclic-dependency-fixer/branch/main/graph/badge.svg)](https://codecov.io/gh/kitium-ai/cyclic-dependency-fixer)
```

## 🚀 Usage

### Creating a Release

1. Update version in `package.json`:

   ```bash
   npm version [major|minor|patch]
   ```

2. Push the tag:

   ```bash
   git push origin v2.0.0
   ```

3. Workflows automatically:
   - Create GitHub release
   - Publish to npm
   - Generate changelog

### Manual Workflow Triggers

Some workflows support manual triggering:

```bash
# Trigger via GitHub UI
Actions → Select Workflow → Run workflow

# Or via GitHub CLI
gh workflow run ci.yml
```

## 🛠️ Maintenance

### Updating Workflows

1. Edit workflow files in `.github/workflows/`
2. Test locally with [act](https://github.com/nektos/act) if possible
3. Push to `develop` branch first
4. Verify workflows run successfully
5. Merge to `main`

### Updating Labels

Edit `.github/labeler.yml` to change auto-labeling rules.

### Updating Issue Templates

Edit files in `.github/ISSUE_TEMPLATE/`

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🤝 Contributing

For general contribution guidelines, see [CONTRIBUTING.md](../CONTRIBUTING.md) in the root directory.

For GitHub-specific contributions:

- Ensure workflows pass locally if possible
- Test changes on a fork first
- Document any new secrets or configurations
- Update this README if adding new workflows
