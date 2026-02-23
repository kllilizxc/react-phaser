---
name: react-phaser
description: Use when working with React-style Phaser renderer package name '@realiz3r/react-phaser', including creating/updating VNodes with createNode(), mounting a root component with mountRoot(), using hooks (useStore/useUpdate/useEffect/useLayoutEffect/useRef/useScene/useState/onMount/useMemo/useCallback/useEvent), working with fragments, working with physics groups and pooled sprites, wiring refs and interactivity, and syncing gameplay metadata via props/Data Manager.
---

# React Phaser

## Quick start (this repo)

- Core renderer implementation lives in `src/react-phaser/` and the store lives in `src/game-state/`.
- Run tests: `npm test` (Phaser is mocked in `vitest.setup.ts`).
- Build the library: `npm run build` (Vite bundle + `.d.ts` emit).

## Render primitives (VNode types)

Create nodes with:

```ts
createNode(type, props, ...children)
```

Supported built-in `type` strings and common props (see `src/react-phaser/types.ts` and `src/react-phaser/phaser-objects.ts`):

- `container`: group children; supports `x`, `y`, `width`, `height`, `interactive`, pointer handlers.
- `text`: `x`, `y`, `text`, `fontSize`, `color`, `fontStyle`, `originX`, `originY`.
- `rect` (graphics-backed rectangle): `x`, `y`, `width`, `height`, `fill`, `alpha`, `strokeWidth`, `lineColor`, `interactive`.
- `image` / `sprite`: `x`, `y`, `texture`, `frame`, `scale`, `tint`, `flipX`, `flipY`, `play`.
- `physics-sprite`: sprite props plus `velocityX`, `velocityY`, `collideWorldBounds`, `bounce`, `drag`, `gravityY`, `immovable`, body sizing (`bodyWidthRatio/bodyHeightRatio` or `bodyWidth/bodyHeight`, `bodyOffsetX/bodyOffsetY`).
- `physics-group`: pooled `Arcade.Sprite` group; pass `{ config }` and render `physics-sprite` children.
- `fragment`: group children without creating a Phaser GameObject (similar to React Fragments).

Also supported:

- Function components: `createNode(MyComponent, props)`.
- Direct nodes: pass an existing Phaser object as the `type` and keep it stable (store it in a `useRef`); the renderer updates it via “direct” mode.

## Keys, pooling, and physics groups

- Provide `key` for list children to get stable identity across renders.
- For `physics-group`, the reconciler allocates sprites from the group pool via `group.get()` when a keyed child is added.
- Prefer direct `physics-sprite` children under `physics-group` (or components that return a single `physics-sprite`) to keep pooling behavior predictable (see `src/react-phaser/core.ts` and `src/react-phaser/__tests__/reconciler.test.ts`).
- When syncing gameplay state from pooled sprites, you can read the last committed props (including `key`) from `(sprite as any).__v_props?.key` (internal API; useful for debugging/tools).

## Refs (imperative access)

- Create refs with `useRef<T | null>(null)` and pass as `ref` prop to a node: `createNode('physics-sprite', { ref: playerRef, ... })`.
- Assume `ref.current` is populated after commit; use `useLayoutEffect`/`useEffect`/`onMount` to act on it.

## Hooks (lifecycle and logic)

- `useState`: trigger a re-render when state changes; avoid calling setters during render.
- `useStore(storeHook, selector?)`: subscribe to a Pinia-like store (see `src/game-state/`); selectors are deep-mutation aware for `game-state` stores.
- `useUpdate(cb)`: run code every Phaser `update` event; use it for movement, timers, despawn logic (see `Bullet.ts`, `EnemySpawner.ts`).
- `useEffect` / `useLayoutEffect`: attach/detach listeners, set methods on sprites, subscribe to stores, etc.
- `useScene`: access the current `Phaser.Scene` from inside a component.
- `onMount`: run once after first commit; return cleanup if needed (see `LevelUpPanel.ts`).
- `useMemo(factory, deps)` / `useCallback(cb, deps)`: memoize values or functions.
- `useEvent(handler)`: get a stable identity for a callback that always points to the latest handler logic.

## Interactivity and pointer events

- You can attach input handlers to most nodes: `onClick`, `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerOver`, `onPointerOut`, `onWheel`, `onDragStart`, `onDrag`, `onDragEnd`, `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`.
- `interactive` is optional: providing any handler (or `draggable` / `dropZone`) auto-enables interactivity, except where a hit area is required.
- Drag handlers imply `draggable: true` by default (override with an explicit `draggable: false`).
- `container` and `rect`/`graphics` need a hit area: provide `width`/`height` (or `w`/`h`) or pass `hitArea` / `hitAreaCallback`.
- Extra config: `useHandCursor`, `cursor`, `pixelPerfect`, `alphaTolerance`, `draggable`, `dropZone`.

## Passing gameplay metadata to Phaser objects

- Any prop not treated as an internal rendering/physics prop is synced into Phaser’s Data Manager (`obj.setData(key, value)`).
- Read metadata later with `sprite.getData('damage')`, `sprite.getData('health')`, etc. (see `EnemySpawner.ts`).

## Debugging / validation

- Run unit tests: `npm test` (or `npm run test:watch` while iterating).
- Build the library: `npm run build`.
- Type-check: `npx tsc -p tsconfig.json --noEmit`.
