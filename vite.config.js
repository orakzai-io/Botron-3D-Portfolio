import { defineConfig } from "vite";

// Minimal config — the site is a fully static build (dist/ is deployable anywhere).
// base stays "/" for root-domain deploys (orakzai.io). If deploying to a
// project sub-path (e.g. GitHub Pages /repo/), change base to "/repo-name/".
export default defineConfig({
  base: "./",
  build: {
    // The GLB robot model is a large chunk by design — expected, not a problem.
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        // Keep the three.js library in its own cache-stable chunk: content
        // edits re-download only app code, not the ~600 kB library.
        manualChunks: { three: ["three"] },
      },
    },
  },
});
