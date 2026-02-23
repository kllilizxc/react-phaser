export function safeClone<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object" && typeof value !== "function") return value;

    try {
        // Node 18+ and modern browsers.
        if (typeof structuredClone === "function") {
            return structuredClone(value);
        }
    } catch {
        // Fall through to JSON clone.
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        // Fall through to debug clone.
    }

    try {
        return toDebugValue(value, new Map()) as any;
    } catch {
        const name = (value as any)?.constructor?.name;
        return (`[Unclonable${name ? `:${name}` : ""}]` as any);
    }
}

export function safeStringify(value: unknown, space: number = 2) {
    return JSON.stringify(toDebugValue(value, new Map()), null, space);
}

function toDebugValue(value: any, seen: Map<any, number>): any {
    if (value === null) return null;

    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") return value;
    if (t === "bigint") return `${value.toString()}n`;
    if (t === "symbol") return value.toString();
    if (t === "undefined") return "[undefined]";
    if (t === "function") return `[Function${value.name ? `:${value.name}` : ""}]`;

    if (t !== "object") return value;

    const existing = seen.get(value);
    if (existing !== undefined) return `[Circular:${existing}]`;
    const id = seen.size;
    seen.set(value, id);

    if (value instanceof Date) return value.toISOString();

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    if (Array.isArray(value)) {
        return value.map(v => toDebugValue(v, seen));
    }

    if (value instanceof Map) {
        const entries = Array.from(value.entries()).map(([k, v]) => [toDebugValue(k, seen), toDebugValue(v, seen)] as const);
        entries.sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));
        return { $type: "Map", entries };
    }

    if (value instanceof Set) {
        const values = Array.from(value.values()).map(v => toDebugValue(v, seen));
        values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        return { $type: "Set", values };
    }

    const proto = Object.getPrototypeOf(value);
    const ctorName = proto?.constructor?.name;
    const isPlain = proto === Object.prototype || proto === null;

    const out: any = {};
    if (!isPlain && ctorName && ctorName !== "Object") {
        out.$type = ctorName;
    }

    const keys = Object.keys(value).sort();
    for (const key of keys) {
        out[key] = toDebugValue(value[key], seen);
    }

    return out;
}
