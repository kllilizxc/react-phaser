function readDevFlag(): boolean {
    const override = (globalThis as any)?.process?.env?.REACT_PHASER_DEV;
    if (override === "1" || override === "true") return true;
    if (override === "0" || override === "false") return false;
    return !!((import.meta as any).env?.DEV);
}

const DEV = readDevFlag();
const warnedOnce = new Set<string>();

export function devWarnOnce(key: string, message: string) {
    if (!DEV) return;
    if (warnedOnce.has(key)) return;
    warnedOnce.add(key);
    // eslint-disable-next-line no-console
    console.warn(message);
}

export { DEV };
