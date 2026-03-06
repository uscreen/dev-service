# Agent Guidelines for @uscreen.de/dev-service

Guidelines for AI coding agents working on this repository.

## Project Overview

A CLI tool for managing Docker services in local development environments. ESM-only Node.js project using docker-compose to orchestrate services like Redis, Mongo, Nginx, etc.

## Build, Lint & Test Commands

```bash
# Install dependencies (pnpm required, enforced by preinstall hook)
pnpm install

# Run all tests (must be sequential due to Docker conflicts)
pnpm test

# Run a single test file
node --test test/cli-install.test.js

# Run specific test by name pattern
node --test --test-name-pattern="pattern" test/cli.test.js

# Tests with coverage
pnpm run test:cov          # HTML + text report
pnpm run test:ci           # lcov + text (CI)

# Lint (uses @antfu/eslint-config with flat config)
pnpm exec eslint .
pnpm exec eslint . --fix

# Make shortcuts
make test                  # Run tests
make test.coverage         # Run tests with coverage
```

## Code Style Guidelines

### Module System
- **ESM only**: Use `import`/`export`, never `require()`
- Use `node:` prefix for built-in modules: `import path from 'node:path'`
- Always include `.js` extension in relative imports: `import { x } from './utils.js'`
- Use `import.meta.url` for file path derivation
- For JSON imports, use `createRequire` from `node:module`

### Import Order
```javascript
// 1. Node built-ins (with node: prefix)
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// 2. Third-party packages
import chalk from 'chalk'
import fs from 'fs-extra'
import YAML from 'yaml'
// 3. Local imports
import { COMPOSE_DIR, TEMPLATES_DIR } from './constants.js'
import { docker, escape } from '../src/utils.js'
```

### Formatting
- **Indentation**: 2 spaces (tabs only in Makefiles)
- **Quotes**: Single quotes
- **Semicolons**: None (consistently omitted across the entire codebase)
- **Trailing commas**: None (enforced by `style/comma-dangle: ['error', 'never']`)
- **Line endings**: LF
- **Final newline**: Required
- **Trailing whitespace**: Not allowed

### Naming Conventions
- **Files**: kebab-case (`cli-install.js`, `cli-start.test.js`)
- **Functions/variables**: camelCase (`readPackageJson`, `composePath`)
- **Constants**: SCREAMING_SNAKE_CASE (`COMPOSE_DIR`, `TEMPLATES_DIR`)
- **Exports**: `export const functionName =` pattern

### Function Patterns
- **Arrow functions only** -- the codebase never uses the `function` keyword
- Top-level arrow functions are allowed (`antfu/top-level-function: off`)

```javascript
export const escape = name =>
  name.replace(/^[^a-z0-9]*/i, '').replace(/[^a-z0-9-]/gi, '-')

export const install = async (opts) => {
  // implementation
}
```

### Curly Braces
Rule: `'curly': ['error', 'multi-line', 'consistent']` -- `else` goes on a new line after `}`:

```javascript
if (service) return result

if (service) {
  await compose('up', '-d', service)
}
else {
  await compose('up', '-d')
}
```

### Error Handling
- CLI-facing errors use `error()` from `src/utils.js` which prints with `chalk.red()` and calls `process.exit()`
- In `bin/` files: `try { await action(options) } catch (e) { error(e) }`
- Empty catch for non-critical: `try { ... } catch {}`
- Warnings: `chalk.yellow()`, Info: plain `console.log()`
- Always append `\n` after error/warning messages

## Testing

Uses the **native Node.js test runner** (`node:test`) with `node:assert/strict`. Tests must run sequentially (`--test-concurrency=1`) because they share Docker resources.
```javascript
import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { clearArena, cli, prepareArena } from './helpers.js'

describe('$ cli install', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no package.json', async () => {
    const result = await cli(['install'], '/tmp')
    assert.equal(result.code, 1, 'Should fail')
    assert.ok(result.stderr.includes('ERROR'), 'Should output error')
  })
})
```

- Test files: `test/*.test.js`
- Helpers in `test/helpers.js` (`prepareArena`, `clearArena`, `cli`, `compose`, `loadYaml`)
- Arena pattern: tests use `test/_arena/` as a temporary project directory
- Color disabled in tests: `process.env.FORCE_COLOR = 0`
- Every assertion includes a descriptive message string
- Test names describe the scenario: `'If services are defined in .compose subfolder'`

## Project Structure

```
├── bin/              # CLI entry points (cli.js, cli-install.js, etc.)
├── src/              # Source code
│   ├── check.js      # Port availability checks
│   ├── constants.js  # Path constants, version
│   ├── install.js    # Service installation logic
│   └── utils.js      # Shared utilities (docker, compose, escape, error)
├── templates/        # Docker-compose service templates (YAML)
├── test/             # Tests
│   ├── helpers.js    # Test infrastructure (arena, cli runner, compose)
│   └── *.test.js     # Test files (18 files)
└── eslint.config.js  # ESLint flat config (@antfu/eslint-config)
```

## Important Notes

- **Node.js**: >= 20 required (`.nvmrc` targets 24)
- **Package manager**: pnpm only (enforced)
- **Docker**: Requires `docker` and `docker-compose` in PATH
- **No TypeScript**: Plain JavaScript only
- **Shebang**: `#!/usr/bin/env node` for CLI executables in `bin/`
- **CI**: Tests run on Node 20, 22, 24 via GitHub Actions
