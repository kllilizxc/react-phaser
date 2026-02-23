# @realiz3r/react-phaser

[![npm version](https://img.shields.io/npm/v/@realiz3r/react-phaser.svg?style=flat-square)](https://www.npmjs.com/package/@realiz3r/react-phaser)
[![license](https://img.shields.io/npm/l/@realiz3r/react-phaser.svg?style=flat-square)](https://github.com/kllilizxc/react-phaser/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@realiz3r/react-phaser?style=flat-square)](https://bundlephobia.com/package/@realiz3r/react-phaser)

A lightweight, high-performance, React-style renderer for Phaser 3. Build your game worlds declaratively using components, hooks, and object pooling.

---

## 🌟 Why React Phaser?

Managing complex state and game object hierarchies in Phaser usually leads to imperative "spaghetti code." This library provides a **declarative abstraction layer** without sacrificing Phaser's performance.

- **Declarative Composition**: Use functional components to describe your scene graph.
- **Hook-based Logic**: First-class support for `useState`, `useEffect`, and native Phaser lifecycles via `useUpdate`.
- **Lightweight State Management**: Built-in Pinia-style reactive stores with auto-logging.
- **Optimized Pooling**: First-class support for Phaser Arcade Physics pooling.

## 🚀 Installation

```bash
npm install @realiz3r/react-phaser
```

> [!NOTE]
> This library requires **Phaser 3.80+** and targets **ES2020+**.

## 📖 Quick Start

Demo project: [SpaceShooterGame](https://github.com/kllilizxc/SpaceShooterGame)

```typescript
import { mountRoot, createNode, useUpdate, useRef } from '@realiz3r/react-phaser';

function Player({ x, y }: { x: number, y: number }) {
  const spriteRef = useRef<Phaser.Physics.Arcade.Sprite>(null);

  useUpdate(() => {
    if (spriteRef.current) spriteRef.current.x += 1;
  });

  return createNode('physics-sprite', {
    ref: spriteRef,
    x, y,
    texture: 'ship',
    velocityX: 100
  });
}

class GameScene extends Phaser.Scene {
  create() {
    // Mount a VNode (React-style):
    mountRoot(this, createNode(Player, { x: 100, y: 100 }));
    // Or mount a root component + props:
    // mountRoot(this, Player, { x: 100, y: 100 });
  }
}
```

## 🛠 Features & API

### VNode Primitives

| Type | Description | Key Props |
| :--- | :--- | :--- |
| `container` | Groups children into a `Phaser.GameObjects.Container`. | `x`, `y`, `width`/`height`, input handlers |
| `text` | Renders a `Phaser.GameObjects.Text`. | `text`, `fontSize`, `color`, `wordWrapWidth` |
| `sprite` / `image`| Renders standard textures. | `texture`, `frame`, `tint`, `flipX`/`flipY` |
| `rect` / `graphics`| Renders graphics-backed shapes. | `fill`, `lineColor`, `strokeWidth` |
| `physics-sprite` | Arcade Physics enabled sprite. | `velocityX`/`Y`, `bounce`, `drag`, `gravityY` |
| `physics-group` | Managed Arcade Group for pooling. | `config` (Phaser Group Config) |
| `fragment` | Transparent wrapper for multiple children. | (None) |

### Interactivity & Input

You can attach input handlers to most nodes:
`onClick`, `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerOver`, `onPointerOut`, `onWheel`,
`onDragStart`, `onDrag`, `onDragEnd`, `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`.

- **Auto-interactive**: if you provide any input handler (or `draggable` / `dropZone`), the node becomes interactive without needing `interactive: true`.
- **Auto-draggable**: if you provide any drag handler, `draggable` defaults to `true` (override with an explicit `draggable: false`).
- **Hit areas**: `container` and `rect`/`graphics` need a hit area. Provide `width`/`height` (or `w`/`h`) or pass `hitArea`/`hitAreaCallback`.
- **Extras**: `useHandCursor`, `cursor`, `pixelPerfect`, `alphaTolerance`, `draggable`, `dropZone`.

### Hooks Reference

| Hook | Description |
| :--- | :--- |
| `useState<T>(initial)` | Standard state management. |
| `useUpdate(callback)` | Runs every frame on Phaser's `update` event. |
| `useStore(hook, selector?)`| Subscribes to a `game-state` store. |
| `useRef<T>(initial)` | Persistent reference to Phaser GameObjects. |
| `useMemo` / `useCallback` | Performance optimization for values and functions. |
| `useEvent(handler)` | Stable identity for event callbacks. |
| `useScene()` | Access the current `Phaser.Scene`. |
| `useLayoutEffect(cb, deps)`| Runs after Phaser objects commit (before `useEffect`). |
| `useEffect(cb, deps)` | Runs after commit (after `useLayoutEffect`). |
| `onMount(cb)` | Utility for one-time initialization logic. |

---

## 🧭 Frame Lifecycle & Syncing (Read This)

React Phaser intentionally separates **game loop logic** (Phaser's `update`) from **render/commit** (reconciliation that creates/updates/destroys Phaser objects).

### Frame Lifecycle (High-level)

1. Phaser emits `update` → your `useUpdate(...)` callbacks run.
2. If you call `setState(...)` / mutate a store, a render is **queued** (microtask).
3. After the current tick finishes, reconciliation runs and **commits** Phaser object updates.
4. `useLayoutEffect(...)` runs right after commit, then `useEffect(...)`.

This means **state updates do not immediately change the Phaser world** inside the same `useUpdate` callback.

### Common Pitfall: "Write State" then "Read Phaser World" in the Same Tick

> [!WARNING]
> Don’t spawn via `setState(...)` and then “cleanup/sync” by reading `group.children` in the same `useUpdate` pass.
> The group still reflects the previous committed render, so your sync logic can accidentally delete the just-spawned items (e.g. projectile counts oscillate).

```ts
// ❌ Buggy pattern (state write + Phaser read for sync in the same tick)
useUpdate(() => {
  setProjectiles((prev) => [...prev, spawnProjectile()]);

  // Still reflects the previous commit (the new projectile isn't in the group yet)
  const idsInWorld = new Set(projectilesGroup.children.entries.map((c) => c.getData("id")));
  setProjectiles((prev) => prev.filter((p) => idsInWorld.has(p.id)));
});
```

**Avoid these patterns:**
- Calling `setProjectiles(...)` and then immediately filtering state based on `projectilesGroup.children`.
- Treating Phaser objects as the source of truth and trying to “sync state to match them” every frame.

**Prefer one of these approaches:**
- **State is the source of truth:** compute the *entire* next state in a single `setState(prev => next)` without reading Phaser world.
- **Order your pass:** do any Phaser-world-derived cleanup first, then spawn (still in one tick), or combine both into one state update.
- **Read-after-commit:** if you must observe the committed Phaser world, do it in `useLayoutEffect` / `useEffect` that runs after reconciliation.

```ts
// ✅ Compute next state in one pass (no Phaser-world sync needed)
useUpdate(() => {
  setProjectiles((prev) => {
    const cleaned = prev.filter((p) => !p.dead);
    return [...cleaned, spawnProjectile()];
  });
});
```

## 📦 State Management (`game-state`)

The library includes a lightweight, Pinia-inspired state management system optimized for game development.
Mutations are batched per action and recorded by key/path (e.g. `score`, `player.hp`).

### Defining a Store

```typescript
import { defineGameStore } from '@realiz3r/react-phaser';

export const useGameStore = defineGameStore('game', {
  state: () => ({
    score: 0,
    health: 100
  }),
  getters: {
    isGameOver: (state) => state.health <= 0
  },
  actions: {
    addScore(points: number) {
      this.$state.score += points;
    }
  }
});
```

### Using in Components

```typescript
function ScoreDisplay() {
  const score = useStore(useGameStore, s => s.score);
  return createNode('text', { text: `Score: ${score}`, x: 10, y: 10 });
}
```

### Watching State

You can watch store-derived values outside React-style rendering:

```typescript
const store = useGameStore();
store.$watch(s => s.player, (next, prev, mutation) => {
  console.log(mutation.action, mutation.changes);
});
```

---

## 🚀 Optimized Pooling

Using `physics-group` allows you to manage hundreds of objects with minimal GC pressure.

```typescript
function Bullet({ x, y }: { x: number, y: number }) {
  return createNode('physics-sprite', { x, y, texture: 'bullet' });
}

function BulletSpawner() {
  const bullets = useStore(useBulletStore);

  return createNode('physics-group', {
    config: { 
      classType: Phaser.Physics.Arcade.Sprite, 
      maxSize: 100, 
      defaultKey: null 
    }
  },
    ...bullets.map(b => createNode(Bullet, {
      key: b.id,
      ...b
    }))
  );
}
```

---

## 🔍 Debugging & Tooling

The library provides built-in tools for state inspection and travel.

### Configuration
You can customize the behavior of the state manager:

```typescript
import { GameState } from '@realiz3r/react-phaser';

GameState.config({
  loggingEnabled: true,         // Set to false to disable action logging
  maxLogSize: 500,              // Customize the number of mutations to keep in memory (default: 1000)
  cloneSnapshots: true,         // Return stable snapshots (deep-cloned)
  cloneMutations: true,         // Store stable log entries (deep-cloned)
  nonActionMutation: 'warn'     // 'ignore' | 'warn' | 'throw'
});
```

### State Snapshotting
Access the global state and logs via the `GameState` manager:

```typescript
import { GameState } from '@realiz3r/react-phaser';

// Get a snapshot of all registered stores
const currentWorldState = GameState.snapshot();

// Export state and action logs for bug reporting
console.log(GameState.dump());
```

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

MIT © [kllilizxc](https://github.com/kllilizxc)
