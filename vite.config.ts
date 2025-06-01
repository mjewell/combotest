import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [dts()],
  test: {
    globals: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "lib/combotest.ts"),
      name: "combotest",
      fileName: "combotest",
    },
    rollupOptions: {
      external: ["vitest"],
      output: {
        globals: {
          vitest: "vitest",
        },
      },
    },
  },
});
