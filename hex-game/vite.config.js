import { defineConfig } from "vite";

export default defineConfig({
  base: "/classic-games/hex-game/",
  build: {
    outDir: "dist/hex-game",
    emptyOutDir: true
  }
});
