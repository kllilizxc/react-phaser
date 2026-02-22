# Repository Guidelines

## Project Structure & Module Organization

- `src/react-phaser/`: core renderer (VNode types, reconciler, hooks, host object updates).
- `src/game-state/`: lightweight Pinia-style store utilities.
- `src/index.ts`: public entrypoint (barrel exports).
- Tests: `src/**/__tests__/` with `*.test.ts` files.
- Build output: `dist/` (generated; don’t edit by hand).

## Build, Test, and Development Commands

This repo uses npm (`package-lock.json`). Vite requires Node `^18 || >=20`.

- `npm run build`: library build via Vite + TypeScript declaration emit to `dist/`.
- `npm test`: run Vitest once (CI-style).
- `npm run test:watch`: run Vitest in watch mode.
- `npm run test:coverage`: generate coverage report in `coverage/` (text + HTML).
- `npm run dev`: starts Vite dev server (this is a library repo; add a local playground if needed).

## Coding Style & Naming Conventions

- TypeScript + ESM (`"type": "module"`) with `strict: true` (`tsconfig.json`).
- Match existing `src/` style: 4-space indentation, double quotes, semicolons, and `import type` for type-only imports.
- Use `kebab-case` for files and folders (e.g., `create-node.ts`, `define-game-store.ts`).
- When changing the public API, update the barrel exports (`src/index.ts`, `src/react-phaser/index.ts`, `src/game-state/index.ts`).
- No formatter/linter is configured in this repo—keep diffs small and follow nearby patterns.

## Testing Guidelines

- Framework: Vitest (Node environment).
- Phaser is mocked in `vitest.setup.ts`; extend the mock when new Phaser surface area is required.
- Keep tests close to code (add tests under the nearest `__tests__/` folder).

## Commit & Pull Request Guidelines

- Commits follow a Conventional Commits style (`feat: ...`, `fix: ...`).
- PRs should include: what changed, why, how to verify (commands/snippets), and tests for new behavior.
- If behavior affects rendering/reconciliation, include a short reproduction snippet or screenshots from a local harness.

