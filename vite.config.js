import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

// Resolves `<load src="..." />` include tags against src/sections/*.html at
// build time, so the page still ships as a single static index.html.
//
// Written in-repo rather than installed from npm: the published alternatives
// (e.g. vite-plugin-html-inject) target Vite 3 and declare no peer dependency,
// and this is a ten-line hook on transformIndexHtml, stable since Vite 2.
function htmlInclude() {
  return {
    name: "html-include",
    transformIndexHtml: {
      // "pre" so partials land in the HTML before Vite's own tag transforms.
      order: "pre",
      handler(html, ctx) {
        // Anchored per line, so only whole-line include tags are replaced and
        // the surrounding markup is never touched.
        return html.replace(/^[ \t]*<load\s+src="([^"]+)"\s*\/>[ \t]*$/gm, (_, src) =>
          readFileSync(resolve(dirname(ctx.filename), src), "utf8")
        );
      },
    },
  };
}

// Minimal config — the site is a fully static build (dist/ is deployable anywhere).
// base is relative so dist/ also works from a sub-path (GitHub Pages /repo/,
// a Hugging Face Space, or any static host) without a rebuild.
export default defineConfig({
  base: "./",
  plugins: [htmlInclude()],
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
