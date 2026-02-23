function readDevFlag(): boolean {
    const override = (globalThis as any)?.process?.env?.REACT_PHASER_DEV;
    if (override === "1" || override === "true") return true;
    if (override === "0" || override === "false") return false;
    return !!((import.meta as any).env?.DEV);
}

export const DEV = readDevFlag();

