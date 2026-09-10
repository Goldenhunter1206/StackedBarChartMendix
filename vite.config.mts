import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Dev harness only — this is not how the widget ships.
 *
 * Studio Pro is not available in every environment the widget is developed in,
 * so this renders the chart against mocked Mendix props in a plain browser.
 * It is what makes the visual design and the interactions verifiable rather
 * than merely asserted.
 */
export default defineConfig({
    root: resolve(__dirname, "dev"),
    plugins: [react()],
    resolve: {
        alias: {
            // The real `mendix` package is types-only and throws at runtime.
            "mendix/components/web/Icon": resolve(__dirname, "dev/mendixIcon.tsx"),
            mendix: resolve(__dirname, "dev/mendixRuntime.ts")
        }
    },
    server: { port: 5273, strictPort: true },
    build: { outDir: resolve(__dirname, "dev/dist"), emptyOutDir: true }
});
