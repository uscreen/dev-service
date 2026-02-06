# Agent Guidelines for @uscreen.de/dev-service

This document provides guidelines for AI coding agents working on this repository.

## Project Overview

A CLI tool for managing Docker services in local development environments. This is an ESM (ECMAScript modules) Node.js project that uses docker-compose to orchestrate development services.

## Build, Lint & Test Commands

### Testing
```bash
# Run all tests (sequential execution required)
pnpm test

# Run tests with coverage (HTML + text report)
pnpm run test:cov

# Run tests with coverage for CI (lcov + text report)
pnpm run test:ci

# Run a single test file
node --test test/cli-install.test.js

# Run specific test with pattern
node --test --test-name-pattern="pattern" test/cli.test.js
```

### Linting
```bash
# Lint check (uses @uscreen.de/eslint-config-prettystandard-node)
pnpm exec eslint .

# Lint and auto-fix
pnpm exec eslint . --fix
```

### Installation
```bash
# Install dependencies (pnpm is required)
pnpm install
```

### Make commands
```bash
make test              # Run tests
make test.coverage     # Run tests with coverage
```

## Code Style Guidelines

### Module System
- **ESM only**: Use `import`/`export`, not `require()`
- Use `'use strict'` at the top of files for consistency
- Use `import.meta.url` for current file path
- To require JSON files, use `createRequire` from `module`

### Import Style
```javascript
// Standard library imports first
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'

// Third-party imports
import YAML from 'yaml'
import chalk from 'chalk'
import { Command } from 'commander'

// Local imports last
import { docker, escape } from '../src/utils.js'
import { COMPOSE_DIR } from './constants.js'
```

### File Extensions
- Always include `.js` extension in relative imports: `import { x } from './utils.js'`
- Never omit extensions in ESM imports

### Formatting
- **Indentation**: 2 spaces (no tabs, except in Makefiles)
- **Quotes**: Single quotes for strings
- **Semicolons**: Not required but used inconsistently - follow existing pattern in file
- **Line endings**: LF (Unix style)
- **Final newline**: Required
- **Trailing whitespace**: Not allowed
- **Max line length**: No strict limit, but be reasonable

### Naming Conventions
- **Files**: kebab-case (e.g., `cli-install.js`, `cli-start.test.js`)
- **Functions**: camelCase (e.g., `readPackageJson`, `checkComposeDir`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `COMPOSE_DIR`, `TEMPLATES_DIR`)
- **Variables**: camelCase (e.g., `projectname`, `composePath`)
- **Exported functions**: Use `export const functionName =` or `export const functionName = async`

### Function Patterns
```javascript
// Arrow functions for simple utilities
export const escape = (name) =>
  name.replace(/^[^a-zA-Z0-9]*/, '').replace(/[^a-zA-Z0-9-]/g, '-')

// Named functions for complex logic
const fillTemplate = (template, data, removeSections, keepSections) => {
  // implementation
}

// Async arrow functions
export const install = async (opts) => {
  // implementation
}
```

### Error Handling
```javascript
// Throw errors with descriptive messages
if (invalid.length > 0) {
  throw Error('Invalid custom services:\n...')
}

// Catch and handle gracefully when appropriate
try {
  packageJson = readPackageSync({ cwd: root })
} catch (e) {}

// Use error utility for CLI output
export const error = (e) => {
  console.error(chalk.red(`ERROR: ${e.message}\n`))
  process.exit(e.code || 1)
}
```

### Console Output
- Use `chalk` for colored output in CLI
- Error messages: `chalk.red('ERROR: ...')`
- Warning messages: `chalk.yellow('WARNING: ...')`
- Info messages: plain `console.log()`
- Always include newline after messages

### Async/Await
- Prefer async/await over promise chains
- Use `Promise.all()` for parallel operations
- Handle rejections appropriately

### Testing with Node Test Runner
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cli } from './helpers.js'

test('$ cli', async (t) => {
  const result = await cli([])
  assert.equal(result.code, 1, 'Should fail')
  assert.equal(result.stdout, '', 'Should output nothing to stdout')
})
```

### Test Patterns
- Use native Node.js test runner (node:test)
- Tests must run sequentially (`--test-concurrency=1`)
- Use strict assertions (`node:assert/strict`)
- Test files: `*.test.js` in `test/` directory
- Helper functions in `test/helpers.js`
- Setup/teardown using `prepareArena()` and `clearArena()`
- Disable color output in tests: `process.env.FORCE_COLOR = 0`

## Project Structure

```
.
├── bin/              # CLI entry points (cli.js, cli-install.js, etc.)
├── src/              # Source code
│   ├── install.js    # Service installation logic
│   ├── utils.js      # Shared utilities
│   ├── check.js      # Port availability checks
│   └── constants.js  # Constants
├── templates/        # Service templates (YAML configs)
├── test/             # Tests
│   ├── helpers.js    # Test utilities
│   └── *.test.js     # Test files
└── package.json      # Package manifest
```

## Important Notes

- **Node version**: Requires Node.js >= 20
- **Package manager**: pnpm only (enforced by preinstall hook)
- **Docker dependencies**: Requires `docker` and `docker-compose` in PATH
- **Tests**: Must run sequentially due to Docker resource conflicts
- **No TypeScript**: Plain JavaScript with JSDoc if needed
- **Shebang**: Use `#!/usr/bin/env node` for CLI executables
