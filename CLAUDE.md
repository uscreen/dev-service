# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@uscreen.de/dev-service` is a CLI tool (`service`) for managing Docker services (Redis, Mongo, Nginx, etc.) in local development environments. It generates docker-compose YAML files from a `services` array in the consumer project's `package.json` and wraps `docker-compose` commands.

See `AGENTS.md` for full code style guidelines and conventions.

## Commands

```bash
pnpm install           # Install dependencies (pnpm enforced, no npm/yarn)
pnpm test              # Run all tests (sequential, shares Docker)
pnpm run test:cov      # Tests with HTML + text coverage report
pnpm run lint          # ESLint check
pnpm run lint:fix      # ESLint autofix

# Run a single test file
node --test test/cli-install.test.js

# Run tests matching a name pattern
node --test --test-name-pattern="pattern" test/cli.test.js
```

## Architecture

```
bin/cli*.js     # CLI entry points — parse args with commander, call src/ functions, wrap in try/catch with error()
src/install.js  # Core install logic: reads package.json services[], copies templates, generates compose YAML
src/check.js    # Port availability checks using lsof
src/utils.js    # Shared: compose(), docker(), readPackageJson(), error(), warning(), escape()
src/constants.js# COMPOSE_DIR, TEMPLATES_DIR, root (cwd of consumer project)
templates/*.yml # Docker-compose templates for each supported service (redis, mongo, nginx, etc.)
test/helpers.js # Test infrastructure: prepareArena(), clearArena(), cli(), compose(), loadYaml()
```

**Key flow**: `service install` reads `services[]` from the consumer project's `package.json`, copies templates from `templates/` into `services/.compose/` (creating that directory), then `service start/stop/logs/etc.` run `docker-compose` against all files in `services/.compose/`.

**Arena pattern**: Tests operate in `test/_arena/` as a temporary project directory. `prepareArena()` sets it up; `clearArena()` tears it down. Tests must run sequentially (`--test-concurrency=1`) because they share Docker resources.

## Code Conventions

- **ESM only**: `import`/`export`, never `require()`. Use `node:` prefix for builtins.
- **Arrow functions only**: never use the `function` keyword.
- **No semicolons**, single quotes, 2-space indent, no trailing commas.
- `else` goes on a new line after `}`.
- CLI errors: call `error(e)` from `src/utils.js` — prints red and exits. Warnings: `warning(message)`.
- Node.js >= 20 required; `.nvmrc` targets 24.
