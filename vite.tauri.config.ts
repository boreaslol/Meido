import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const tauriWeb = fileURLToPath(new URL("./tauri-web", import.meta.url));

export default defineConfig({
  root: tauriWeb,
  base: "./",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": srcDir },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
