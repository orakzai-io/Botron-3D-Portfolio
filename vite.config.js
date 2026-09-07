import { defineConfig } from "vite";

// Minimal config — the site is a fully static build (dist/ is deployable anywhere).
// base stays "/" for root-domain deploys (orakzai.io). If deploying to a
// project sub-path (e.g. GitHub Pages /repo/), change base to "/repo-name/".
export default defineConfig({
  base: "/",
  build: {
    // The base64-embedded GLB robot model (js/data/nexbot-model.js) produces a
    // large chunk by design — this is expected, not a problem.
    chunkSizeWarningLimit: 2500,
  },
});
