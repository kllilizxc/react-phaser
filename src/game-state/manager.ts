import type { Mutation } from "./types";
import { safeClone, safeStringify } from "./clone";
import { RAW_STATE, type NonActionMutationMode } from "./internal";

export class GameStateManager {
    private stores: Record<string, any> = {};
    private log: Mutation[] = [];
    private maxLogSize = 1000;
    private loggingEnabled = true;

    private cloneSnapshots = true;
    private cloneMutations = true;
    private nonActionMutation: NonActionMutationMode = "warn";
    private warnedNonAction = new Set<string>();

    config(options: {
        loggingEnabled?: boolean;
        maxLogSize?: number;
        cloneSnapshots?: boolean;
        cloneMutations?: boolean;
        nonActionMutation?: NonActionMutationMode;
    }) {
        if (options.loggingEnabled !== undefined) {
            this.loggingEnabled = options.loggingEnabled;
        }
        if (options.maxLogSize !== undefined) {
            this.maxLogSize = options.maxLogSize;
            // Trim log if it's now over size
            while (this.log.length > this.maxLogSize) {
                this.log.shift();
            }
        }
        if (options.cloneSnapshots !== undefined) {
            this.cloneSnapshots = options.cloneSnapshots;
        }
        if (options.cloneMutations !== undefined) {
            this.cloneMutations = options.cloneMutations;
        }
        if (options.nonActionMutation !== undefined) {
            this.nonActionMutation = options.nonActionMutation;
        }
    }

    register(name: string, store: any) {
        this.stores[name] = store;
    }

    shouldCloneMutations() {
        return this.cloneMutations;
    }

    handleNonActionMutation(store: string, keyPath: string) {
        if (this.nonActionMutation === "ignore") return;

        const msg = `game-state: mutation of '${store}.${keyPath}' happened outside an action; subscribers will not be notified. Prefer an action (or configure GameState.config({ nonActionMutation: 'ignore' })).`;
        if (this.nonActionMutation === "throw") {
            throw new Error(msg);
        }

        const warnKey = `${store}:${keyPath}`;
        if (this.warnedNonAction.has(warnKey)) return;
        this.warnedNonAction.add(warnKey);
        // eslint-disable-next-line no-console
        console.warn(msg);
    }

    private cloneMutation(mutation: Mutation): Mutation {
        const sortedChanges = [...mutation.changes].sort((a, b) => a.key.localeCompare(b.key));
        return {
            t: mutation.t,
            store: mutation.store,
            action: mutation.action,
            changes: sortedChanges.map(c => ({
                key: c.key,
                old: safeClone(c.old),
                new: safeClone(c.new),
            })),
        };
    }

    emitMutation(mutation: Mutation) {
        const prepared = this.cloneMutations ? this.cloneMutation(mutation) : mutation;
        if (!this.loggingEnabled) return prepared;

        this.log.push(prepared);
        if (this.log.length > this.maxLogSize) {
            this.log.shift();
        }
        return prepared;
    }

    addLog(mutation: Mutation) {
        this.emitMutation(mutation);
    }

    getLog() {
        return [...this.log];
    }

    snapshot() {
        const snap: Record<string, any> = {};
        const names = Object.keys(this.stores).sort();
        for (const name of names) {
            const store = this.stores[name];
            const raw = (store as any)?.[RAW_STATE] ?? (store as any)?.$state;
            snap[name] = this.cloneSnapshots ? safeClone(raw) : raw;
        }
        return snap;
    }

    dump() {
        return safeStringify({
            snapshot: this.snapshot(),
            log: this.getLog(),
        }, 2);
    }
}

export const GameState = new GameStateManager();
