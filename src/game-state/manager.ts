import type { Mutation } from "./types";

export class GameStateManager {
    private stores: Record<string, any> = {};
    private log: Mutation[] = [];
    private maxLogSize = 1000;
    private loggingEnabled = true;

    config(options: { loggingEnabled?: boolean; maxLogSize?: number }) {
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
    }

    register(name: string, store: any) {
        this.stores[name] = store;
    }

    addLog(mutation: Mutation) {
        if (!this.loggingEnabled) return;

        this.log.push(mutation);
        if (this.log.length > this.maxLogSize) {
            this.log.shift();
        }
    }

    getLog() {
        return [...this.log];
    }

    snapshot() {
        const snap: Record<string, any> = {};
        for (const [name, store] of Object.entries(this.stores)) {
            snap[name] = store.$state;
        }
        return snap;
    }

    dump() {
        return JSON.stringify({
            snapshot: this.snapshot(),
            log: this.getLog(),
        }, null, 2);
    }
}

export const GameState = new GameStateManager();

