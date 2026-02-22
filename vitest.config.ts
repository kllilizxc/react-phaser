import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "coverage",
            all: true,
            include: ["src/lib/**/*.ts"],
            exclude: ["**/*.test.ts", "**/__tests__/**"],
        },
    },
});
